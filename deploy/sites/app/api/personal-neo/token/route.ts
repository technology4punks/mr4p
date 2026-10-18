import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createTokenResponse } from "../../../../lib/realtime-token";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  return createTokenResponse(request, {apiKey:env.OPENAI_API_KEY,origin:env.APP_ORIGIN,model:env.REALTIME_MODEL,voice:env.REALTIME_VOICE,allowAnonymous:true,personal:true}, user?.userId);
}
