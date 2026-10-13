import type { StorySnapshot } from "./StoryEngine.js";
import { optionById } from "../decision/catalog.js";
export const guidedDuration = 210_000;
/** No decisions are invented by the clock. Explicit pause suspends active time. */
export class GuidedVisit {
  startedAt: number | null = null;
  replied = false;
  introducedAt: number | null = null;
  returnedAt: number | null = null;
  reason: "choices" | "deadline" | "requested" = "requested";
  begin(now: number) {
    this.startedAt ??= now;
  }
  reset() {
    this.startedAt = this.introducedAt = this.returnedAt = null;
    this.replied = false;
    this.reason = "requested";
  }
  shiftTime(ms: number) {
    if (this.startedAt !== null) this.startedAt += ms;
    if (this.introducedAt !== null) this.introducedAt += ms;
    if (this.returnedAt !== null) this.returnedAt += ms;
  }
  elapsed(now: number) {
    return this.startedAt === null ? 0 : Math.max(0, now - this.startedAt);
  }
  shouldIntroduce(now: number, busy: boolean) {
    return (
      this.startedAt !== null &&
      this.introducedAt === null &&
      !busy &&
      (this.replied || this.elapsed(now) >= 16_000)
    );
  }
  shouldReturn(s: StorySnapshot, now: number) {
    if (
      s.environment !== "observatory" ||
      s.state === "PAUSED" ||
      s.state === "RETURNING_TO_MR"
    )
      return false;
    if (this.elapsed(now) >= guidedDuration) {
      this.reason = "deadline";
      return true;
    }
    if (
      !s.transitioning &&
      (s.decisions.active.length >= 4 ||
        (s.decisions.active.length >= 3 && this.elapsed(now) >= 120_000))
    ) {
      this.reason = "choices";
      return true;
    }
    return false;
  }
}
export function takeaway(ids: readonly string[]) {
  const words: Record<string, string> = {
    mobility: "mobilità",
    green: "verde",
    energy: "energia",
    buildings: "edifici",
    water: "acqua",
    heat: "comfort",
    waste: "riuso",
    logistics: "consegne",
    biodiversity: "biodiversità",
    food: "cibo",
  };
  const themes = [
    ...new Set(ids.map((id) => optionById.get(id)?.lever).filter(Boolean)),
  ]
    .slice(0, 3)
    .map((id) => words[id!.toLowerCase()] ?? "risorse");
  if (themes.length < 2)
    return "Il futuro non è scritto: una scelta concreta può aprire possibilità diverse.";
  const list =
    themes.length === 2
      ? themes.join(" e ")
      : themes.slice(0, -1).join(", ") + " e " + themes.at(-1);
  return `Il futuro prende forma quando pensiamo insieme a ${list}.`;
}
