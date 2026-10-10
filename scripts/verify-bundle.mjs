import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const patterns = [
  /OPENAI_API_KEY/,
  /sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/,
  /server-only-test-key/,
  /realtime\/client_secrets/,
];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (/\.(js|html|css|json)$/.test(path)) {
      const content = await readFile(path, "utf8");
      if (patterns.some((pattern) => pattern.test(content)))
        throw new Error(`Server-only secret/configuration found in ${path}`);
    }
  }
}
await scan("dist");
const asset = await readFile("dist/models/RobotExpressive.glb");
if (asset.subarray(0, 4).toString() !== "glTF")
  throw new Error("Missing/invalid built GLB");
console.info(
  "Frontend bundle: no API-key/server endpoint markers; local GLB included.",
);
