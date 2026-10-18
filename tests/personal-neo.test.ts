import { it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import { getKnowledge } from "../server/personal/knowledge";
import { validateKnowledge, observations } from "../src/personal/protocol";
const origin="http://localhost:5173";
const image="data:image/jpeg;base64,"+"a".repeat(128);
const reply=(output:unknown)=>new Response(JSON.stringify({status:"completed",output}),{status:200});
it("uses a native-specific voice prompt and keeps Buddy's narrative session intact",async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({value:"ephemeral-test",expires_at:Date.now()/1000+60}),{status:200}));
 const app=createApp({apiKey:"test-server-key"},fetcher);
 expect((await request(app).post("/api/personal-neo/token").set("Origin",origin)).status).toBe(200);
 let session=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).session;
 expect(session.instructions).toContain("LiDAR");expect(session.instructions).toContain("nessun HUD");
 expect(session.tools.map((t:{name:string})=>t.name)).toEqual(expect.arrayContaining(["move_near_object","follow_user","show_controls"]));expect(session.tools.some((t:{name:string})=>t.name==="point_at_object")).toBe(true);expect(session.tools.some((t:{name:string})=>t.name==="play_piano")).toBe(true);
 await request(app).post("/api/realtime-token").set("Origin",origin);
 session=JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)).session;
 expect(session.instructions).toContain("Future Observatory");expect(session.tools.some((t:{name:string})=>t.name==="show_intervention")).toBe(true);
});
it("vision returns bounded 2D observations, never fake metric positions or stored photos",async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>reply([{type:"message",content:[{type:"output_text",text:JSON.stringify({text:"Vedo una sedia.",objects:[{label:"Sedia",category:"chair",confidence:0.8,box:[0.1,0.2,0.3,0.4],brand:"",model:""}]})}]}]));
 const result=await getKnowledge({action:"look",query:"Cosa vedi?",image},{apiKey:"server-test"},fetcher);
 expect(result.objects?.[0].category).toBe("chair");expect(result.searched).toBe(false);
 const body=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));expect(body.store).toBe(false);expect(body.text.format.type).toBe("json_schema");expect(body.input[0].content[1].image_url).toBe(image);
 expect(JSON.stringify(result)).not.toContain(image);expect(result.objects?.[0]).not.toHaveProperty("position");
});
it("forces actual web search and exposes only safe citations",async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>reply([{type:"web_search_call"},{type:"message",content:[{type:"output_text",text:"Istruzioni consultate.",annotations:[{type:"url_citation",title:"Manuale",url:"https://example.com/manual"},{type:"url_citation",url:"javascript:alert(1)"}]}]}]));
 const result=await getKnowledge({action:"instructions",query:"Manuale del modello X"},{apiKey:"server-test"},fetcher);
 expect(result.searched).toBe(true);expect(result.sources).toHaveLength(1);
 expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).tool_choice).toBe("required");
});
it("rejects external-image URLs, images in research, invalid boxes and payload extensions",()=>{
 expect(()=>validateKnowledge({action:"look",query:"Vedi",image:"https://example.com/photo"})).toThrow();
 expect(()=>validateKnowledge({action:"instructions",query:"Manuale",image})).toThrow();
 expect(()=>validateKnowledge({action:"instructions",query:"Manuale",apiKey:"private"})).toThrow();
 expect(observations([{label:"Sedia",category:"chair",confidence:0.8,box:[0.9,0.8,0.5,0.5]}])).toEqual([]);
 expect(observations([{label:"Sedia",category:"chair",confidence:NaN,box:[0,0,0.2,0.2]}])).toEqual([]);
});
it("fails safely on provider errors or malformed structured vision",async()=>{
 await expect(getKnowledge({action:"instructions",query:"Manuale"},{apiKey:"test"},async()=>new Response("secret-upstream-debug",{status:429}))).rejects.toMatchObject({status:429});
 await expect(getKnowledge({action:"look",query:"Osserva",image},{apiKey:"test"},async()=>reply([{type:"message",content:[{type:"output_text",text:"not json"}]}]))).rejects.toMatchObject({status:502});
});
it("enforces native origin, POST-only, backend credentials and payload bounds",async()=>{
 const app=createApp();
 expect((await request(app).post("/api/personal-neo/knowledge").send({action:"instructions",query:"Manuale"})).status).toBe(403);
 expect((await request(app).get("/api/personal-neo/token")).status).toBe(405);
 expect((await request(app).post("/api/personal-neo/knowledge").set("Origin",origin).send({action:"instructions",query:"Manuale"})).status).toBe(503);
 expect((await request(app).post("/api/personal-neo/knowledge").set("Origin",origin).send({action:"look",query:"Vedi",image:"data:image/jpeg;base64,"+"a".repeat(900000)})).status).toBe(413);
});
