import { describe, it, expect, vi } from "vitest";
import { createTokenResponse, TokenLimiter } from "../lib/realtime-token";
const origin = "https://neo.test";
const config = { origin, apiKey: "server-only-test-key" };
const request = () =>
  new Request(origin + "/api/realtime-token", {
    method: "POST",
    headers: { Origin: origin },
  });
const fetcher = () =>
  vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            value: "ephemeral-test",
            expires_at: 2000000000,
            extra: "never-forward",
          }),
        ),
    );
describe("Sites token route", () => {
  it("requires a platform visitor identity", async () => {
    const upstream = fetcher();
    const response = await createTokenResponse(
      request(),
      config,
      undefined,
      upstream,
    );
    expect(response.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("allows public visitors only with a server-side opt-in", async () => {
    const upstream = fetcher();
    const response = await createTokenResponse(
      request(),
      { ...config, allowAnonymous: true },
      undefined,
      upstream,
      new TokenLimiter(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      value: "ephemeral-test",
      expires_at: 2000000000,
    });
    expect(upstream.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer server-only-test-key",
    });
  });
  it("keeps origin checks for anonymous visitors", async () => {
    const upstream = fetcher();
    const publicConfig = { ...config, allowAnonymous: true };
    const req = request();
    req.headers.delete("Origin");
    expect(
      (await createTokenResponse(req, publicConfig, undefined, upstream))
        .status,
    ).toBe(403);
    req.headers.set("Origin", "https://evil.test");
    expect(
      (await createTokenResponse(req, publicConfig, undefined, upstream))
        .status,
    ).toBe(403);
    req.headers.set("Origin", origin);
    req.headers.set("Sec-Fetch-Site", "cross-site");
    expect(
      (await createTokenResponse(req, publicConfig, undefined, upstream))
        .status,
    ).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("shares the anonymous limit despite changing untrusted visitor headers", async () => {
    const limit = new TokenLimiter();
    const upstream = fetcher();
    const publicConfig = { ...config, allowAnonymous: true };
    for (let n = 0; n < 6; n++) {
      const req = request();
      req.headers.set("X-Forwarded-For", `192.0.2.${n}`);
      req.headers.set("Cookie", `visitor=${n}`);
      const response = await createTokenResponse(
        req,
        publicConfig,
        undefined,
        upstream,
        limit,
      );
      expect(response.status).toBe(n < 5 ? 200 : 429);
      if (n === 5) expect(response.headers.get("Retry-After")).toBe("60");
    }
    expect(upstream).toHaveBeenCalledTimes(5);
    expect(
      (
        await createTokenResponse(
          request(),
          publicConfig,
          "anonymous",
          upstream,
          limit,
        )
      ).status,
    ).toBe(200);
  });
  it("caps total requests across visitors", () => {
    const limit = new TokenLimiter();
    for (let n = 0; n < 30; n++)
      expect(limit.allow(`user:${n}`, 100)).toBe(true);
    expect(limit.allow("anonymous", 100)).toBe(false);
    expect(limit.allow("anonymous", 60100)).toBe(true);
  });
  it("rejects methods with no-store and Allow", async () => {
    const response = await createTokenResponse(
      new Request(origin),
      config,
      "user",
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("rejects wrong origin and cross-site metadata", async () => {
    const req = request();
    req.headers.set("Origin", "https://evil.test");
    expect((await createTokenResponse(req, config, "user")).status).toBe(403);
    req.headers.set("Origin", origin);
    req.headers.set("sec-fetch-site", "cross-site");
    expect((await createTokenResponse(req, config, "user")).status).toBe(403);
  });
  it("reports missing runtime secret without issuing a token", async () => {
    const upstream = fetcher();
    const response = await createTokenResponse(
      request(),
      { origin },
      "user",
      upstream,
    );
    expect(response.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("uses GA settings and only returns ephemeral allowlisted fields", async () => {
    const upstream = fetcher();
    const response = await createTokenResponse(
      request(),
      config,
      "user",
      upstream,
      new TokenLimiter(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      value: "ephemeral-test",
      expires_at: 2000000000,
    });
    const [url, options] = upstream.mock.calls[0];
    expect(url).toContain("/realtime/client_secrets");
    const data = JSON.parse(options!.body as string);
    expect(
      data.session.tools.map((tool: { name: string }) => tool.name),
    ).toEqual(
      expect.arrayContaining([
        "remember_name",
        "choose_intervention",
        "revise_intervention",
        "set_storage_consent",
      ]),
    );
    expect(data.session.tool_choice).toBe("auto");
    expect(data.session.audio.output.voice).toBe("marin");
    expect(data.session.audio.input.turn_detection.interrupt_response).toBe(
      false,
    );
  });
  it("rate-limits by platform user and resets each minute", async () => {
    const limit = new TokenLimiter();
    for (let n = 0; n < 5; n++) expect(limit.allow("user", 100)).toBe(true);
    expect(limit.allow("user", 100)).toBe(false);
    expect(limit.allow("user", 60100)).toBe(true);
    const response = await createTokenResponse(
      request(),
      config,
      "user",
      fetcher(),
      { allow: () => false },
    );
    expect(response.status).toBe(429);
  });
  it.each([401, 403, 404, 429, 500])(
    "sanitizes upstream %s",
    async (status) => {
      const upstream = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("sensitive response", { status }));
      const response = await createTokenResponse(
        request(),
        config,
        "user",
        upstream,
        new TokenLimiter(),
      );
      expect(response.status).toBe(status === 429 ? 429 : 502);
      expect(await response.text()).not.toContain("sensitive");
    },
  );
  it("handles network failures", async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("internal secret"));
    const response = await createTokenResponse(
      request(),
      config,
      "user",
      upstream,
      new TokenLimiter(),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("internal secret");
  });
});
