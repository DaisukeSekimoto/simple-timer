import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
const result = await build({
  absWorkingDir: root,
  entryPoints: { app: "src/main.js", styles: "src/styles/index.css" },
  bundle: true,
  format: "iife",
  target: ["es2022"],
  outdir: "assets",
  write: false,
  legalComments: "none",
});
const outputs = result.outputFiles.map((file) => [file.path, file.contents]);
const shell = ["index.html", "manifest.webmanifest", "icon.svg"];
const hash = createHash("sha256");
for (const [, contents] of outputs) hash.update(contents);
for (const filename of shell)
  hash.update(await readFile(new URL("../" + filename, import.meta.url)));
const worker = await readFile(
  new URL("./service-worker.template.js", import.meta.url),
  "utf8",
);
hash.update(worker);
outputs.push([
  root + "service-worker.js",
  worker.replace("__CACHE_VERSION__", hash.digest("hex").slice(0, 12)),
]);
await mkdir(root + "assets", { recursive: true });
for (const [filename, contents] of outputs) {
  if (check) {
    const existing = await readFile(filename).catch(() => Buffer.alloc(0));
    if (!existing.equals(Buffer.from(contents)))
      throw new Error(`${filename}: npm run build で生成物を更新してください`);
  } else await writeFile(filename, contents);
}
console.log(
  check
    ? "Generated assets are current."
    : "Built app, styles and versioned offline cache.",
);
