import {
  DecisionEngine,
  type Decision,
  type Revision,
} from "./DecisionEngine.js";
export type SessionPayload = {
  id: string;
  deleteToken: string;
  experienceVersion: "V4";
  sequence: Decision[];
  active: Decision[];
  revision: Revision | null;
  reflection: string;
  message: string;
  consent: true;
};
/** Reject extra identifiers/audio/transcripts. Server reconstructs all decisions. */
export function validateSession(input: unknown): SessionPayload {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Dati non validi.");
  const p = input as Record<string, unknown>;
  if (
    Object.keys(p).some(
      (k) =>
        ![
          "id",
          "deleteToken",
          "experienceVersion",
          "sequence",
          "active",
          "revision",
          "reflection",
          "message",
          "consent",
        ].includes(k),
    )
  )
    throw new Error("Proprietà non autorizzata.");
  if (p.consent !== true || p.experienceVersion !== "V4")
    throw new Error("Consenso esplicito richiesto.");
  if (
    typeof p.id !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(p.id) ||
    typeof p.deleteToken !== "string" ||
    !/^[a-f0-9-]{72}$/i.test(p.deleteToken)
  )
    throw new Error("Identificativo non valido.");
  if (
    typeof p.reflection !== "string" ||
    !p.reflection.trim() ||
    p.reflection.length > 2000 ||
    typeof p.message !== "string" ||
    !p.message.trim() ||
    p.message.length > 1000
  )
    throw new Error("Messaggio non valido.");
  if (
    /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b(?:\+?\d[\d ().-]{6,}\d)\b|\b(?:mi chiamo|il mio nome|la mia email)\b/i.test(
      p.reflection + " " + p.message,
    )
  )
    throw new Error(
      "Rimuovi nomi e contatti dalla riflessione prima di salvarla.",
    );
  if (
    !Array.isArray(p.sequence) ||
    !Array.isArray(p.active) ||
    p.sequence.length > 5
  )
    throw new Error("Decisioni non valide.");
  const engine = new DecisionEngine();
  for (const d of p.sequence) {
    if (
      !d ||
      typeof d !== "object" ||
      Object.keys(d).sort().join(",") !== "optionId,slotId" ||
      typeof d.optionId !== "string" ||
      engine.choose(d.optionId) ||
      engine.snapshot.active.at(-1)?.slotId !== d.slotId
    )
      throw new Error("Sequenza non valida.");
  }
  if (p.revision !== null) {
    const rev = p.revision as Revision;
    if (
      !rev ||
      Object.keys(rev).sort().join(",") !==
        "newOptionId,previousOptionId,slotId" ||
      engine.finish() ||
      engine.snapshot.active.find((d) => d.slotId === rev.slotId)?.optionId !==
        rev.previousOptionId ||
      engine.revise(rev.slotId, rev.newOptionId)
    )
      throw new Error("Revisione non valida.");
  }
  if (JSON.stringify(engine.snapshot.active) !== JSON.stringify(p.active))
    throw new Error("Stato attivo incoerente.");
  return {
    id: p.id,
    deleteToken: p.deleteToken,
    experienceVersion: "V4",
    sequence: engine.snapshot.sequence,
    active: engine.snapshot.active,
    revision: engine.snapshot.revision,
    reflection: p.reflection.trim(),
    message: p.message.trim(),
    consent: true,
  };
}
