import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "index.html",
  "features/rent-collection.html",
  "features/room-management.html",
  "features/contract-expiry.html",
  "features/overdue-notice.html",
  "features/move-out-dispute.html",
  "features/tenant-inquiry-response.html",
  "legal/privacy-policy.html",
  "legal/data-deletion.html",
];

test("each page gives its navigation landmarks unique accessible names", () => {
  for (const relativePath of pages) {
    const html = readFileSync(resolve(root, relativePath), "utf8");
    const labels = [...html.matchAll(/<nav\b[^>]*aria-label="([^"]+)"[^>]*>/g)].map(
      (match) => match[1].trim(),
    );
    const navCount = [...html.matchAll(/<nav\b/g)].length;

    assert.equal(labels.length, navCount, relativePath);
    assert.equal(new Set(labels).size, labels.length, relativePath);
    assert.ok(labels.every(Boolean), relativePath);
    assert.ok(labels.includes("메인 메뉴"), relativePath);
    assert.ok(labels.includes("약관 및 정책"), relativePath);
  }
});
