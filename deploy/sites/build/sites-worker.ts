let lastPurge = 0;
import handler from "vinext/server/fetch-handler";
export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    if (env.DB && Date.now() - lastPurge > 3_600_000) {
      lastPurge = Date.now();
      ctx.waitUntil(
        env.DB.prepare("DELETE FROM future_sessions WHERE expires_at <= ?")
          .bind(Date.now())
          .run()
          .catch(() => {
            lastPurge = 0;
          }),
      );
    }
    const response = await handler.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set(
      "Permissions-Policy",
      "microphone=(self), xr-spatial-tracking=(self), camera=()",
    );
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'",
    );
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
