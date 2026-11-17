const test = require("node:test");
const assert = require("node:assert/strict");
const { readConfig, quote, remoteDir, files } = require("../scripts/deploy-hostgator");

const config = `HOSTGATOR_HOST=hosting.example\nHOSTGATOR_USER=owner\nHOSTGATOR_PORT=2222\nHOSTGATOR_REMOTE_DIR=${remoteDir}`;

test("production uploader refuses root, sibling and traversal destinations", () => {
  for (const destination of [
    "public_html/tocatlian.com",
    "public_html/tocatlian.com/apps/monaco",
    `${remoteDir}/../monaco`,
    `/${remoteDir}`,
  ]) {
    assert.throws(() => readConfig(config.replace(remoteDir, destination)), /restricted/);
  }
  assert.equal(readConfig(config).HOSTGATOR_REMOTE_DIR, remoteDir);
});

test("hosting values cannot inject SSH options or SFTP commands", () => {
  assert.throws(
    () => readConfig(config.replace("hosting.example", "-oProxyCommand=bad")),
    /Invalid HOSTGATOR_HOST/,
  );
  assert.throws(
    () => readConfig(config.replace("HOSTGATOR_USER=owner", "HOSTGATOR_USER=owner@other")),
    /Invalid HOSTGATOR_USER/,
  );
  assert.throws(() => quote("path\nput bad"), /newlines/);
  assert.equal(quote('a"b\\c'), '"a\\"b\\\\c"');
});

test("upload plan publishes HTML last and includes only app runtime files", () => {
  assert.equal(files.at(-1), "index.html");
  assert.ok(files.every((file) => !file.startsWith(".") && !file.includes("..")));
  assert.ok(!files.includes("README.md"));
});
