const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { build, staticFiles } = require("../scripts/build");

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fx2usd-build-"));
  t.after(() => fs.rmSync(directory, { force: true, recursive: true }));
  for (const file of staticFiles) {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(__dirname, "..", file), target);
  }
  return directory;
}

function hash(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
}

function assetUrls(html) {
  return [...html.matchAll(/\b(?:src|href)="([^"]+\?v=[a-f0-9]+)"/g)].map((match) => match[1]);
}

function precache(directory) {
  const worker = fs.readFileSync(path.join(directory, "sw.js"), "utf8");
  return JSON.parse(worker.match(/const STATIC_ASSETS = (\[[\s\S]*?\]);/)[1]);
}

test("production HTML and manifest reference content hashes while PWA identity stays stable", (t) => {
  const source = fixture(t);
  const dist = build(source);
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(dist, "manifest.webmanifest"), "utf8"));
  const sourceManifest = JSON.parse(
    fs.readFileSync(path.join(source, "manifest.webmanifest"), "utf8"),
  );
  const urls = [
    ...assetUrls(html),
    ...manifest.icons.map((icon) => icon.src),
    ...manifest.screenshots.map((image) => image.src),
  ];
  assert.ok(urls.some((url) => url.startsWith("app.js?v=")));
  assert.ok(urls.some((url) => url.startsWith("styles.css?v=")));
  assert.ok(urls.some((url) => url.startsWith("manifest.webmanifest?v=")));
  for (const url of urls) {
    const parsed = new URL(url, "https://example.test/");
    assert.equal(parsed.searchParams.get("v"), hash(path.join(dist, parsed.pathname.slice(1))));
  }
  for (const key of ["id", "scope", "start_url"]) assert.equal(manifest[key], sourceManifest[key]);
  assert.ok(html.includes('href="https://www.tocatlian.com/apps/fx/"'));
});

test("worker precaches the same asset URLs requested by production HTML and manifest", (t) => {
  const dist = build(fixture(t));
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(dist, "manifest.webmanifest"), "utf8"));
  const expected = new Set([
    "./",
    ...assetUrls(html),
    ...manifest.icons.map((icon) => icon.src),
    ...manifest.screenshots.map((image) => image.src),
  ]);
  assert.deepEqual(new Set(precache(dist)), expected);
});

test("changing script bytes changes its HTML and offline-cache URL", (t) => {
  const source = fixture(t);
  const first = build(source);
  const oldUrl = assetUrls(fs.readFileSync(path.join(first, "index.html"), "utf8")).find((url) =>
    url.startsWith("app.js?"),
  );
  fs.appendFileSync(path.join(source, "app.js"), "\n// Changed release bytes\n");
  const second = build(source);
  const newUrl = assetUrls(fs.readFileSync(path.join(second, "index.html"), "utf8")).find((url) =>
    url.startsWith("app.js?"),
  );
  assert.notEqual(oldUrl, newUrl);
  assert.ok(precache(second).includes(newUrl));
  assert.ok(!precache(second).includes(oldUrl));
});

test("changing an icon also changes the parent manifest URL", (t) => {
  const source = fixture(t);
  const first = build(source);
  const before = assetUrls(fs.readFileSync(path.join(first, "index.html"), "utf8")).find((url) =>
    url.startsWith("manifest.webmanifest?"),
  );
  fs.appendFileSync(path.join(source, "icon-512.png"), "changed fixture bytes");
  const second = build(source);
  const after = assetUrls(fs.readFileSync(path.join(second, "index.html"), "utf8")).find((url) =>
    url.startsWith("manifest.webmanifest?"),
  );
  assert.notEqual(before, after);
});
