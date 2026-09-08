import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const normalize = (value) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("visible FAQs and search metadata contain the same questions and answers", () => {
  for (const page of ["index.html", "features/rent-collection.html"]) {
    const html = readFileSync(resolve(root, page), "utf8");
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const faq = data["@graph"].find((entry) => entry["@type"] === "FAQPage");
    const visible = [...html.matchAll(/<details class="faq-item"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)]
      .map((match) => ({ question: normalize(match[1]), answer: normalize(match[2]) }));
    const indexed = faq.mainEntity.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text }));
    assert.deepEqual(visible, indexed, page);
  }
});

test("home FAQ explains platform support, permissions, current pricing, SMS, and beta access", () => {
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  const faq = html.match(/<section[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/)[1];
  for (const term of ["iOS", "Android", "알림 접근 권한", "지원 은행", "기본 문자 앱", "직접 발송", "기본 기능은 모두 무료", "통신사 요금제", "베타 참여"]) {
    assert.ok(faq.includes(term), term);
  }
  assert.doesNotMatch(faq, /무료로 제공할 예정|준비하고 있습니다/);
});
