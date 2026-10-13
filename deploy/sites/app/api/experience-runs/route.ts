import { env } from "cloudflare:workers";
import { runsResponse } from "../../../lib/experience-runs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) =>
  runsResponse(request, env.DB, env.APP_ORIGIN, env.RETENTION_DAYS);
