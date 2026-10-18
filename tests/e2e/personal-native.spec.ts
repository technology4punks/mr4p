import {test,expect} from "@playwright/test";
test("native iPhone project has a separate public page without requesting capture",async({page})=>{
 let captures=0;
 await page.exposeFunction("captureRequested",()=>{captures++});
 await page.addInitScript(()=>Object.defineProperty(navigator,"mediaDevices",{value:{getUserMedia:async()=>{await (window as unknown as {captureRequested:()=>Promise<void>}).captureRequested();throw new DOMException("denied","NotAllowedError")}}}));
 await page.goto("/personal-neo");
 await expect(page.getByRole("heading",{name:"Il mondo reale. In buona compagnia."})).toBeVisible();
 await expect(page.getByRole("link",{name:"Apri il progetto iPhone ↗"})).toHaveAttribute("href",/codex\/my-personal-neo\/ios/);
 await expect(page.getByText("Installazione da Xcode",{exact:false})).toBeVisible();
 expect(captures).toBe(0);
 const header=await page.locator(".pn-root header").boundingBox();expect(header!.width).toBeGreaterThan(page.viewportSize()!.width*0.8);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);expect(overflow).toBe(false);
 await page.screenshot({path:`test-results/personal-native-${test.info().project.name}.png`,fullPage:true});
});
