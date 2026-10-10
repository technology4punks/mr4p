import type { RequestHandler } from "express";
import { storyInstructions, storyTools } from "./story-config.js";

export const instructions = storyInstructions;
export type ServerConfig = {
  apiKey?: string;
  model?: string;
  voice?: string;
  origin?: string;
  production?: boolean;
  requireProxyAuth?: boolean;
  proxyAuthSecret?: string;
  trustProxyHops?: number;
  perMinute?: number;
  globalPerMinute?: number;
};
export function tokenHandler(
  config: ServerConfig,
  fetcher: typeof fetch = fetch,
): RequestHandler {
  return async (_req, res) => {
    if (!config.apiKey) {
      res
        .status(503)
        .json({
          error:
            "Voce non configurata: aggiungere il segreto OpenAI nel runtime server.",
        });
      return;
    }
    try {
      const upstream = await fetcher(
        "https://api.openai.com/v1/realtime/client_secrets",
        {
          method: "POST",
          signal: AbortSignal.timeout(15_000),
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expires_after: { anchor: "created_at", seconds: 60 },
            session: {
              type: "realtime",
              model: config.model || "gpt-realtime-2.1-mini",
              instructions,
              tools: storyTools,
              tool_choice: "auto",
              output_modalities: ["audio"],
              audio: {
                input: {
                  transcription: {
                    model: "gpt-4o-mini-transcribe",
                    language: "it",
                  },
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 600,
                    create_response: true,
                    interrupt_response: true,
                  },
                },
                output: { voice: config.voice || "marin" },
              },
            },
          }),
        },
      );
      if (!upstream.ok) {
        const messages: Record<number, string> = {
          400: "Configurazione voce o modello non supportata: verificare il runtime server.",
          401: "Credenziali OpenAI non autorizzate: verificare il segreto server.",
          403: "Modello Realtime non abilitato per questo account.",
          404: "Modello Realtime non disponibile: verificare REALTIME_MODEL.",
          429: "Quota OpenAI o limite richieste raggiunto. Riprova più tardi.",
        };
        res
          .status(upstream.status === 429 ? 429 : 502)
          .json({
            error:
              messages[upstream.status] ||
              "Servizio voce temporaneamente indisponibile.",
          });
        return;
      }
      const data = (await upstream.json()) as {
        value?: unknown;
        expires_at?: unknown;
      };
      if (
        typeof data.value !== "string" ||
        !data.value ||
        typeof data.expires_at !== "number"
      ) {
        res
          .status(502)
          .json({ error: "Risposta del servizio voce non valida." });
        return;
      }
      // Deliberate allowlist: never forward session settings or upstream diagnostics.
      res.json({ value: data.value, expires_at: data.expires_at });
    } catch {
      res
        .status(502)
        .json({
          error: "Connessione al servizio voce scaduta o rete indisponibile.",
        });
    }
  };
}
