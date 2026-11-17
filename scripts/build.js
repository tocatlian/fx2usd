#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const rootDir = path.resolve(__dirname, "..");
const staticFiles = [
  "apple-touch-icon.png",
  "app.js",
  "docs/screenshot.jpg",
  "favicon-16.png",
  "favicon-32.png",
  "icon-512.png",
  "index.html",
  "manifest.webmanifest",
  "styles.css",
  "sw.js",
];

function build(sourceDir = rootDir, distDir = path.join(sourceDir, "dist")) {
  fs.rmSync(distDir, { force: true, recursive: true });
  fs.mkdirSync(distDir, { recursive: true });

  for (const fileName of staticFiles) {
    const targetPath = path.join(distDir, fileName);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(path.join(sourceDir, fileName), targetPath);
  }

  const versionedUrl = (fileName) => {
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(distDir, fileName)))
      .digest("hex")
      .slice(0, 16);
    return `${fileName}?v=${hash}`;
  };
  const manifestPath = path.join(distDir, "manifest.webmanifest");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const asset of [...manifest.icons, ...(manifest.screenshots || [])]) {
    if (!staticFiles.includes(asset.src)) throw new Error("Unexpected manifest asset");
    asset.src = versionedUrl(asset.src);
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const runtimeAssets = staticFiles.filter((file) => !["index.html", "sw.js"].includes(file));
  const htmlPath = path.join(distDir, "index.html");
  const html = fs
    .readFileSync(htmlPath, "utf8")
    .replace(/\b(src|href)="([^"]+)"/g, (match, attribute, url) =>
      runtimeAssets.includes(url) ? `${attribute}="${versionedUrl(url)}"` : match,
    );
  fs.writeFileSync(htmlPath, html);

  const workerPath = path.join(distDir, "sw.js");
  const worker = fs.readFileSync(workerPath, "utf8");
  const assetsPattern = /const STATIC_ASSETS = \[[\s\S]*?\];/;
  if (!assetsPattern.test(worker)) throw new Error("Missing worker precache inventory");
  const precache = ["./", ...runtimeAssets.map(versionedUrl)];
  fs.writeFileSync(
    workerPath,
    worker.replace(assetsPattern, `const STATIC_ASSETS = ${JSON.stringify(precache, null, 2)};`),
  );
  fs.writeFileSync(path.join(distDir, ".nojekyll"), "");
  return distDir;
}

module.exports = { build, staticFiles };
if (require.main === module) {
  const distDir = build();
  console.log(
    `Built ${staticFiles.length} files with versioned asset URLs plus .nojekyll in ${path.relative(rootDir, distDir)}`,
  );
}
