import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stores = {
  "app-store": "https://apps.apple.com/kr/app/id6804934479",
  "google-play": "https://play.google.com/store/apps/details?id=com.landy.app",
};
const pages = [
  "index.html",
  "features/rent-collection.html",
  "features/small-landlord-app.html",
  "features/contract-expiry.html",
  "features/overdue-notice.html",
];

test("released pages offer both stores in the hero, download section, and mobile floating area", () => {
  for (const relativePath of pages) {
    const html = readFileSync(resolve(root, relativePath), "utf8");
    for (const [store, href] of Object.entries(stores)) {
      const anchors = [...html.matchAll(/<a\b[^>]*>/g)]
        .map((match) => match[0])
        .filter((anchor) => anchor.includes(`data-store="${store}"`));
      assert.equal(anchors.length, 3, `${relativePath}: ${store}`);
      for (const anchor of anchors) {
        assert.ok(anchor.includes(`href="${href}"`), relativePath);
        assert.match(anchor, /target="_blank"/);
        assert.match(anchor, /rel="noopener noreferrer"/);
        assert.match(anchor, /data-beta-location="(?:hero|beta_section|feature_bottom|floating_bottom)"/);
        assert.doesNotMatch(anchor, /data-store-status/);
      }
    }
    assert.doesNotMatch(html, /floating-beta-cta|nav-store-badge/);
  }
});

test("legal pages offer a home link without store promotions", () => {
  for (const page of ["legal/privacy-policy.html", "legal/data-deletion.html"]) {
    const html = readFileSync(resolve(root, page), "utf8");
    assert.match(html, /href="\/" aria-label="랜디 홈"/);
    assert.doesNotMatch(html, /href="https:\/\/(?:play\.google\.com|apps\.apple\.com)/);
  }
});
