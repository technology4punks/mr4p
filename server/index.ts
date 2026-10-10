import { createApp } from "./app.js";
const production = process.env.NODE_ENV === "production";
const app = createApp({
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
});
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () =>
  console.info(`NEO server in ascolto sulla porta ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
