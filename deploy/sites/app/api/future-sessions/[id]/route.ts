import { env } from "cloudflare:workers";
import { sessionsResponse } from "../../../../lib/future-sessions";
export const dynamic = "force-dynamic";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return sessionsResponse(
    request,
    env.DB,
    env.APP_ORIGIN,
    env.RETENTION_DAYS,
    id,
  );
}
