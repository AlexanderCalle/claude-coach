/**
 * Shared plan -> HTML rendering helpers.
 *
 * Used by both the CLI's `render` command (writes a static file) and the
 * plan server (renders the current plan on every request). Keeping this in
 * one place means both stay in lockstep with however `templates/plan-viewer.html`
 * expects its data injected.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Locate the built `plan-viewer.html` template. Checked relative to this
 * file (works both from `dist/lib/render-plan.js` in the published package
 * and in the Docker image) and relative to the current working directory
 * (works when running from a repo checkout).
 */
export function getTemplatePath(): string {
  const locations = [
    join(__dirname, "..", "..", "templates", "plan-viewer.html"),
    join(__dirname, "..", "templates", "plan-viewer.html"),
    join(process.cwd(), "templates", "plan-viewer.html"),
  ];

  for (const loc of locations) {
    try {
      readFileSync(loc);
      return loc;
    } catch {
      // Continue to next location
    }
  }

  throw new Error("Could not find plan-viewer.html template");
}

let cachedTemplate: string | null = null;

/** Read (and cache) the plan-viewer template contents. */
export function loadTemplate(): string {
  if (cachedTemplate === null) {
    cachedTemplate = readFileSync(getTemplatePath(), "utf-8");
  }
  return cachedTemplate;
}

const PLAN_DATA_REGEX = /<script type="application\/json" id="plan-data">[\s\S]*?<\/script>/;

/** Swap the template's `<script id="plan-data">` placeholder for real plan JSON. */
export function injectPlanData(template: string, planJson: string): string {
  const newPlanData = `<script type="application/json" id="plan-data">\n${planJson}\n</script>`;
  return template.replace(PLAN_DATA_REGEX, newPlanData);
}

/**
 * Strip the outer document shell (<!doctype>, <html>, <head>/<body> tags) so
 * the markup can be dropped into a host page that supplies its own - e.g. a
 * Claude Artifact, which wraps published content in its own <html>/<head>/<body>
 * skeleton and rejects a nested one. Everything inside <head> and <body> is
 * kept as-is.
 */
export function toArtifactFragment(html: string): string {
  return html
    .replace(/<!doctype\s+html\s*>/i, "")
    .replace(/<html[^>]*>/i, "")
    .replace(/<\/html>/i, "")
    .replace(/<head[^>]*>/i, "")
    .replace(/<\/head>/i, "")
    .replace(/<body[^>]*>/i, "")
    .replace(/<\/body>/i, "")
    .trim();
}

/** Render a full plan-viewer HTML document (or fragment) for the given plan JSON. */
export function renderPlanHtml(planJson: string, opts: { fragment?: boolean } = {}): string {
  const rendered = injectPlanData(loadTemplate(), planJson);
  return opts.fragment ? toArtifactFragment(rendered) : rendered;
}
