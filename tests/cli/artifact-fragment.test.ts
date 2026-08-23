import { describe, it, expect } from "vitest";

/**
 * Mirrors toArtifactFragment() in src/cli.ts (the `render --fragment` output),
 * which strips the outer <!doctype>/<html>/<head>/<body> document shell so the
 * rendered plan can be dropped into a host page that supplies its own - e.g.
 * a Claude Artifact.
 */
function toArtifactFragment(html: string): string {
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

const sampleDocument = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Training Plan</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit" rel="stylesheet" />
    <script type="module">console.log("app bundle");</script>
  </head>
  <body>
    <div id="app"></div>
    <script>console.log("seed localStorage");</script>
  </body>
</html>
`;

describe("toArtifactFragment", () => {
  const fragment = toArtifactFragment(sampleDocument);

  it("removes the doctype and outer html tag", () => {
    expect(fragment).not.toMatch(/<!doctype/i);
    expect(fragment).not.toMatch(/<html[\s>]/i);
    expect(fragment).not.toMatch(/<\/html>/i);
  });

  it("removes the head and body wrapper tags", () => {
    expect(fragment).not.toMatch(/<head[\s>]/i);
    expect(fragment).not.toMatch(/<\/head>/i);
    expect(fragment).not.toMatch(/<body[\s>]/i);
    expect(fragment).not.toMatch(/<\/body>/i);
  });

  it("keeps everything that was inside head and body", () => {
    expect(fragment).toContain("<title>Training Plan</title>");
    expect(fragment).toContain("fonts.googleapis.com");
    expect(fragment).toContain('<script type="module">console.log("app bundle");</script>');
    expect(fragment).toContain('<div id="app"></div>');
    expect(fragment).toContain('console.log("seed localStorage");');
  });
});
