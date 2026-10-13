import type { RunPayload } from "./payload.js";
/** Serialize acknowledged updates; a failed write never interrupts voice/rendering. */
export class ExperienceRecorder {
  private pending?: RunPayload;
  private sending = false;
  private generation = 0;
  private acknowledged?: RunPayload;
  private key = "";
  private failed = false;
  constructor(private changed: (status: string) => void) {}
  reset() {
    this.generation++;
    this.pending = undefined;
    this.acknowledged = undefined;
    this.key = "";
    this.sending = false;
    this.failed = false;
  }
  update(payload: RunPayload) {
    const key = JSON.stringify([
      payload.state,
      payload.status,
      payload.active,
      payload.message,
      payload.mode,
    ]);
    if (key === this.key && !this.failed) return;
    this.key = key;
    this.pending = structuredClone(payload);
    void this.flush();
  }
  close(payload: RunPayload) {
    this.pending = undefined;
    void fetch("/api/experience-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
  private async flush() {
    if (this.sending || !this.pending) return;
    const payload = this.pending,
      generation = this.generation;
    this.pending = undefined;
    this.sending = true;
    try {
      const response = await fetch("/api/experience-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
        keepalive: true,
      });
      const result = (await response.json()) as { id?: string };
      if (!response.ok || result.id !== payload.id)
        throw new Error("Scrittura non confermata");
      if (generation !== this.generation) return;
      this.acknowledged = payload;
      this.failed = false;
      this.changed("Esperienza registrata in forma anonima.");
    } catch {
      if (generation === this.generation) {
        this.failed = true;
        this.changed(
          "Registrazione non confermata. L’esperienza continua; puoi riprovare al termine.",
        );
      }
    } finally {
      if (generation === this.generation) {
        this.sending = false;
        if (this.pending) void this.flush();
      }
    }
  }
  get attempted() {
    return this.key !== "";
  }
  get saved() {
    return this.acknowledged;
  }
  get busy() {
    return this.sending || !!this.pending;
  }
  async remove(target?: Pick<RunPayload, "id" | "deleteToken">) {
    const p = target ?? this.acknowledged;
    if (!p) return false;
    this.generation++;
    this.sending = false;
    this.pending = undefined;
    // Revocation is also enforced by the backend tombstone for delayed requests.

    const r = await fetch(`/api/experience-runs/${p.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${p.deleteToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) {
      this.reset();
      this.changed("Dati dell’esperienza cancellati.");
    }
    return r.ok;
  }
}
