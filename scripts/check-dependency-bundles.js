#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");

function checkDependencyBundles(directory = root) {
  const lock = JSON.parse(fs.readFileSync(path.join(directory, "package-lock.json"), "utf8"));
  for (const [name, info] of Object.entries(lock.packages)) {
    if (/(?:^|\/)node_modules\/(?:picomatch|prettier|stylelint)$/.test(name)) {
      throw new Error(`Excluded dependency: ${name}@${info.version}`);
    }
  }
  const vendor = path.join(directory, "vendor", "prettier");
  const provenance = JSON.parse(fs.readFileSync(path.join(vendor, "provenance.json"), "utf8"));
  const actualFiles = [];
  function walk(base, visit, relative = "") {
    for (const entry of fs.readdirSync(path.join(base, relative), { withFileTypes: true })) {
      if (entry.name === ".bin" && entry.isDirectory()) continue;
      const name = path.join(relative, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Unexpected dependency symlink: ${name}`);
      if (entry.isDirectory()) walk(base, visit, name);
      else if (entry.isFile()) visit(name);
    }
  }
  walk(vendor, (name) => {
    if (name === "provenance.json") return;
    actualFiles.push(name.replaceAll(path.sep, "/"));
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(vendor, name)))
      .digest("hex");
    if (provenance.files[name.replaceAll(path.sep, "/")] !== hash) {
      throw new Error(`Unreviewed formatter artifact: ${name}`);
    }
  });
  if (actualFiles.length !== Object.keys(provenance.files).length) {
    throw new Error("Missing formatter artifact");
  }
  const signatures = /picomatch|analyzeRepeatedExtglob/i;
  for (const base of [vendor, path.join(directory, "node_modules")]) {
    walk(base, (name) => {
      if (name.split(path.sep)[0] === ".bin") return;
      if (base !== vendor && path.basename(name) === "package.json") {
        const installed = JSON.parse(fs.readFileSync(path.join(base, name), "utf8"));
        if (["picomatch", "prettier", "stylelint"].includes(installed.name)) {
          throw new Error(`Excluded installed dependency: ${name}`);
        }
      }
      if (/\.(?:js|cjs|mjs|map)$/.test(name)) {
        if (signatures.test(fs.readFileSync(path.join(base, name), "utf8"))) {
          throw new Error(`Picomatch implementation detected: ${name}`);
        }
      }
    });
  }
  return actualFiles.length;
}

module.exports = { checkDependencyBundles };
if (require.main === module) {
  console.log(
    `Dependency bundle check passed (${checkDependencyBundles()} verified formatter artifacts)`,
  );
}
