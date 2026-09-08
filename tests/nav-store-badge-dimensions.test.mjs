import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "features/rent-collection.html",
  "features/small-landlord-app.html",
  "features/contract-expiry.html",
  "features/overdue-notice.html",
];

test("navigation store badges share the asset-aligned 136 by 41 dimensions", () => {
  const styles = readFileSync(resolve(root, "assets/styles.css"), "utf8");
  const navRule = styles.match(/\.nav-store-badge\s*\{([^}]*)\}/s)?.[1] || "";

  assert.match(navRule, /width:\s*136px;/);
  assert.match(navRule, /height:\s*41px;/);

  for (const relativePath of pages) {
    const html = readFileSync(resolve(root, relativePath), "utf8");
    const badge = html.match(
      /<a\b[^>]*class="[^"]*nav-store-badge[^"]*"[\s\S]*?<\/a>/,
    )?.[0];

    assert.ok(badge, relativePath);
    assert.match(badge, /width="136"/);
    assert.match(badge, /height="41"/);
    assert.doesNotMatch(badge, /height="53"/);
  }
});
