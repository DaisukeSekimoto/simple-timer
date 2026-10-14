import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const assetsDirectory = root + "assets";
const check = process.argv.includes("--check");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = `${directory}/${entry.name}`;
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return files.flat().sort();
}

function relativeUrl(filename) {
  return `./${relative(root, filename).split(sep).join("/")}`;
}

const result = await build({
  absWorkingDir: root,
  entryPoints: { styles: "assets/styles/index.css" },
  bundle: true,
  target: ["es2022"],
  charset: "utf8",
  outdir: "assets",
  write: false,
  legalComments: "none",
});
const outputs = new Map(
  result.outputFiles.map((file) => [file.path, file.contents]),
);
const assetFiles = await listFiles(assetsDirectory);
const appShellAssets = assetFiles
  .map(relativeUrl)
  .filter((path) => path.endsWith(".js") || path === "./assets/styles.css");
const appShell = [
  "./",
  "./index.html",
  ...appShellAssets,
  "./manifest.webmanifest",
  "./icon.svg",
];

const hash = createHash("sha256");
for (const filename of assetFiles) {
  hash.update(relativeUrl(filename));
  hash.update(outputs.get(filename) ?? (await readFile(filename)));
}
for (const filename of ["index.html", "manifest.webmanifest", "icon.svg"]) {
  hash.update(filename);
  hash.update(await readFile(new URL(`../${filename}`, import.meta.url)));
}
const workerTemplate = await readFile(
  new URL("./service-worker.template.js", import.meta.url),
  "utf8",
);
hash.update(workerTemplate);
hash.update(JSON.stringify(appShell));
const worker = workerTemplate
  .replace("__CACHE_VERSION__", hash.digest("hex").slice(0, 12))
  .replace("__APP_SHELL__", JSON.stringify(appShell, null, 2));
outputs.set(root + "service-worker.js", Buffer.from(worker));

await mkdir(assetsDirectory, { recursive: true });
for (const [filename, contents] of outputs) {
  if (check) {
    const existing = await readFile(filename).catch(() => Buffer.alloc(0));
    if (!existing.equals(Buffer.from(contents))) {
      throw new Error(
        `${filename}: npm run build で生成物を更新してください`,
      );
    }
  } else {
    await writeFile(filename, contents);
  }
}
console.log(
  check
    ? "Generated assets are current."
    : "Built stylesheet and versioned offline cache.",
);
