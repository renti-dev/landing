import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const indexPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../index.html",
);
const html = readFileSync(indexPath, "utf8");

test("home page exposes one main landmark around all primary sections", () => {
  const mainMatches = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/g)];

  assert.equal(mainMatches.length, 1);
  assert.equal(
    [...mainMatches[0][1].matchAll(/<section\b/g)].length,
    [...html.matchAll(/<section\b/g)].length,
  );
  assert.ok(html.indexOf("</main>") < html.indexOf("<footer>"));
  assert.doesNotMatch(mainMatches[0][1], /<footer\b/);
  assert.doesNotMatch(mainMatches[0][1], /floating-beta-cta/);
});
