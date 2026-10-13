import { env } from "cloudflare:workers";
import { controlRoomResponse } from "../../../../lib/experience-runs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) =>
  controlRoomResponse(request, env.DB, env.CONTROL_ROOM_ALLOWED_EMAILS);
