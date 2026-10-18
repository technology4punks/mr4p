export const demonstrations = {
  wave: { label: "Saluto", description: "Un saluto con la mano.", duration: 4 },
  explain: { label: "Spiega", description: "Un gesto per accompagnare una spiegazione.", duration: 5 },
  judo_rei: { label: "Judo · saluto", description: "Rei: un inchino illustrativo, lento e senza contatto.", duration: 6 },
  judo_tai_sabaki: { label: "Judo · spostamento", description: "Tai sabaki: schema semplificato di passo e rotazione, senza partner o proiezione.", duration: 9 },
} as const;
export type DemoId = keyof typeof demonstrations;
export function isDemoId(value: unknown): value is DemoId {
  return typeof value === "string" && Object.hasOwn(demonstrations, value);
}
export type KnowledgeInput = {
  action: "look" | "instructions";
  query: string;
  image?: string;
};
export type KnowledgeResult = {
  text: string;
  sources: { title: string; url: string }[];
  searched: boolean;
  objects?: SceneObservation[];
};
export function validateKnowledge(value: unknown): KnowledgeInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Richiesta non valida.");
  const p = value as Record<string, unknown>;
  if (Object.keys(p).some(k => !["action", "query", "image"].includes(k)) || !["look", "instructions"].includes(String(p.action)) || typeof p.query !== "string" || !p.query.trim() || p.query.length > 500)
    throw Error("Chiedi cosa osservare o quale istruzione cercare (massimo 500 caratteri).");
  if (p.action === "look" && (typeof p.image !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.image) || p.image.length > 750000 || p.image.length < 80))
    throw Error("Serve un fotogramma JPEG valido dalla fotocamera.");
  if (p.action === "instructions" && p.image !== undefined) throw Error("La ricerca non richiede immagini.");
  return { action: p.action as KnowledgeInput["action"], query: p.query.trim(), ...(p.action === "look" ? { image: p.image as string } : {}) };
}
export function safeSource(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 2000) return false;
  try { const u = new URL(url); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}

export type SceneObservation = {
  id: string; label: string; category: "piano" | "chair" | "table" | "door" | "appliance" | "screen" | "other";
  confidence: number; box: number[]; brand: string; model: string;
};
export function observations(value: unknown): SceneObservation[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0,8).flatMap((raw, i) => {
    if (!raw || typeof raw !== "object") return [];
    const p = raw as Record<string, unknown>, box = p.box;
    if (typeof p.label !== "string" || !["piano","chair","table","door","appliance","screen","other"].includes(String(p.category)) || typeof p.confidence !== "number" || !Number.isFinite(p.confidence) || p.confidence < 0 || p.confidence > 1 || !Array.isArray(box) || box.length !== 4 || box.some(n => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) || box[2] <= 0 || box[3] <= 0 || box[0] + box[2] > 1.001 || box[1] + box[3] > 1.001) return [];
    return [{ id: `object-${i+1}`, label: p.label.slice(0,100), category: p.category as SceneObservation["category"], confidence: p.confidence, box, brand: typeof p.brand === "string" ? p.brand.slice(0,100) : "", model: typeof p.model === "string" ? p.model.slice(0,100) : "" }];
  });
}
