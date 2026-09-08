import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const featurePages = [
  "features/rent-collection.html",
  "features/small-landlord-app.html",
  "features/contract-expiry.html",
  "features/overdue-notice.html",
];

test("released feature pages wire hero, bottom, and floating store CTAs to analytics", () => {
  for (const relativePath of featurePages) {
    const html = readFileSync(resolve(root, relativePath), "utf8");
    const trackedAnchors = [...html.matchAll(/<a\b[^>]*data-beta-location="([^"]+)"[^>]*>/g)];

    assert.match(html, /src="\.\.\/assets\/analytics\.js"/);
    assert.match(html, /src="\.\.\/assets\/amplitude\.js"/);
    assert.match(html, /src="\.\.\/assets\/app\.js" defer/);
    assert.deepEqual(
      trackedAnchors.map((match) => match[1]),
      ["hero", "hero", "feature_bottom", "feature_bottom", "floating_bottom", "floating_bottom"],
      relativePath,
    );
    assert.doesNotMatch(
      html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0] || "",
      /data-beta-location/,
    );
  }
});

function clickTrackedLink({ href, dataset = {}, isStoreBadge = false }) {
  let clickHandler;
  const gtagCalls = [];
  const amplitudeCalls = [];
  const link = {
    dataset: { betaLocation: "hero", ...dataset },
    classList: { contains: (name) => name === "store-badge" && isStoreBadge },
    getAttribute: (name) => (name === "href" ? href : null),
    addEventListener: (name, handler) => {
      if (name === "click") clickHandler = handler;
    },
  };
  const document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: (selector) =>
      selector === "[data-beta-location]" ? [link] : [],
  };
  const window = {
    addEventListener() {},
    document,
    innerHeight: 800,
    location: { search: "" },
    matchMedia: () => ({ matches: false }),
    trackAmplitude: (...args) => amplitudeCalls.push(args),
  };
  const context = {
    cancelAnimationFrame() {},
    clearTimeout() {},
    document,
    gtag: (...args) => gtagCalls.push(args),
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    setTimeout: () => 0,
    URLSearchParams,
    window,
  };
  context.globalThis = context;

  vm.runInContext(
    readFileSync(resolve(root, "assets/app.js"), "utf8"),
    vm.createContext(context),
  );
  clickHandler();

  return JSON.parse(JSON.stringify({ gtagCalls, amplitudeCalls }));
}

function assertClickEvents(result, storeEvent) {
  const baseParams = { button_location: "hero", source: "rent" };
  const gaParams = {
    campaign_goal: "demand_validation",
    feature_interest: "rent_collection",
    ...baseParams,
  };
  assert.deepEqual(result.gtagCalls, [
    ["event", "beta_apply_click", gaParams],
    ...(storeEvent ? [["event", storeEvent, gaParams]] : []),
  ]);
  assert.deepEqual(
    result.amplitudeCalls,
    storeEvent ? [[storeEvent, baseParams]] : [],
  );
}

test("legacy Google Play links preserve their funnel event and emit a GA store event", () => {
  assertClickEvents(
    clickTrackedLink({
      href: "https://play.google.com/store/apps/details?id=com.landy.app",
    }),
    "google_play_click",
  );
});

test("ready App Store badges are tracked separately from Google Play", () => {
  assertClickEvents(
    clickTrackedLink({
      href: "https://apps.apple.com/kr/app/id6804934479",
      dataset: { store: "app-store" },
      isStoreBadge: true,
    }),
    "app_store_click",
  );
});

test("non-store beta CTAs keep their existing GA event without a store event", () => {
  assertClickEvents(
    clickTrackedLink({ href: "#beta", isStoreBadge: true }),
    null,
  );
});
