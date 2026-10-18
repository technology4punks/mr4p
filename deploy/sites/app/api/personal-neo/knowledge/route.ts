import { env } from "cloudflare:workers";
import { getKnowledge, KnowledgeError } from "../../../../lib/personal/knowledge";
export const dynamic = "force-dynamic";
let count = 0, since = 0;
const json = (status:number,body:object) => new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export async function POST(request: Request) {
  if (!env.APP_ORIGIN || request.headers.get("origin") !== env.APP_ORIGIN || request.headers.get("sec-fetch-site") === "cross-site") return json(403,{error:"Origine non autorizzata."});
  if (Date.now()-since>60000) {since=Date.now();count=0}
  if (++count>12) return json(429,{error:"Troppe osservazioni o ricerche. Attendi un minuto."});
  try {
    if (Number(request.headers.get("content-length")??0)>800000) return json(413,{error:"Fotogramma troppo grande."});
    const body=await request.text();if(body.length>800000)return json(413,{error:"Fotogramma troppo grande."});
    let input;try {input=JSON.parse(body)}catch{return json(422,{error:"Richiesta non valida."})}
    return json(200,await getKnowledge(input,{apiKey:env.OPENAI_API_KEY},fetch,request.signal));
  } catch(e) { return json(e instanceof KnowledgeError?e.status:502,{error:e instanceof KnowledgeError?e.message:"Comprensione non disponibile. Puoi continuare a parlare."}); }
}
