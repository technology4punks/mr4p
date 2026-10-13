import { env } from "cloudflare:workers";
import { runsResponse } from "../../../../lib/experience-runs";
export const dynamic = "force-dynamic";
export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) =>
  runsResponse(
    request,
    env.DB,
    env.APP_ORIGIN,
    env.RETENTION_DAYS,
    (await params).id,
  );
