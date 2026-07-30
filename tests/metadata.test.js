const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

const canonicalUrl = "https://www.tocatlian.com/apps/fx/";
const description =
  "Convert foreign currency amounts to USD with live exchange rates, manual overrides, cached rates, and banknote references.";
const socialImage =
  "https://www.tocatlian.com/img/fx2usd-currency-exchange-app-desktop-screenshot.jpg";

test("declares one canonical URL and permits indexing", () => {
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonicalUrl}"`));
  assert.match(
    html,
    /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/,
  );
});

test("keeps search and social metadata aligned", () => {
  assert.ok(html.includes(`name="description"\n      content="${description}"`));
  assert.ok(html.includes(`property="og:description"\n      content="${description}"`));
  assert.ok(html.includes(`name="twitter:description"\n      content="${description}"`));
  assert.ok(html.includes(`<meta property="og:url" content="${canonicalUrl}"`));
  assert.ok(html.includes(`property="og:image"\n      content="${socialImage}"`));
  assert.ok(html.includes(`name="twitter:image"\n      content="${socialImage}"`));
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(html, /<meta property="og:image:width" content="1440"/);
  assert.match(html, /<meta property="og:image:height" content="1000"/);
});
