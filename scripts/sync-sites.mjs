// Apply the reviewable Sites overlay to an already-opened Site source checkout.
// Source repository authentication/publishing remains the official Sites workflow.
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
const target = process.argv[2];
if (!target)
  throw new Error("Usage: node scripts/sync-sites.mjs /path/to/existing/site");
const root = resolve(target);
const hosting = JSON.parse(
  await readFile(resolve(root, ".openai/hosting.json"), "utf8"),
);
await rm(resolve(root, "src"), { recursive: true, force: true });
await cp("src", resolve(root, "src"), { recursive: true });
const app = resolve(root, "src/App.tsx");
await writeFile(app, '"use client";\n' + (await readFile(app, "utf8")));
await cp("deploy/sites", root, { recursive: true });
await cp("server/personal", resolve(root, "lib/personal"), {recursive:true});
await cp("server/story-config.ts", resolve(root, "lib/story-config.ts"));
for (const name of ["config", "knowledge"]) {
 const file = resolve(root, `lib/personal/${name}.ts`);
 await writeFile(file, (await readFile(file,"utf8")).replaceAll('../../src/personal/protocol.js','../../src/personal/protocol'));
}
for (const file of ["README.md", "AGENTS.md", "SPEC.md", "ASSET_CREDITS.md"])
  await cp(file, resolve(root, file));
await rm(resolve(root, "docs"), { recursive: true, force: true });
await cp("docs", resolve(root, "docs"), { recursive: true });
await rm(resolve(root,"ios"),{recursive:true,force:true});
await cp("ios", resolve(root, "ios"), {recursive:true});
await rm(resolve(root,"public/models/personal-neo"),{recursive:true,force:true});
await cp("public/models/personal-neo",resolve(root,"public/models/personal-neo"),{recursive:true});
await mkdir(resolve(root, "tests"), { recursive: true });
// Existing backend-specific tests stay in the Site; copy only browser/shared engines.
for (const file of [
  "animation-state",
  "companion",
  "environmental-planting",
  "humanoid-asset",
  "observatory",
  "placement",
  "realtime-client",
  "story-engine",
  "transit-motion",
  "ui3d",
  "xr-session",
  "decision-engine",
  "city-plan",
  "guided-visit",
  "experience-recorder",
])
  await cp(`tests/${file}.test.ts`, resolve(root, `tests/${file}.test.ts`));
await rm(resolve(root, "tests/environmental-scenery.test.ts"), { force: true });
await writeFile(
  resolve(root, ".openai/hosting.json"),
  JSON.stringify({ ...hosting, d1: "DB" }, null, 2) + "\n",
);
console.info(
  "Shared V4 source and Sites overlay synchronized; project identity and runtime secrets preserved.",
);
