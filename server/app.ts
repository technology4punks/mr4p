import { controlRoomAuthorized } from "../src/recording/payload.js";
import { validateSession } from "../src/decision/sessionPayload.js";
import { SqliteSessions, type SessionRepository } from "./session-store.js";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { tokenHandler, type ServerConfig } from "./realtime-token.js";

export function createApp(
  config: ServerConfig = {},
  fetcher: typeof fetch = fetch,
  repository: SessionRepository = new SqliteSessions(
    config.databasePath ?? ":memory:",
    config.retentionDays ?? 30,
  ),
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
      res.status(403).json({
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
  app.use(
    "/api/future-sessions",
    express.json({ limit: "16kb" }),
    (_req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.use(
    "/api/future-sessions",
    (req, res, next) => {
      const origin = req.get("origin");
      let allowed = false;
      try {
        const u = new URL(origin ?? "");
        allowed = config.origin
          ? origin === config.origin
          : !config.production &&
            ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
      } catch {
        /* reject */
      }
      if (!allowed || req.get("sec-fetch-site") === "cross-site") {
        res.status(403).json({ error: "Origine non autorizzata." });
        return;
      }
      if (config.production) {
        const presented = Buffer.from(req.get("x-neo-proxy-secret") ?? ""),
          expected = Buffer.from(config.proxyAuthSecret ?? "");
        if (
          !config.requireProxyAuth ||
          !expected.length ||
          presented.length !== expected.length ||
          !timingSafeEqual(presented, expected) ||
          !req.get("x-neo-user")
        ) {
          res.status(403).json({ error: "Accesso non autorizzato." });
          return;
        }
      }
      next();
    },
    rateLimit({
      ...limitOptions,
      limit: 30,
      keyGenerator: () => "sessions-global",
    }),
  );
  app.post("/api/future-sessions", async (req, res) => {
    let data;
    try {
      data = validateSession(req.body);
    } catch (error) {
      res.status(422).json({
        error: error instanceof Error ? error.message : "Dati non validi.",
      });
      return;
    }
    try {
      const result = await repository.save(data);
      res.status(201).json(result);
    } catch {
      res.status(503).json({
        error: "Salvataggio non riuscito. Riprova o continua senza salvare.",
      });
    }
  });
  app.delete("/api/future-sessions/:id", async (req, res) => {
    try {
      const token = (req.get("authorization") ?? "").replace(/^Bearer /, "");
      if (!token || !(await repository.remove(String(req.params.id), token))) {
        res.status(403).json({ error: "Cancellazione non autorizzata." });
        return;
      }
      res.json({ deleted: true });
    } catch {
      res.status(503).json({ error: "Cancellazione non riuscita." });
    }
  });
  app.use(
    "/api/experience-runs",
    express.json({ limit: "16kb" }),
    (_req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      next();
    },
    rateLimit({ ...limitOptions, limit: 60 }),
  );
  app.use("/api/experience-runs", (req, res, next) => {
    const origin = req.get("origin");
    let allowed = false;
    try {
      allowed = config.origin
        ? origin === config.origin
        : !config.production &&
          ["localhost", "127.0.0.1", "[::1]"].includes(
            new URL(origin ?? "").hostname,
          );
    } catch {
      /* reject */
    }
    if (!allowed || req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Origine non autorizzata." });
      return;
    }
    next();
  });
  app.post("/api/experience-runs", async (req, res) => {
    try {
      if (!repository.saveRun) {
        res.status(503).json({ error: "Registrazione non configurata." });
        return;
      }
      const p = await repository.saveRun(req.body);
      res.status(201).json(p);
    } catch {
      res
        .status(422)
        .json({
          error: "Dati o consenso non validi; registrazione non confermata.",
        });
    }
  });
  app.delete("/api/experience-runs/:id", async (req, res) => {
    try {
      const token = (req.get("authorization") ?? "").replace(/^Bearer /, "");
      if (
        !token ||
        !repository.removeRun ||
        !(await repository.removeRun(String(req.params.id), token))
      ) {
        res.status(403).json({ error: "Cancellazione non autorizzata." });
        return;
      }
      res.json({ deleted: true });
    } catch {
      res.status(503).json({ error: "Cancellazione non confermata." });
    }
  });
  app.get("/api/control-room/experiences", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const presented = Buffer.from(req.get("x-neo-proxy-secret") ?? ""),
      expected = Buffer.from(config.proxyAuthSecret ?? "");
    const trusted =
      !!expected.length &&
      presented.length === expected.length &&
      timingSafeEqual(presented, expected) &&
      !!req.get("x-neo-user");
    if (
      !trusted ||
      !controlRoomAuthorized(req.get("x-neo-email"), config.controlRoomEmails)
    ) {
      res
        .status(403)
        .json({ error: "Control room riservata agli operatori autorizzati." });
      return;
    }
    const page = Number(req.query.page ?? 0),
      size = Number(req.query.pageSize ?? 20),
      status = String(req.query.status ?? "");
    if (
      !Number.isInteger(page) ||
      page < 0 ||
      page > 10000 ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > 50 ||
      !["", "active", "completed", "interrupted"].includes(status)
    ) {
      res.status(422).json({ error: "Filtri non validi." });
      return;
    }
    try {
      if (!repository.listRuns) {
        res.status(503).json({ error: "Archivio non disponibile." });
        return;
      }
      res.json(await repository.listRuns(page, size, status));
    } catch {
      res.status(503).json({ error: "Archivio non disponibile." });
    }
  });
  app.get("/control-room", (_req, res) =>
    res.sendFile(resolve("dist/index.html")),
  );
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API non trovata." }),
  );
  app.use(express.static(resolve("dist"), { index: "index.html" }));
  app.use((_req, res) => res.status(404).send("Pagina non trovata"));
  return app;
}
