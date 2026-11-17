import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const assets = {
  "/index.html": readFileSync(path.join(root, "site", "index.html"), "utf8"),
  "/style.css": readFileSync(path.join(root, "site", "style.css"), "utf8"),
  "/app.js": readFileSync(path.join(root, "site", "app.js"), "utf8"),
  "/docs/WBS.md": readFileSync(path.join(root, "site", "docs", "WBS.md"), "utf8"),
  "/docs/놀다가_기획서.md": readFileSync(path.join(root, "site", "docs", "놀다가_기획서.md"), "utf8")
};
const handler = readFileSync(path.join(root, "worker", "handler.js"), "utf8");

rmSync(dist, { recursive: true, force: true });
mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
writeFileSync(path.join(dist, "server", "index.js"), `const STATIC_ASSETS = ${JSON.stringify(assets)};\n${handler}`);
writeFileSync(path.join(dist, ".openai", "hosting.json"), readFileSync(path.join(root, ".openai", "hosting.json")));
console.log(`Built ${dist}`);
