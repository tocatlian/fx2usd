const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { checkDependencyBundles } = require("../scripts/check-dependency-bundles");

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fx2usd-formatter-"));
  t.after(() => fs.rmSync(directory, { force: true, recursive: true }));
  fs.writeFileSync(path.join(directory, ".prettierrc.json"), '{"printWidth":100}\n');
  return directory;
}

test("standalone formatting preserves every maintained file type and embedded code", async () => {
  const { formatSource } = await import("../scripts/format.mjs");
  const cases = [
    ["app.js", "const x={a:1}", "const x = { a: 1 };\n"],
    ["script.mjs", "export const x=1", "export const x = 1;\n"],
    ["script.cjs", "module.exports={a:1}", "module.exports = { a: 1 };\n"],
    ["config.json", '{"a":1}', '{ "a": 1 }\n'],
    ["manifest.webmanifest", '{"name":"FX"}', '{ "name": "FX" }\n'],
    ["style.css", ".card{color:red}", ".card {\n  color: red;\n}\n"],
    ["index.html", "<div>hello</div>", "<div>hello</div>\n"],
    ["README.md", "# Heading\n\ntext", "# Heading\n\ntext\n"],
    ["ci.yml", "node: [22,24]", "node: [22, 24]\n"],
    ["ci.yaml", "node: [22,24]", "node: [22, 24]\n"],
  ];
  for (const [file, source, expected] of cases) {
    assert.equal(await formatSource(source, file, { printWidth: 100 }), expected, file);
  }
  const embedded = await formatSource("```js\nconst x={a:1}\n```\n", "README.md", {
    printWidth: 100,
  });
  assert.ok(embedded.includes("const x = { a: 1 };"));
  const embeddedHtml = await formatSource(
    "<style>.card{color:red}</style><script>const x={a:1}</script>",
    "index.html",
    { printWidth: 100 },
  );
  assert.ok(embeddedHtml.includes("color: red;"));
  assert.ok(embeddedHtml.includes("const x = { a: 1 };"));
});

test("file traversal treats extglob names literally and skips generated and symlinked paths", async (t) => {
  const { collectFiles } = await import("../scripts/format.mjs");
  const directory = fixture(t);
  const names = ["+(*).js", "+(*a).css", "*(a|aa).md", "[abc].json", "normal.js"];
  for (const name of names) fs.writeFileSync(path.join(directory, name), "");
  for (const name of [
    ".cache",
    "dist",
    "build",
    "coverage",
    "node_modules",
    "vendor",
    ".git",
    "docs/html",
  ]) {
    fs.mkdirSync(path.join(directory, name), { recursive: true });
    fs.writeFileSync(path.join(directory, name, "invalid.js"), "not formatted");
  }
  fs.symlinkSync(path.join(directory, "normal.js"), path.join(directory, "link.js"));
  fs.symlinkSync(path.join(directory, "docs"), path.join(directory, "linked-docs"));
  assert.deepEqual(collectFiles(directory), [".prettierrc.json", ...names].sort());
});

test("format check detects changes without writing and write is idempotent", async (t) => {
  const { formatProject } = await import("../scripts/format.mjs");
  const directory = fixture(t);
  const file = path.join(directory, "+(*).js");
  fs.writeFileSync(file, "const x=1");
  const before = fs.readFileSync(file, "utf8");
  assert.ok((await formatProject(directory, "--check")).changed.includes("+(*).js"));
  assert.equal(fs.readFileSync(file, "utf8"), before);
  await formatProject(directory, "--write");
  assert.equal(fs.readFileSync(file, "utf8"), "const x = 1;\n");
  assert.deepEqual((await formatProject(directory, "--check")).changed, []);
});

test("glob overrides, plugin loading and extra CLI input fail closed", async (t) => {
  const { readOptions } = await import("../scripts/format.mjs");
  const directory = fixture(t);
  for (const extra of [
    { overrides: [{ files: "+(*)", options: {} }] },
    { overrides: [{ files: "+(*a)", options: {} }] },
    { plugins: ["untrusted-plugin"] },
    { printWidth: "100" },
  ]) {
    fs.writeFileSync(
      path.join(directory, ".prettierrc.json"),
      JSON.stringify({ printWidth: 100, ...extra }),
    );
    assert.throws(() => readOptions(directory), /supports only/);
  }
  for (const args of [
    ["--check", "+(*)"],
    ["--config", "x.json"],
    ["--write", "../app.js"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, "../scripts/format.mjs"), ...args],
      {
        encoding: "utf8",
        timeout: 5000,
      },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Expected exactly/);
  }
});

test("dependency guard rejects standalone packages and hidden bundled implementations", (t) => {
  const directory = fixture(t);
  const vendor = path.join(directory, "vendor/prettier");
  fs.mkdirSync(vendor, { recursive: true });
  fs.mkdirSync(path.join(directory, "node_modules"));
  const source = "export const format = () => {};\n";
  fs.writeFileSync(path.join(vendor, "standalone.mjs"), source);
  fs.writeFileSync(
    path.join(vendor, "provenance.json"),
    JSON.stringify({
      files: { "standalone.mjs": crypto.createHash("sha256").update(source).digest("hex") },
    }),
  );
  const lock = path.join(directory, "package-lock.json");
  fs.writeFileSync(lock, JSON.stringify({ packages: {} }));
  const extraneous = path.join(directory, "node_modules/package.json");
  fs.writeFileSync(extraneous, JSON.stringify({ name: "picomatch", version: "2.3.2" }));
  assert.throws(() => checkDependencyBundles(directory), /Excluded installed dependency/);
  fs.unlinkSync(extraneous);
  assert.equal(checkDependencyBundles(directory), 1);
  for (const name of ["picomatch", "prettier", "stylelint"]) {
    fs.writeFileSync(
      lock,
      JSON.stringify({ packages: { [`node_modules/${name}`]: { version: "2.3.2" } } }),
    );
    assert.throws(() => checkDependencyBundles(directory), /Excluded dependency/);
  }
  fs.writeFileSync(lock, JSON.stringify({ packages: {} }));
  for (const source of [
    "// node_modules/picomatch/lib/parse.js",
    "const analyzeRepeatedExtglob = () => {};",
  ]) {
    fs.writeFileSync(path.join(directory, "node_modules/hidden-bundle.js"), source);
    assert.throws(() => checkDependencyBundles(directory), /implementation detected/);
  }
  fs.unlinkSync(path.join(directory, "node_modules/hidden-bundle.js"));
  fs.appendFileSync(path.join(vendor, "standalone.mjs"), "// modified\n");
  assert.throws(() => checkDependencyBundles(directory), /Unreviewed formatter artifact/);
});

test("actual installation and formatter artifact hashes pass the dependency guard", () => {
  assert.equal(checkDependencyBundles(), 9);
});
