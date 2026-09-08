import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const playHref =
  "https://play.google.com/store/apps/details?id=com.landy.app";
const pages = new Map([
  ["features/rent-collection.html", 3],
  ["features/small-landlord-app.html", 3],
  ["features/contract-expiry.html", 3],
  ["features/overdue-notice.html", 3],
]);

test("released pages consistently direct download CTAs to Google Play", () => {
  for (const [relativePath, expectedCount] of pages) {
    const html = readFileSync(resolve(root, relativePath), "utf8");
    const playAnchors = [...html.matchAll(/<a\b[^>]*>/g)]
      .map((match) => match[0])
      .filter((anchor) => anchor.includes(`href="${playHref}"`));

    assert.equal(playAnchors.length, expectedCount, relativePath);
    assert.doesNotMatch(html, /href="\/#beta"/);
    assert.doesNotMatch(html, />\s*(?:무료 )?베타 신청하기\s*</);

    for (const anchor of playAnchors) {
      assert.match(anchor, /target="_blank"/);
      assert.match(anchor, /rel="noopener noreferrer"/);
    }
  }
});
