import { SqliteSessions } from "./session-store.js";
import { createApp } from "./app.js";
const production = process.env.NODE_ENV === "production";
const sessions = new SqliteSessions(
  process.env.FUTURE_DB_PATH || "./data/future-observatory.sqlite",
  Number(process.env.RETENTION_DAYS || 30),
);
const purgeTimer = setInterval(() => sessions.purge(), 3_600_000);
purgeTimer.unref();
const app = createApp(
  {
    controlRoomEmails: process.env.CONTROL_ROOM_ALLOWED_EMAILS,
    databasePath:
      process.env.FUTURE_DB_PATH || "./data/future-observatory.sqlite",
    retentionDays: Number(process.env.RETENTION_DAYS || 30),
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.REALTIME_MODEL,
    voice: process.env.REALTIME_VOICE,
    origin: process.env.APP_ORIGIN,
    production,
    requireProxyAuth: process.env.REQUIRE_PROXY_AUTH === "true",
    proxyAuthSecret: process.env.PROXY_AUTH_SECRET,
    trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 0),
    perMinute: Number(process.env.TOKEN_LIMIT_PER_MINUTE || 5),
    globalPerMinute: Number(process.env.TOKEN_GLOBAL_LIMIT_PER_MINUTE || 30),
  },
  fetch,
  sessions,
);
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () =>
  console.info(`NEO server in ascolto sulla porta ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      clearInterval(purgeTimer);
      sessions.close();
      process.exit(0);
    }),
  );
