import { env } from "cloudflare:workers";
import { sessionsResponse } from "../../../lib/future-sessions";
export const dynamic = "force-dynamic";
export const POST = (request: Request) =>
  sessionsResponse(request, env.DB, env.APP_ORIGIN, env.RETENTION_DAYS);
export const GET = () =>
  new Response(JSON.stringify({ error: "Metodo non consentito." }), {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
