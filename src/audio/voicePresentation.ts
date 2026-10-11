import type { VoiceSnapshot } from "./realtimeClient";

export type VoiceActivity =
  | "off" | "connecting" | "ready" | "listening" | "processing"
  | "speaking" | "muted" | "paused" | "audio-blocked" | "error";

const options: Record<VoiceActivity, { label: string; detail: string; color: string }> = {
    off: { label: "Voce spenta", detail: "Premi Avvia voce per conversare", color: "#a8bec5" },
    connecting: { label: "Connessione…", detail: "Consenti il microfono e attendi", color: "#ffd38a" },
    ready: { label: "Puoi parlare", detail: "Microfono acceso · NEO aspetta te", color: "#7ae1c7" },
    listening: { label: "Ti ascolto", detail: "Sto ricevendo la tua voce", color: "#7ae1c7" },
    processing: { label: "Sto preparando la risposta", detail: "Microfono acceso · puoi continuare", color: "#ffd38a" },
    speaking: {
      label: "NEO risponde",
      detail: "Microfono acceso · puoi interrompermi a voce",
      color: "#91caff",
    },
    muted: { label: "Microfono spento", detail: "Premi Riattiva microfono per parlare", color: "#ffab9e" },
    paused: { label: "Microfono in pausa", detail: "Si riapre automaticamente a fine risposta", color: "#ffd38a" },
    "audio-blocked": { label: "Audio da riattivare", detail: "Premi Riattiva audio per sentire NEO", color: "#ffd38a" },
    error: { label: "Voce interrotta", detail: "Premi Avvia voce per riconnettere", color: "#ffab9e" },
};
/** Shared wording for the page, Quest menu and the indicator beside NEO. */
export function voicePresentation(voice?: VoiceSnapshot) {
  const activity = voice?.activity ?? "off";
  const detail = activity === "paused" && voice?.inputHealth === "recovering"
    ? "Ripristino del microfono in corso…"
    : activity === "paused" && voice?.inputHealth === "stalled"
      ? "Audio non inviato · premi Riprendi ascolto"
      : activity === "speaking" && !voice?.interruptions
    ? "Microfono in pausa · premi Interrompi per parlare"
    : activity === "paused" && voice?.inputSuspended
      ? "Torna alla sessione nel visore per riprendere"
      : activity === "paused" && !voice?.inputBlocked
        ? "Microfono sospeso dal dispositivo · verifica i permessi" : options[activity].detail;
  const label = activity === "paused" && voice?.inputHealth === "recovering" ? "Ripristino microfono…"
    : activity === "paused" && voice?.inputHealth === "stalled" ? "Microfono da ripristinare" : options[activity].label;
  return { activity, ...options[activity], label, detail };
}
