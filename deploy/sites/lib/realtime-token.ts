import { turnDetection } from "../src/audio/turnDetection";
import { storyInstructions, storyTools } from "./story-config";
import { personalInstructions, personalTools } from "./personal/config";
export type RealtimeConfig = {
  apiKey?: string;
  model?: string;
  voice?: string;
  origin?: string;
  allowAnonymous?: boolean;
  personal?: boolean;
};
export const instructions = storyInstructions;
const json = (
  status: number,
  body: object,
  extra: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
export class TokenLimiter {
  private users = new Map<string, { since: number; count: number }>();
  private total = { since: 0, count: 0 };
  allow(userId: string, now = Date.now()) {
    if (now - this.total.since >= 60_000) {
      this.total = { since: now, count: 0 };
      this.users.clear();
    }
    const user = this.users.get(userId) ?? { since: now, count: 0 };
    if (now - user.since >= 60_000) {
      user.since = now;
      user.count = 0;
    }
    if (user.count >= 5 || this.total.count >= 30) return false;
    user.count++;
    this.total.count++;
    this.users.set(userId, user);
    return true;
  }
}
const limiter = new TokenLimiter();
export async function createTokenResponse(
  request: Request,
  config: RealtimeConfig,
  userId?: string,
  fetcher: typeof fetch = fetch,
  limit: Pick<TokenLimiter, "allow"> = limiter,
): Promise<Response> {
  if (request.method !== "POST")
    return json(405, { error: "Metodo non consentito." }, { Allow: "POST" });
  if (!userId && !config.allowAnonymous)
    return json(401, {
      error:
        "Accedi a ChatGPT per avviare la conversazione su questo Site privato.",
    });
  if (
    !config.origin ||
    request.headers.get("origin") !== config.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json(403, { error: "Origine non autorizzata." });
  if (!config.apiKey)
    return json(503, {
      error:
        "Voce non configurata: aggiungi OPENAI_API_KEY come segreto nelle impostazioni di questo Site, poi ridistribuisci la versione.",
    });
  // Public visitors share a conservative bucket. Client-provided IPs, cookies,
  // and identifiers cannot create fresh buckets to bypass the limit.
  const principal = userId ? `user:${userId}` : "anonymous";
  if (!limit.allow(principal))
    return json(
      429,
      { error: "Troppe richieste di conversazione. Attendi un minuto." },
      { "Retry-After": "60" },
    );
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
            instructions: config.personal ? personalInstructions : instructions,
            tools: config.personal ? personalTools : storyTools,
            tool_choice: "auto",
            output_modalities: ["audio"],
            audio: {
              input: {
                noise_reduction: { type: "near_field" },
                transcription: {
                  model: "gpt-4o-mini-transcribe",
                  language: "it",
                },
                turn_detection: turnDetection,
              },
              output: { voice: config.voice || "marin" },
            },
          },
        }),
      },
    );
    if (!upstream.ok) {
      const errors: Record<number, string> = {
        400: "Configurazione voce o modello non supportata.",
        401: "Credenziali OpenAI non autorizzate: verifica il segreto nel runtime Sites.",
        403: "Modello Realtime non abilitato per questo account.",
        404: "Modello Realtime non disponibile: verifica REALTIME_MODEL.",
        429: "Quota OpenAI o limite richieste raggiunto. Riprova più tardi.",
      };
      return json(upstream.status === 429 ? 429 : 502, {
        error:
          errors[upstream.status] ||
          "Servizio voce temporaneamente indisponibile.",
      });
    }
    const data = (await upstream.json()) as {
      value?: unknown;
      expires_at?: unknown;
    };
    if (
      typeof data.value !== "string" ||
      !data.value ||
      typeof data.expires_at !== "number"
    )
      return json(502, { error: "Risposta del servizio voce non valida." });
    return json(200, { value: data.value, expires_at: data.expires_at });
  } catch {
    return json(502, {
      error: "Connessione al servizio voce scaduta o rete indisponibile.",
    });
  }
}
