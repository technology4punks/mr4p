import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { tokenHandler, type ServerConfig } from "./realtime-token.js";

export function createApp(
  config: ServerConfig = {},
  fetcher: typeof fetch = fetch,
) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxyHops ?? 0);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "https://api.openai.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          mediaSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.production ? [] : null,
        },
      },
      strictTransportSecurity: config.production ? undefined : false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "microphone=(self), xr-spatial-tracking=(self), camera=()",
    );
    next();
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/realtime-token", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.all("/api/realtime-token", (req, res, next) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "Metodo non consentito." });
      return;
    }
    const origin = req.get("origin");
    let allowed = false;
    try {
      const url = new URL(origin || "");
      allowed = config.origin
        ? origin === config.origin
        : !config.production &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch {
      /* An absent or malformed origin is rejected. */
    }
    if (!allowed || req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Origine non autorizzata." });
      return;
    }
    // This header is trustworthy ONLY behind the documented authenticating proxy.
    const presented = Buffer.from(req.get("x-neo-proxy-secret") || "");
    const expected = Buffer.from(config.proxyAuthSecret || "");
    const trusted =
      !!expected.length &&
      presented.length === expected.length &&
      timingSafeEqual(presented, expected);
    if (
      (config.production && !config.requireProxyAuth) ||
      (config.requireProxyAuth && (!req.get("x-neo-user") || !trusted))
    ) {
      res
        .status(403)
        .json({
          error: "Accesso voce riservato agli utenti autorizzati dal server.",
        });
      return;
    }
    next();
  });
  const limitOptions = {
    windowMs: 60_000,
    standardHeaders: "draft-8" as const,
    legacyHeaders: false,
    message: { error: "Troppe richieste di conversazione. Attendi un minuto." },
  };
  app.post(
    "/api/realtime-token",
    rateLimit({
      ...limitOptions,
      limit: config.globalPerMinute ?? 30,
      keyGenerator: () => "global",
    }),
    rateLimit({ ...limitOptions, limit: config.perMinute ?? 5 }),
    tokenHandler(config, fetcher),
  );
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API non trovata." }),
  );
  app.use(express.static(resolve("dist"), { index: "index.html" }));
  app.use((_req, res) => res.status(404).send("Pagina non trovata"));
  return app;
}
