#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const realRun = args.has("--run");

if (dryRun === realRun) {
  console.error("Usage: node scripts/local-maintenance.js --dry-run|--run");
  process.exit(64);
}

const logDir =
  process.env.FX2USD_MAINTENANCE_LOG_DIR ||
  path.join(os.homedir(), "Library", "Logs", "fx2usd-maintenance");
const lockParent =
  process.env.FX2USD_MAINTENANCE_LOCK_PARENT ||
  path.join(os.homedir(), "Library", "Caches", "fx2usd-maintenance");
const lockDir = path.join(lockParent, "maintenance.lock");
const logFile = path.join(logDir, "fx2usd-maintenance.log");
const validationCommand = process.env.FX2USD_MAINTENANCE_VALIDATION_COMMAND || "npm run check";
const deployCommand = (process.env.FX2USD_MAINTENANCE_DEPLOY_COMMAND || "").trim();
const requireDeploy = process.env.FX2USD_MAINTENANCE_REQUIRE_DEPLOY !== "0";
const commitSubject =
  process.env.FX2USD_MAINTENANCE_COMMIT_SUBJECT || "Automated daily maintenance commit";

let lockAcquired = false;

function redact(value) {
  return String(value)
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      "[REDACTED PRIVATE KEY]",
    )
    .replace(
      /\b(password|passwd|token|secret|api[_-]?key|client[_-]?secret|access[_-]?token)(\s*[:=]\s*)("[^"]*"|'[^']*'|\S+)/gi,
      "$1$2[REDACTED]",
    );
}

function log(message = "") {
  const line = `${new Date().toISOString()} ${redact(message)}`;
  fs.appendFileSync(logFile, `${line}\n`);
  console.log(line);
}

function finish(code) {
  log(`Exit status: ${code}`);
  if (lockAcquired) {
    fs.rmSync(lockDir, { force: true, recursive: true });
    lockAcquired = false;
  }
  process.exit(code);
}

function onSignal(signal) {
  log(`Received ${signal}; stopping safely.`);
  finish(130);
}

process.on("SIGINT", onSignal);
process.on("SIGTERM", onSignal);
process.on("uncaughtException", (error) => {
  try {
    log(`Unhandled error: ${error.stack || error.message}`);
    finish(1);
  } catch (_logError) {
    process.exit(1);
  }
});

function runGit(gitArgs, options = {}) {
  const result = spawnSync("git", gitArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (!options.allowFailure && result.status !== 0) {
    throw new Error(
      `git ${gitArgs.join(" ")} failed with status ${result.status}: ${
        result.stderr || result.stdout
      }`,
    );
  }

  return result;
}

function runShellCommand(label, command) {
  log(`${label}: ${command}`);
  const result = spawnSync(command, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 40 * 1024 * 1024,
    shell: true,
  });

  if (result.stdout.trim()) {
    log(`${label} stdout:\n${result.stdout.trimEnd()}`);
  }

  if (result.stderr.trim()) {
    log(`${label} stderr:\n${result.stderr.trimEnd()}`);
  }

  log(`${label} exit status: ${result.status}`);
  return result;
}

function splitNullDelimited(value) {
  return value.split("\0").filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function getChangedFiles() {
  const tracked = runGit(["diff", "--name-only", "-z", "HEAD", "--"]).stdout;
  const untracked = runGit(["ls-files", "--others", "--exclude-standard", "-z"]).stdout;

  return uniqueSorted([...splitNullDelimited(tracked), ...splitNullDelimited(untracked)]);
}

function getBranch() {
  const branch = runGit(["branch", "--show-current"]).stdout.trim();
  return branch || `(detached at ${runGit(["rev-parse", "--short", "HEAD"]).stdout.trim()})`;
}

function getShortStatus() {
  const status = runGit(["status", "--short", "--branch", "--untracked-files=all"]).stdout.trim();
  return status || "(clean)";
}

function formatTimeZone(timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone,
  }).format(new Date());
}

function commitBody() {
  return [
    "Created by the local fx2usd maintenance task.",
    `California time: ${formatTimeZone("America/Los_Angeles")}`,
    `UTC time: ${formatTimeZone("UTC")}`,
    `Repository: ${repoRoot}`,
    `Validation command: ${validationCommand}`,
  ].join("\n");
}

const blockedPathPatterns = [
  [/^\.env(?:\..*)?$/i, "environment file"],
  [/(^|\/)\.env(?:\..*)?$/i, "environment file"],
  [/\.(pem|key|p12|pfx|crt|cer)$/i, "private key or certificate"],
  [/(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i, "private SSH key"],
  [/(^|\/)(credentials?|secrets?)(\.|\/|$)/i, "credential or secret path"],
  [/\.(db|sqlite|sqlite3|dump|sql)$/i, "database or dump file"],
  [/\.(bak|backup|zip|tar|tgz|gz|7z|rar)$/i, "backup or archive file"],
  [/\.(log)$/i, "log file"],
  [
    /(^|\/)(node_modules|dist|build|out|coverage|tmp|temp|\.cache)(\/|$)/i,
    "generated or temporary path",
  ],
];

const blockedContentPatterns = [
  [/-----BEGIN [^-]*PRIVATE KEY-----/, "private key content"],
  [
    /\b(password|passwd|token|secret|api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*("[^"]{8,}"|'[^']{8,}'|[A-Za-z0-9_./+=:@-]{12,})/i,
    "possible secret assignment",
  ],
];

function isProbablyText(buffer) {
  return !buffer.includes(0);
}

function reviewChangedFiles(files) {
  const blockers = [];

  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");

    for (const [pattern, reason] of blockedPathPatterns) {
      if (pattern.test(normalized)) {
        blockers.push({ file, reason });
      }
    }

    const absolutePath = path.join(repoRoot, file);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isFile() || stats.size > 1024 * 1024) {
      continue;
    }

    const buffer = fs.readFileSync(absolutePath);
    if (!isProbablyText(buffer)) {
      continue;
    }

    const text = buffer.toString("utf8");
    for (const [pattern, reason] of blockedContentPatterns) {
      if (pattern.test(text)) {
        blockers.push({ file, reason });
      }
    }
  }

  return blockers;
}

function logChangedFiles(files, prefix = "Changed files detected") {
  log(`${prefix}: ${files.length}`);
  if (files.length === 0) {
    log("- none");
    return;
  }

  for (const file of files) {
    log(`- ${file}`);
  }
}

function verifyValidationCommand() {
  if (validationCommand !== "npm run check") {
    log(`Using configured validation command: ${validationCommand}`);
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  if (!packageJson.scripts || !packageJson.scripts.check) {
    throw new Error("Default validation command requires package.json scripts.check.");
  }
}

function acquireLock() {
  fs.mkdirSync(logDir, { recursive: true });
  fs.mkdirSync(lockParent, { recursive: true });

  try {
    fs.mkdirSync(lockDir);
    lockAcquired = true;
  } catch (error) {
    if (error.code === "EEXIST") {
      log(`Another maintenance run is already active at ${lockDir}.`);
      finish(75);
    }

    throw error;
  }
}

function logBlockers(blockers) {
  log("Suspicious files detected; refusing to commit.");
  for (const blocker of blockers) {
    log(`- ${blocker.file}: ${blocker.reason}`);
  }
}

function main() {
  acquireLock();

  log("FX to USD local maintenance run started.");
  log(`Mode: ${dryRun ? "dry run" : "real run"}`);
  log(`California time: ${formatTimeZone("America/Los_Angeles")}`);
  log(`UTC time: ${formatTimeZone("UTC")}`);
  log(`Repository path: ${repoRoot}`);
  log(`Git branch: ${getBranch()}`);
  log(`Git status:\n${getShortStatus()}`);
  log(`Validation command: ${validationCommand}`);
  log(
    deployCommand ? `Deployment command: ${deployCommand}` : "Deployment command: not configured",
  );

  verifyValidationCommand();

  let changedFiles = getChangedFiles();
  logChangedFiles(changedFiles);

  if (changedFiles.length === 0) {
    log("No project changes found; skipping validation, commit, and deployment.");
    finish(0);
  }

  const blockers = reviewChangedFiles(changedFiles);
  if (blockers.length > 0) {
    logBlockers(blockers);
    finish(2);
  }

  const validationResult = runShellCommand("Validation", validationCommand);
  if (validationResult.status !== 0) {
    log("Validation failed; no commit or deployment will be attempted.");
    finish(validationResult.status || 1);
  }

  changedFiles = getChangedFiles();
  logChangedFiles(changedFiles, "Changed files after validation");

  const postValidationBlockers = reviewChangedFiles(changedFiles);
  if (postValidationBlockers.length > 0) {
    logBlockers(postValidationBlockers);
    finish(2);
  }

  if (changedFiles.length === 0) {
    log("No project changes remain after validation; skipping commit and deployment.");
    finish(0);
  }

  const body = commitBody();

  if (dryRun) {
    log("Dry run: would stage and commit the changed files listed above.");
    log(`Dry run: commit subject would be "${commitSubject}".`);
    log(`Dry run: commit body would be:\n${body}`);
    if (deployCommand) {
      log(`Dry run: would deploy after a successful commit with: ${deployCommand}`);
    } else {
      log(
        "Dry run: deployment is not ready because no HostGator deployment command is configured.",
      );
      log("Dry run: a real run would stop before committing while deployment is required.");
    }
    finish(0);
  }

  if (requireDeploy && !deployCommand) {
    log(
      "Refusing to commit because deployment is required but no HostGator deployment command is configured.",
    );
    finish(3);
  }

  const addResult = runGit(["add", "--all", "--", ...changedFiles], {
    allowFailure: true,
  });
  if (addResult.status !== 0) {
    log(`git add failed:\n${addResult.stderr || addResult.stdout}`);
    finish(addResult.status || 1);
  }

  const commitResult = runGit(["commit", "-m", commitSubject, "-m", body], { allowFailure: true });
  if (commitResult.status !== 0) {
    log(`git commit failed:\n${commitResult.stderr || commitResult.stdout}`);
    finish(commitResult.status || 1);
  }

  const commitHash = runGit(["rev-parse", "HEAD"]).stdout.trim();
  log(`Commit hash created: ${commitHash}`);

  if (!deployCommand) {
    log("Deployment skipped because no deployment command is configured.");
    finish(0);
  }

  const deployResult = runShellCommand("Deployment", deployCommand);
  if (deployResult.status !== 0) {
    log("Deployment failed after commit; review logs before retrying.");
    finish(deployResult.status || 1);
  }

  log("Deployment completed successfully.");
  finish(0);
}

main();
