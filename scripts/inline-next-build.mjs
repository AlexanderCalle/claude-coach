#!/usr/bin/env node
// Inlines a Next.js static export (src/viewer/out/) into a single
// self-contained HTML file at templates/plan-viewer.html - the same shape
// vite-plugin-singlefile produced for the old Vite/Svelte build. The CLI's
// `render` command reads this template and swaps its <script id="plan-data">
// placeholder for the real plan JSON.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = join(repoRoot, "src", "viewer", "out");
const indexHtmlPath = join(outDir, "index.html");
const templateDir = join(repoRoot, "templates");
const outputPath = join(templateDir, "plan-viewer.html");

if (!existsSync(indexHtmlPath)) {
  console.error(`Could not find ${indexHtmlPath} - did "next build src/viewer" run first?`);
  process.exit(1);
}

const html = readFileSync(indexHtmlPath, "utf-8");

function readLocalAsset(href) {
  // href looks like "/_next/static/chunks/main-xxx.js"
  return readFileSync(join(outDir, href.replace(/^\//, "")), "utf-8");
}

// Match every local-asset <script src="/_next/...">, <link rel="stylesheet"
// href="/_next/...">, and <link rel="preload|modulepreload" href="/_next/...">
// tag IN ONE PASS over the original, untouched HTML. This matters: once a
// script is inlined its body is raw JS text sitting inside the output HTML,
// and that JS (Next's own chunk-loading/prefetch runtime) contains string
// literals that themselves look like these same tags - a second regex pass
// over the *already-inlined* output would match text inside that JS instead
// of real markup and corrupt it. A single combined pass over the original
// text never sees that generated content, so it can't happen.
const assetTagPattern =
  /<script([^>]*)\ssrc="(\/_next\/[^"]+)"([^>]*)><\/script>|<link[^>]*\brel="stylesheet"[^>]*\shref="(\/_next\/[^"]+)"[^>]*\/?>|<link[^>]*\brel="(?:preload|modulepreload)"[^>]*\shref="\/_next\/[^"]+"[^>]*\/?>/g;

// `defer`/`async` only affect *external* scripts (ones with `src`) - per the
// HTML spec they're simply ignored on inline scripts, which always run
// synchronously at their position in the document. Next's chunks all sit in
// <head> and rely on `defer` to run after the page (including our own
// <script id="plan-data">/<script id="__NEXT_DATA__">, both in <body>) has
// parsed. So inlining them in place would make them run mid-<head>, before
// either of those exist, and Next's bootstrap crashes reading a null
// __NEXT_DATA__. Instead, pull every inlined script out of its original
// (now-inert) position and collect it, in original order, to be appended
// right before </body> - i.e. reproduce what `defer` used to guarantee.
const deferredScripts = [];

let inlined = html.replace(
  assetTagPattern,
  (match, scriptBefore, scriptSrc, scriptAfter, linkHref) => {
    if (scriptSrc !== undefined) {
      const attrs = `${scriptBefore} ${scriptAfter}`.replace(/\s+/g, " ").trim();
      deferredScripts.push(
        `<script${attrs ? " " + attrs : ""}>${readLocalAsset(scriptSrc)}</script>`
      );
      return "";
    }
    if (linkHref !== undefined) {
      return `<style>${readLocalAsset(linkHref)}</style>`;
    }
    // A preload/modulepreload hint for a local chunk - meaningless once that
    // chunk is inlined above (and there's no separate file left to fetch).
    return "";
  }
);

if (!inlined.includes("</body>")) {
  console.error("Could not find </body> in the exported HTML to append scripts before.");
  process.exit(1);
}
// Passing a function (rather than a string) as the replacement means the
// scripts are spliced in literally - a string replacement would instead
// treat "$$" sequences in that giant blob of minified JS (React's `$$typeof`
// marker appears constantly) as replace()'s "insert a literal $" pattern,
// silently corrupting the code.
inlined = inlined.replace("</body>", () => `${deferredScripts.join("")}</body>`);

// Sanity check: nothing referencing a local /_next/ asset should remain.
const stragglers = inlined.match(/(?:src|href)="\/_next\/[^"]+"/g);
if (stragglers) {
  console.error("Some local Next.js assets were not inlined:", stragglers);
  process.exit(1);
}

mkdirSync(templateDir, { recursive: true });
writeFileSync(outputPath, inlined);
console.log(`Inlined Next.js build into ${outputPath}`);
