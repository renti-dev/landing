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
];

test("every marketing navigation link resolves to a real page and section", () => {
  for (const page of pages) {
    const html = readFileSync(resolve(root, page), "utf8");
    const nav = html.match(/<nav\b[^>]*data-site-nav[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav, page);
    const links = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(links.slice(0, 4), ["/", "/#features", "/#how", "/#faq"], page);
    for (const href of links) {
      const url = new URL(href, `https://www.landy.co.kr/${page}`);
      const target = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
      const targetHtml = readFileSync(resolve(root, target), "utf8");
      if (url.hash) assert.ok(targetHtml.includes(`id="${url.hash.slice(1)}"`), `${page}: ${href}`);
    }
    assert.match(nav, /aria-expanded="false"/);
    assert.match(nav, /aria-controls="site-menu"/);
    assert.match(nav, /id="site-menu"/);
    assert.match(html, /src="(?:\.\.\/)?assets\/navigation\.js" defer/);
  }
});

test("beta pages identify their status before the first heading and link to their form", () => {
  for (const page of pages.slice(-2)) {
    const html = readFileSync(resolve(root, page), "utf8");
    assert.ok(html.indexOf('class="beta-hero-label"') < html.indexOf("<h1>"), page);
    assert.match(html, /href="#beta" data-beta-location="nav">베타 신청<\/a>/);
    assert.match(html, /id="signupForm"/);
    assert.match(html, /action="\/api\/beta-signup"/);
  }
});

test("home keeps the previous download fragment and puts features before previews", () => {
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  assert.ok(html.indexOf('id="features"') < html.indexOf('id="how"'));
  assert.match(html, /id="download"/);
  assert.match(html, /id="beta"/);
});
