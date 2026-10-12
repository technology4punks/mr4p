export type Theme = "environmental";
export type Future = "critical" | "transformed";
export const scenarios = {
  environmental: {
    title: "The Complexity of Choice",
    available: true,
    critical:
      "2050 · Caldo, traffico congestionato, poco verde e pressione sull’acqua. Uno scenario ambientale ipotetico.",
    transformed:
      "La stessa città, trasformata dalle tue decisioni. Alcuni problemi restano aperti.",
    questions: [
      "Quale strategia energetica sceglieresti?",
      "Come gestiresti acqua e verde?",
      "Come cambieresti la mobilità?",
    ],
    fog: [0.022, 0.009],
    badSky: 0x9b8568,
  },
} as const;
export const scenario = () => scenarios.environmental;
