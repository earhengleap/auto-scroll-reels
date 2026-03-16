import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";
import JavaScriptObfuscator from "javascript-obfuscator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");
const isProd = process.argv.includes("--prod");
const allowedExtensionIds = (process.env.ALLOWED_EXTENSION_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (isProd && allowedExtensionIds.length === 0) {
  throw new Error(
    "Production build requires ALLOWED_EXTENSION_IDS, e.g. ALLOWED_EXTENSION_IDS=abc123,def456"
  );
}

async function cleanDist() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
}

async function copyStaticFiles() {
  await copyFile(path.join(srcDir, "manifest.json"), path.join(distDir, "manifest.json"));
  await copyFile(path.join(srcDir, "popup.html"), path.join(distDir, "popup.html"));
  await mkdir(path.join(distDir, "icons"), { recursive: true });
  await Promise.all(
    ["16", "32", "48", "128"].map((size) =>
      copyFile(
        path.join(srcDir, "icons", `icon${size}.png`),
        path.join(distDir, "icons", `icon${size}.png`)
      )
    )
  );
}

function injectSecurityPlaceholders(code) {
  const serializedIds = JSON.stringify(allowedExtensionIds)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');

  return code
    .replaceAll("__ALLOWED_EXTENSION_IDS__", serializedIds)
    .replaceAll("__ENABLE_DEBUG_LOGS__", isProd ? "false" : "true");
}

async function processJsFile(fileName) {
  const sourcePath = path.join(srcDir, fileName);
  const distPath = path.join(distDir, fileName);
  const sourceCode = await readFile(sourcePath, "utf8");
  const injectedCode = injectSecurityPlaceholders(sourceCode);

  const minified = await minify(injectedCode, {
    compress: {
      drop_console: isProd,
      passes: isProd ? 2 : 1
    },
    mangle: isProd,
    format: {
      comments: false
    },
    sourceMap: false
  });

  if (!minified.code) {
    throw new Error(`Failed to minify ${fileName}`);
  }

  let outputCode = minified.code;

  if (isProd) {
    const obfuscated = JavaScriptObfuscator.obfuscate(outputCode, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      identifierNamesGenerator: "hexadecimal",
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 8,
      stringArray: true,
      stringArrayRotate: true,
      stringArrayThreshold: 1,
      transformObjectKeys: true,
      unicodeEscapeSequence: false
    });
    outputCode = obfuscated.getObfuscatedCode();
  }

  await writeFile(distPath, outputCode, "utf8");
}

async function build() {
  await cleanDist();
  await copyStaticFiles();
  await Promise.all([processJsFile("content.js"), processJsFile("popup.js")]);
  console.log(
    isProd
      ? "Production build created in dist/ (minified + obfuscated)."
      : "Development build created in dist/ (minified)."
  );
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
