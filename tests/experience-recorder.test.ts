import { afterEach, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { ExperienceRecorder } from "../src/recording/ExperienceRecorder";
import { explicitStorageRequest } from "../src/recording/payload";
import type { RunPayload } from "../src/recording/payload";
const payload = (): RunPayload => ({
  id: randomUUID(),
  deleteToken: randomUUID() + randomUUID(),
  consent: true,
  revision: 1,
  startedAt: Date.now(),
  elapsedSeconds: 0,
  state: "INITIALIZING_MR",
  status: "active",
  mode: "browser",
  guided: true,
  active: [],
  message: "",
  reason: "requested",
});
afterEach(() => vi.unstubAllGlobals());
it("serializes acknowledged writes and preserves the newest pending state without marking it saved early", async () => {
  const p = payload(),
    changes: string[] = [],
    pending: ((r: Response) => void)[] = [],
    bodies: RunPayload[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: unknown, options: RequestInit) => {
      bodies.push(JSON.parse(String(options.body)));
      return new Promise<Response>((resolve) => pending.push(resolve));
    }),
  );
  const r = new ExperienceRecorder((text) => changes.push(text));
  r.update(p);
  r.update({
    ...p,
    revision: 2,
    state: "APPLYING_INTERVENTION",
    active: ["GREEN_TREES"],
  });
  r.update({
    ...p,
    revision: 3,
    state: "FAREWELL",
    status: "completed",
    message: "Il futuro non è scritto.",
  });
  expect(bodies.length).toBe(1);
  expect(r.saved).toBeUndefined();
  pending[0](new Response(JSON.stringify({ id: p.id })));
  await vi.waitFor(() => expect(bodies.length).toBe(2));
  expect(bodies[1].status).toBe("completed");
  expect(r.saved?.status).toBe("active");
  pending[1](new Response(JSON.stringify({ id: p.id })));
  await vi.waitFor(() => expect(r.saved?.status).toBe("completed"));
  expect(r.busy).toBe(false);
  expect(changes.length).toBe(2);
});
it("handles backend failure without a success claim and permits a retry", async () => {
  const p = payload(),
    changes: string[] = [];
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("{}", { status: 503 }))
    .mockResolvedValue(new Response(JSON.stringify({ id: p.id })));
  vi.stubGlobal("fetch", fetcher);
  const r = new ExperienceRecorder((text) => changes.push(text));
  r.update(p);
  await vi.waitFor(() => expect(r.busy).toBe(false));
  expect(r.saved).toBeUndefined();
  expect(changes[0]).toContain("non confermata");
  r.update(p);
  await vi.waitFor(() => expect(r.saved?.id).toBe(p.id));
});
it("ignores acknowledgements from a prior visit after reset", async () => {
  const p = payload();
  let resolve!: (r: Response) => void;
  const changes: string[] = [];
  vi.stubGlobal("fetch", () => new Promise<Response>((r) => (resolve = r)));
  const r = new ExperienceRecorder((text) => changes.push(text));
  r.update(p);
  r.reset();
  resolve(new Response(JSON.stringify({ id: p.id })));
  await new Promise((r) => setTimeout(r, 0));
  expect(r.saved).toBeUndefined();
  expect(changes).toEqual([]);
});

it("does not turn agreement to a story into storage permission", () => {
  for (const text of [
    "sì",
    "va bene",
    "sì, cambiamo futuro",
    "no, non salvare i dati",
    "salviamo energia con i pannelli",
  ])
    expect(explicitStorageRequest(text)).toBe(false);
  for (const text of [
    "salva questa esperienza",
    "sì, registra le mie scelte",
    "acconsento",
  ])
    expect(explicitStorageRequest(text)).toBe(true);
});
