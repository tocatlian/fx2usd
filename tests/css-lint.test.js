const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ESLint } = require("eslint");

const root = path.resolve(__dirname, "..");
const linter = new ESLint({ cwd: root });

const cases = [
  ["unknown properties", ".card { colro: red; }", "css/no-invalid-properties"],
  ["unknown at-rules", "@unknown;", "css/no-invalid-at-rules"],
  ["empty blocks", ".card {}", "css/no-empty-blocks"],
  ["duplicate imports", '@import "theme.css"; @import "theme.css";', "css/no-duplicate-imports"],
  [
    "duplicate keyframe selectors",
    "@keyframes fade { from { opacity: 0; } from { opacity: 1; } }",
    "css/no-duplicate-keyframe-selectors",
  ],
  ["missing font fallbacks", ".card { font-family: Arial; }", "css/font-family-fallbacks"],
  ["important declarations", ".card { color: red !important; }", "css/no-important"],
  ["impossible selectors", ".card:nth-child(0) { color: red; }", "css/no-unmatchable-selectors"],
];

for (const [name, source, ruleId] of cases) {
  test(`CSS lint rejects ${name}`, async () => {
    const [result] = await linter.lintText(source, { filePath: "lint-regression.css" });
    assert.ok(
      result.messages.some((message) => message.ruleId === ruleId && message.severity === 2),
      JSON.stringify(result.messages),
    );
  });
}

test("CSS lint rejects malformed syntax", async () => {
  const [result] = await linter.lintText(".card { color: red;", {
    filePath: "lint-regression.css",
  });
  assert.ok(result.fatalErrorCount > 0);
});

test("CSS lint accepts the app stylesheet and existing marker fallback", async () => {
  const [result] = await linter.lintText(fs.readFileSync(path.join(root, "styles.css"), "utf8"), {
    filePath: "styles.css",
  });
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
  assert.equal(result.warningCount, 0);
});

test("CSS lint keeps generated files and private audit evidence ignored", async () => {
  for (const directory of [".cache", "build", "coverage", "dist", "node_modules"]) {
    assert.equal(await linter.isPathIgnored(path.join(root, directory, "invalid.css")), true);
  }
  assert.equal(await linter.isPathIgnored(path.join(root, "styles.css")), false);
});

test("JavaScript rules still apply only to JavaScript", async () => {
  const [result] = await linter.lintText("const unused = 1;", {
    filePath: "scripts/lint-regression.js",
  });
  assert.ok(result.messages.some((message) => message.ruleId === "no-unused-vars"));
});
