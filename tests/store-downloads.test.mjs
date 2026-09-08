import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
test("legal pages offer a home link without store promotions", () => {
  for (const page of ["legal/privacy-policy.html", "legal/data-deletion.html"]) {
    const html = readFileSync(resolve(root, page), "utf8");
    assert.match(html, /href="\/" aria-label="랜디 홈"/);
    assert.doesNotMatch(html, /href="https:\/\/(?:play\.google\.com|apps\.apple\.com)/);
  }
});
