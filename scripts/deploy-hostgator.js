"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const remoteDir = "public_html/tocatlian.com/apps/fx";
const publicUrl = "https://www.tocatlian.com/apps/fx/";
const files = [
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "icon-512.png",
  "docs/screenshot.jpg",
  "sw.js",
  "index.html",
];

function quote(value) {
  if (/[\r\n]/.test(value)) throw new Error("SFTP values cannot contain newlines");
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readConfig(text) {
  const config = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Z_]+)=(.*)$/.exec(trimmed);
    if (!match) throw new Error("Invalid hosting configuration line");
    let value = match[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    config[match[1]] = value;
  }
  if (config.HOSTGATOR_REMOTE_DIR !== remoteDir) {
    throw new Error(`Deployment is restricted to ${remoteDir}`);
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(config.HOSTGATOR_HOST || "")) {
    throw new Error("Invalid HOSTGATOR_HOST");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(config.HOSTGATOR_USER || "")) {
    throw new Error("Invalid HOSTGATOR_USER");
  }
  if (config.HOSTGATOR_PORT !== "2222") throw new Error("Expected shared-host port 2222");
  return config;
}

function inventory(directory, prefix = "") {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Refusing a symlink in release files");
    if (entry.isDirectory()) result.push(...inventory(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
  return result.stdout || "";
}

function main() {
  const apply = process.argv.includes("--apply");
  if (process.argv.slice(2).some((arg) => arg !== "--apply")) {
    throw new Error("Usage: node scripts/deploy-hostgator.js [--apply]");
  }
  const config = readConfig(fs.readFileSync(path.join(root, ".env.hostgator"), "utf8"));
  if (!apply) {
    console.log(
      `Plan: validate, back up, upload ${files.length} files to ${remoteDir}, verify HTTPS`,
    );
    console.log("No connection or upload performed. Use npm run deploy:hostgator to apply.");
    return;
  }
  const cache = path.join(root, ".cache");
  fs.mkdirSync(cache, { recursive: true });
  const lock = path.join(cache, "deploy-hostgator.lock");
  if (
    fs.existsSync(path.join(os.homedir(), "Library/Caches/fx2usd-maintenance/maintenance.lock"))
  ) {
    throw new Error("FX2USD maintenance is running");
  }
  fs.mkdirSync(lock);
  const releaseId = new Date().toISOString().replace(/[:.]/g, "-");
  const release = path.join(cache, "hostgator-releases", releaseId);
  fs.mkdirSync(release, { recursive: true, mode: 0o700 });
  const receipt = {
    startedAt: new Date().toISOString(),
    publicUrl,
    remoteDir,
    status: "preparing",
  };
  const save = () =>
    fs.writeFileSync(path.join(release, "receipt.json"), JSON.stringify(receipt, null, 2));
  const sftp = (batch, name) => {
    const args = [
      "-b",
      "-",
      "-P",
      "2222",
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=20",
      "-o",
      "StrictHostKeyChecking=yes",
    ];
    if (config.HOSTGATOR_SSH_KEY) {
      const key = config.HOSTGATOR_SSH_KEY.replace(/^~\//, `${os.homedir()}/`);
      args.push("-i", key, "-o", "IdentitiesOnly=yes");
    }
    args.push(`${config.HOSTGATOR_USER}@${config.HOSTGATOR_HOST}`);
    const result = spawnSync("sftp", args, {
      input: `cd ${quote(remoteDir)}\n${batch}`,
      encoding: "utf8",
      timeout: 120000,
    });
    fs.writeFileSync(
      path.join(release, `${name}.log`),
      `${result.stdout || ""}\n${result.stderr || ""}`,
    );
    if (result.error || result.status !== 0)
      throw new Error(`SFTP ${name} failed. See private release log`);
  };
  try {
    save();
    run("npm", ["run", "check"], { stdio: "inherit" });
    receipt.commit = run("git", ["rev-parse", "HEAD"]).trim();
    if (run("git", ["status", "--porcelain"]).trim())
      throw new Error("Commit intended changes before deployment");
    const dist = path.join(root, "dist");
    const expected = [...files, ".nojekyll"].sort();
    if (JSON.stringify(inventory(dist)) !== JSON.stringify(expected))
      throw new Error("Unexpected build inventory");
    receipt.package = Object.fromEntries(
      files.map((file) => [file, digest(path.join(dist, file))]),
    );
    const before = path.join(release, "before");
    fs.mkdirSync(before);
    sftp(`get -R . ${quote(before)}\n`, "backup");
    const backupFiles = inventory(before);
    if (!backupFiles.includes("index.html") || !backupFiles.includes("app.js"))
      throw new Error("Incomplete backup");
    receipt.backup = Object.fromEntries(
      backupFiles.map((file) => [file, digest(path.join(before, file))]),
    );
    const preflight = path.join(release, "preflight.body");
    run("curl", ["-fsS", "--max-time", "30", "-o", preflight, `${publicUrl}?release=${releaseId}`]);
    if (digest(preflight) !== receipt.backup["index.html"]) {
      throw new Error("Remote backup does not match the canonical HTTP target");
    }
    let restore = backupFiles
      .map((file) => `put ${quote(path.join(before, file))} ${quote(file)}`)
      .join("\n");
    if (!backupFiles.includes("sw.js")) {
      const rollbackWorker = path.join(release, "rollback-worker.body");
      fs.writeFileSync(
        rollbackWorker,
        [
          'self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));',
          'self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("fx2usd-app-v")).map((name) => caches.delete(name)))).then(() => self.clients.claim()).then(() => self.registration.unregister())));',
        ].join("\n"),
      );
      restore += `\nput ${quote(rollbackWorker)} "sw.js"`;
    }
    fs.writeFileSync(path.join(release, "rollback.sftp"), `cd ${quote(remoteDir)}\n${restore}\n`);
    receipt.status = "uploading";
    save();
    sftp(
      `-mkdir docs\n${files.map((file) => `put ${quote(path.join(dist, file))} ${quote(file)}`).join("\n")}\n`,
      "upload",
    );
    const after = path.join(release, "after");
    fs.mkdirSync(after);
    sftp(
      files
        .map((file, index) => `get ${quote(file)} ${quote(path.join(after, `${index}.body`))}`)
        .join("\n") + "\n",
      "verify",
    );
    const https = path.join(release, "https");
    fs.mkdirSync(https);
    for (const [index, file] of files.entries()) {
      if (digest(path.join(after, `${index}.body`)) !== receipt.package[file])
        throw new Error(`SFTP mismatch: ${file}`);
      const target = path.join(https, `${index}.body`);
      run("curl", [
        "-fsS",
        "--max-time",
        "30",
        "-o",
        target,
        `${publicUrl}${file === "index.html" ? "" : file}?release=${releaseId}`,
      ]);
      if (digest(target) !== receipt.package[file]) throw new Error(`HTTPS mismatch: ${file}`);
    }
    receipt.status = "verified";
    receipt.completedAt = new Date().toISOString();
    save();
    console.log(
      `Verified ${files.length} production files. Receipt: ${path.relative(root, release)}/receipt.json`,
    );
  } catch (error) {
    receipt.status = "failed";
    receipt.error = error.message;
    save();
    throw error;
  } finally {
    fs.rmdirSync(lock);
  }
}

module.exports = { readConfig, quote, remoteDir, files };
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
