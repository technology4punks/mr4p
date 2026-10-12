declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    RETENTION_DAYS?: string;
    OPENAI_API_KEY?: string;
    APP_ORIGIN?: string;
    REALTIME_MODEL?: string;
    REALTIME_VOICE?: string;
  }
}
