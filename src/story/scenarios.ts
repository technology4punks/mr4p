export type Theme = "environmental" | "social" | "economic";
export type Future = "critical" | "sustainable";
export const scenarios = {
  environmental: {
    title: "Ambiente",
    available: true,
    critical:
      "2050 · Smog, traffico, alberi spogli e acqua scarsa. Un futuro critico ipotetico dalla stessa finestra.",
    sustainable:
      "2050 · Verde urbano, acqua recuperata, energia pulita e mobilità elettrica.",
    objects: ["Energia rinnovabile", "Acqua e verde", "Mobilità pulita"],
    questions: [
      "Quale energia vorresti per la città?",
      "Acqua e verde: come useresti meglio l’acqua?",
      "Come ti muoveresti qui?",
    ],
    fog: [0.032, 0.0035],
    badSky: 0x9e5e2b,
  },
  economic: {
    title: "Economia",
    available: true,
    critical:
      "2050 · Negozi chiusi, fabbriche ferme e materiali scartati. Un futuro economico critico ipotetico.",
    sustainable:
      "2050 · Officine di riparazione, riuso dei materiali e produzione locale con energia distribuita.",
    objects: [
      "Energia distribuita",
      "Materiali in circolo",
      "Produzione locale",
    ],
    questions: [
      "Chi potrebbe condividere questa energia?",
      "Che cosa ripareresti invece di buttare?",
      "Quale attività apriresti qui?",
    ],
    fog: [0.018, 0.0035],
    badSky: 0x69747a,
  },
  social: {
    title: "Società",
    available: true,
    critical:
      "2050 · Servizi dietro cancelli, quartieri divisi e luoghi di incontro vuoti. Un futuro sociale critico ipotetico.",
    sustainable:
      "2050 · Biblioteca e salute di quartiere, accessi senza barriere e spazi pubblici condivisi.",
    objects: ["Servizi per tutti", "Accessibilità", "Partecipazione"],
    questions: [
      "Quale servizio dovrebbe essere vicino a tutti?",
      "Chi rischia di restare escluso?",
      "Come useresti questo spazio insieme agli altri?",
    ],
    fog: [0.012, 0.0035],
    badSky: 0x85828b,
  },
} as const;
export function scenario(theme: Theme | null) {
  return scenarios[theme ?? "environmental"];
}
