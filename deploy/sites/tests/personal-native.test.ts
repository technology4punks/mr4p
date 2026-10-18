import {it,expect,vi} from "vitest";
import {createTokenResponse} from "../lib/realtime-token";
import {getKnowledge} from "../lib/personal/knowledge";
it("issues the personal tool profile without changing the observatory default",async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({value:"test-only",expires_at:Date.now()/1000+60}),{status:200}));
 const origin="https://neo.example";
 const response=await createTokenResponse(new Request(origin+"/api/personal-neo/token",{method:"POST",headers:{Origin:origin}}),{apiKey:"server-test",origin,personal:true,allowAnonymous:true},undefined,fetcher,{allow:()=>true});
 expect(response.status).toBe(200);
 const session=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).session;
 expect(session.instructions).toContain("LiDAR");expect(session.tools.some((t:{name:string})=>t.name==="look_at_environment")).toBe(true);
});
it("returns a real-search flag and safe manual citations without retention",async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({output:[{type:"web_search_call"},{content:[{type:"output_text",text:"Manuale consultato.",annotations:[{type:"url_citation",title:"Manuale",url:"https://example.com/manual"}]}]}]}),{status:200}));
 const value=await getKnowledge({action:"instructions",query:"Manuale"},{apiKey:"server-test"},fetcher);
 expect(value.searched).toBe(true);expect(value.sources).toHaveLength(1);expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).store).toBe(false);
});
it("rejects unbounded/extra payloads before making provider requests",async()=>{
 const fetcher=vi.fn<typeof fetch>();
 await expect(getKnowledge({action:"look",query:"Vedi",image:"https://private.example/"},{apiKey:"test"},fetcher)).rejects.toMatchObject({status:422});
 expect(fetcher).not.toHaveBeenCalled();
});
