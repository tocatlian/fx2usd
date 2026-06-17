#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
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

fs.rmSync(distDir, { force: true, recursive: true });
fs.mkdirSync(distDir, { recursive: true });

for (const fileName of staticFiles) {
  const targetPath = path.join(distDir, fileName);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(path.join(rootDir, fileName), targetPath);
}

fs.writeFileSync(path.join(distDir, ".nojekyll"), "");

console.log(
  `Built ${staticFiles.length} files plus .nojekyll in ${path.relative(rootDir, distDir)}`,
);
