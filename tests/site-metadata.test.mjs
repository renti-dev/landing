import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "index.html");
const html = readFileSync(indexPath, "utf8");
const canonicalOrigin = "https://www.landy.co.kr";
const expectedTagline = "임대인의 시간을 아껴주는 임대관리 자동화 앱";
const expectedTitle = "랜디 | 임대인의 시간을 아껴주는 월세관리 자동화 앱";
const publicPages = [
  ["index.html", "/"],
  ["features/rent-collection.html", "/features/rent-collection"],
  ["features/overdue-notice.html", "/features/overdue-notice"],
  [
    "features/tenant-inquiry-response.html",
    "/features/tenant-inquiry-response",
  ],
  ["features/contract-expiry.html", "/features/contract-expiry"],
  ["features/move-out-dispute.html", "/features/move-out-dispute"],
  ["features/room-management.html", "/features/room-management"],
  ["legal/privacy-policy.html", "/legal/privacy-policy"],
  ["legal/data-deletion.html", "/legal/data-deletion"],
];

const attributeValue = (tag, attribute) => {
  const pattern = new RegExp(`\\b${attribute}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1];
};

const metaContent = (source, attribute, value) => {
  const metaTag = [...source.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => attributeValue(tag, attribute) === value);

  return metaTag ? attributeValue(metaTag, "content") : undefined;
};

const canonicalHref = (source) => {
  const canonicalTag = [...source.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => attributeValue(tag, "rel") === "canonical");

  return canonicalTag ? attributeValue(canonicalTag, "href") : undefined;
};

const titleText = (source) =>
  source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim();

const pageHtmlEntries = publicPages.map(([relativePath, pathname]) => [
  relativePath,
  pathname,
  readFileSync(resolve(root, relativePath), "utf8"),
]);

const normalizedInternalPath = (href, sourcePathname) => {
  if (!href || href.startsWith("#")) return undefined;

  let target;
  try {
    target = new URL(href, new URL(sourcePathname, canonicalOrigin));
  } catch {
    return undefined;
  }

  if (target.origin !== canonicalOrigin) return undefined;

  const pathname = target.pathname.replace(/\.html$/, "").replace(/\/$/, "");
  return pathname || "/";
};

test("home metadata uses the requested Landy search and sharing title", () => {
  assert.match(html, new RegExp(`<title>${expectedTitle}</title>`));
  assert.equal(metaContent(html, "property", "og:site_name"), "랜디");
  assert.equal(metaContent(html, "property", "og:title"), expectedTitle);
  assert.equal(metaContent(html, "name", "twitter:title"), expectedTitle);
});

test("public pages have unique titles and descriptions with one non-empty H1", () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const [relativePath, , pageHtml] of pageHtmlEntries) {
    const title = titleText(pageHtml);
    const description = metaContent(pageHtml, "name", "description");
    const headings = [...pageHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    const headingText = headings[0]?.[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    assert.ok(title, `${relativePath}: expected a non-empty title`);
    assert.ok(description, `${relativePath}: expected a meta description`);
    assert.equal(headings.length, 1, `${relativePath}: expected exactly one H1`);
    assert.ok(headingText, `${relativePath}: expected a non-empty H1`);
    assert.ok(!titles.has(title), `${relativePath}: duplicate title: ${title}`);
    assert.ok(
      !descriptions.has(description),
      `${relativePath}: duplicate description: ${description}`,
    );

    titles.add(title);
    descriptions.add(description);
  }
});

test("every public page keeps canonical, Open Graph, and Twitter metadata aligned", () => {
  for (const [relativePath, pathname, pageHtml] of pageHtmlEntries) {
    const title = titleText(pageHtml);
    const canonical = canonicalHref(pageHtml);
    const expectedUrl = new URL(pathname, canonicalOrigin).href;
    const openGraphDescription = metaContent(
      pageHtml,
      "property",
      "og:description",
    );
    const openGraphImage = metaContent(pageHtml, "property", "og:image");

    assert.equal(canonical, expectedUrl, relativePath);
    assert.equal(metaContent(pageHtml, "property", "og:url"), expectedUrl);
    assert.equal(metaContent(pageHtml, "property", "og:site_name"), "랜디");
    assert.equal(metaContent(pageHtml, "property", "og:title"), title);
    assert.equal(metaContent(pageHtml, "name", "twitter:title"), title);
    assert.ok(
      openGraphDescription,
      `${relativePath}: expected an Open Graph description`,
    );
    assert.equal(
      metaContent(pageHtml, "name", "twitter:description"),
      openGraphDescription,
      `${relativePath}: social descriptions must match`,
    );
    assert.ok(openGraphImage, `${relativePath}: expected an Open Graph image`);
    assert.equal(
      metaContent(pageHtml, "name", "twitter:image"),
      openGraphImage,
      `${relativePath}: social images must match`,
    );
    assert.equal(
      metaContent(pageHtml, "name", "twitter:card"),
      "summary_large_image",
      relativePath,
    );
    assert.equal(metaContent(pageHtml, "name", "robots"), "index,follow");
    assert.doesNotMatch(pageHtml, /landing\.landy\.co\.kr/, relativePath);
  }
});

test("every public page contains parseable JSON-LD", () => {
  for (const [relativePath, , pageHtml] of pageHtmlEntries) {
    const jsonLdBlocks = [
      ...pageHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
    ]
      .filter(
        (match) => attributeValue(match[1], "type") === "application/ld+json",
      )
      .map((match) => match[2]);

    assert.ok(jsonLdBlocks.length > 0, `${relativePath}: expected JSON-LD`);

    for (const [index, jsonLd] of jsonLdBlocks.entries()) {
      let structuredData;
      assert.doesNotThrow(() => {
        structuredData = JSON.parse(jsonLd);
      }, `${relativePath}: JSON-LD block ${index + 1} must be valid JSON`);
      assert.equal(
        structuredData["@context"],
        "https://schema.org",
        `${relativePath}: JSON-LD block ${index + 1} must use schema.org`,
      );
    }
  }
});

test("crawl configuration publishes only the production domain", () => {
  const robots = readFileSync(resolve(root, "robots.txt"), "utf8");
  const sitemap = readFileSync(resolve(root, "sitemap.xml"), "utf8");
  const vercel = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  const expectedUrls = publicPages.map(([, pathname]) =>
    new URL(pathname, canonicalOrigin).href,
  );
  const redirectForHost = (host) =>
    vercel.redirects?.find((redirect) =>
      redirect.has?.some(
        (condition) => condition.type === "host" && condition.value === host,
      ),
    );

  assert.match(robots, /Sitemap: https:\/\/www\.landy\.co\.kr\/sitemap\.xml/);
  assert.equal(
    new Set(sitemapUrls).size,
    sitemapUrls.length,
    "sitemap must not contain duplicate URLs",
  );
  assert.deepEqual(
    [...sitemapUrls].sort(),
    [...expectedUrls].sort(),
    "sitemap and public page list must contain exactly the same URLs",
  );
  assert.doesNotMatch(`${robots}\n${sitemap}`, /landing\.landy\.co\.kr/);
  for (const host of ["landy.co.kr", "landing.landy.co.kr"]) {
    const redirect = redirectForHost(host);

    assert.equal(redirect?.destination, "https://www.landy.co.kr/:path*");
    assert.equal(redirect?.permanent, true);
  }

  const legacyIndexRedirect = vercel.redirects?.find(
    (redirect) => redirect.source === "/index.php",
  );
  assert.equal(
    legacyIndexRedirect?.destination,
    `${canonicalOrigin}/`,
    "legacy index.php must resolve directly to the canonical homepage",
  );
  assert.equal(legacyIndexRedirect?.permanent, true);
});

test("every public page is linked from another public page", () => {
  const publicPathnames = new Set(publicPages.map(([, pathname]) => pathname));
  const inboundLinks = new Map(
    [...publicPathnames].map((pathname) => [pathname, new Set()]),
  );

  for (const [relativePath, sourcePathname, pageHtml] of pageHtmlEntries) {
    const hrefs = [
      ...pageHtml.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi),
    ]
      .map((match) => normalizedInternalPath(match[1], sourcePathname))
      .filter(Boolean);

    for (const targetPathname of hrefs) {
      if (
        publicPathnames.has(targetPathname) &&
        targetPathname !== sourcePathname
      ) {
        inboundLinks.get(targetPathname).add(relativePath);
      }
    }
  }

  for (const [pathname, sources] of inboundLinks) {
    assert.ok(
      sources.size > 0,
      `${pathname}: expected an inbound link from another public page`,
    );
  }
});

test("reference artifacts are excluded from Vercel deployments", () => {
  const vercelIgnorePath = resolve(root, ".vercelignore");
  assert.ok(existsSync(vercelIgnorePath), "expected a root .vercelignore file");

  const ignoredPaths = readFileSync(vercelIgnorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  assert.ok(
    ignoredPaths.some((entry) => entry.replace(/^\//, "") === "refs/"),
    ".vercelignore must exclude refs/",
  );
});

test("public pages do not preload the full Pretendard variable font", () => {
  for (const [relativePath, , pageHtml] of pageHtmlEntries) {
    const fontPreloads = [...pageHtml.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => match[0])
      .filter(
        (tag) =>
          attributeValue(tag, "rel") === "preload" &&
          attributeValue(tag, "href")?.includes("PretendardVariable.woff2"),
      );

    assert.equal(
      fontPreloads.length,
      0,
      `${relativePath}: the full variable font must not be preloaded`,
    );
  }
});

test("rent collection copy distinguishes matched automatic records from manual entry", () => {
  const rentCollectionHtml = readFileSync(
    resolve(root, "features/rent-collection.html"),
    "utf8",
  );

  assert.match(rentCollectionHtml, /Android에서는 입금자·금액·납부월이 등록 정보와 일치하는 내역을 자동으로 기록합니다/);
  assert.match(rentCollectionHtml, /자동으로 연결되지 않는 입금이나 현금 납부는 내역을 확인한 뒤 직접 등록/);
  assert.match(rentCollectionHtml, /iOS에서는 납부 내역을 직접 등록/);
});

test("home page displays the requested rental-management tagline", () => {
  assert.match(
    html,
    new RegExp(`<p class="hero-eyebrow">${expectedTagline}</p>`),
  );
  assert.doesNotMatch(html, /건물주를 위한 월세 수납 자동화 앱/);
});

test("WebSite structured data keeps the concise Landy site name", () => {
  const jsonLd = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(jsonLd);

  const graph = JSON.parse(jsonLd[1])["@graph"];
  const website = graph.find((item) => item["@type"] === "WebSite");

  assert.equal(website.name, "랜디");
  assert.equal(website.url, `${canonicalOrigin}/`);
  assert.deepEqual(website.alternateName, [
    "랜디 월세관리",
    "Landy",
    "landy.co.kr",
  ]);
});
