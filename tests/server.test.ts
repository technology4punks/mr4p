import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import type { ServerConfig } from "../server/realtime-token";
const origin = "https://neo.example";
const config: ServerConfig = { apiKey: "server-only-test-key", origin };
const post = (app: ReturnType<typeof createApp>) =>
  request(app).post("/api/realtime-token").set("Origin", origin);
const success = () =>
  vi.fn<typeof fetch>().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          value: "ephemeral-test",
          expires_at: 1999999999,
          session: { secret: "do-not-forward" },
        }),
        { status: 200 },
      ),
  );
describe("token endpoint", () => {
  it.each(["get", "put", "delete", "options"] as const)(
    "rejects %s with Allow and no-store",
    async (method) => {
      const fetcher = success();
      const response = await request(createApp(config, fetcher))[method](
        "/api/realtime-token",
      );
      expect(response.status).toBe(405);
      expect(response.headers.allow).toBe("POST");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("does not call OpenAI without credentials", async () => {
    const fetcher = success();
    expect((await post(createApp({ origin }, fetcher))).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns only short lived secret and uses GA session configuration", async () => {
    const fetcher = success();
    const response = await post(createApp(config, fetcher));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      value: "ephemeral-test",
      expires_at: 1999999999,
    });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    const body = JSON.parse(options!.body as string);
    expect(body.session.type).toBe("realtime");
    expect(body.session.model).toBe("gpt-realtime-2.1-mini");
    expect(body.session.tools.map((t: { name: string }) => t.name)).toEqual(
      expect.arrayContaining([
        "select_lever",
        "choose_intervention",
        "revise_intervention",
        "set_storage_consent",
      ]),
    );
    expect(
      body.session.tools.map((t: { name: string }) => t.name),
    ).not.toContain("select_theme");
    expect(body.session.tool_choice).toBe("auto");
    expect(
      body.session.tools.find(
        (t: { name: string }) => t.name === "enter_observatory",
      ).parameters.required,
    ).toEqual([]);
    expect(
      body.session.tools.find(
        (t: { name: string }) => t.name === "set_storage_consent",
      ).parameters.required,
    ).toContain("consent");
    expect(
      body.session.tools.find(
        (t: { name: string }) => t.name === "show_intervention",
      ).parameters.required,
    ).toEqual(["optionId"]);
    expect(body.session.instructions).toMatch(/ipotetic/);
    expect(body.session.instructions).toContain("10–30 parole");
    expect(
      body.session.tools.find(
        (t: { name: string }) => t.name === "choose_intervention",
      ).parameters.properties.optionId.enum,
    ).toHaveLength(30);
    expect(body.session.audio.output.voice).toBe("marin");
    expect(body.session.audio.input.turn_detection.interrupt_response).toBe(
      false,
    );
    expect(body.session.audio.input.turn_detection.threshold).toBe(0.5);
    expect(body.session.audio.input.turn_detection.silence_duration_ms).toBe(
      650,
    );
    expect(body.session.audio.input.noise_reduction.type).toBe("near_field");
    expect(response.text).not.toContain(config.apiKey);
    expect(response.text).not.toContain("do-not-forward");
  });
  it.each([400, 401, 403, 404, 429, 500])(
    "sanitizes upstream %i without leaking upstream body",
    async (status) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response("sensitive diagnostics server-only-test-key", {
          status,
        }),
      );
      const response = await post(createApp(config, fetcher));
      expect(response.status).toBe(status === 429 ? 429 : 502);
      expect(response.body.error).toBeTruthy();
      expect(response.text).not.toContain("server-only-test-key");
      expect(response.text).not.toContain("sensitive");
    },
  );
  it("handles network failure and malformed responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("network secret"));
    expect((await post(createApp(config, fetcher))).status).toBe(502);
    fetcher.mockResolvedValue(new Response("{}"));
    expect((await post(createApp(config, fetcher))).status).toBe(502);
  });
  it("checks exact origin, absent origin, fetch metadata and fails closed in production", async () => {
    const fetcher = success();
    const app = createApp(config, fetcher);
    expect((await request(app).post("/api/realtime-token")).status).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/realtime-token")
          .set("Origin", "https://neo.example.evil")
      ).status,
    ).toBe(403);
    expect((await post(app).set("Sec-Fetch-Site", "cross-site")).status).toBe(
      403,
    );
    expect(
      (await post(createApp({ ...config, production: true }, fetcher))).status,
    ).toBe(403);
    expect(
      (
        await post(
          createApp(
            { ...config, production: true, requireProxyAuth: true },
            fetcher,
          ),
        )
      ).status,
    ).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      (
        await post(
          createApp(
            {
              ...config,
              production: true,
              requireProxyAuth: true,
              proxyAuthSecret: "test-proxy-secret",
            },
            fetcher,
          ),
        )
          .set("X-NEO-USER", "verified-proxy-user")
          .set("X-NEO-PROXY-SECRET", "test-proxy-secret")
      ).status,
    ).toBe(200);
  });
  it("enforces per-client and global limits without trusting forwarded spoofing", async () => {
    const fetcher = success();
    const app = createApp({ ...config, perMinute: 1 }, fetcher);
    expect((await post(app)).status).toBe(200);
    const limited = await post(app);
    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    const globallyLimited = createApp(
      { ...config, globalPerMinute: 1, perMinute: 10 },
      fetcher,
    );
    expect((await post(globallyLimited)).status).toBe(200);
    expect((await post(globallyLimited)).status).toBe(429);
  });
  it("sets top-level, mic, XR and CSP security headers", async () => {
    const response = await request(createApp(config)).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.headers["permissions-policy"]).toContain(
      "xr-spatial-tracking=(self)",
    );
    expect(response.headers["content-security-policy"]).toContain(
      "https://api.openai.com",
    );
    expect(response.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });
});
