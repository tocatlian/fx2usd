#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function getJpegDimensions(buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function getImageDimensions(relativePath) {
  const buffer = fs.readFileSync(path.join(rootDir, relativePath));
  const signature = buffer.subarray(0, 8).toString("hex");

  if (signature === "89504e470d0a1a0a") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    const dimensions = getJpegDimensions(buffer);
    if (dimensions) {
      return dimensions;
    }
  }

  fail(`${relativePath} is not a supported PNG or JPEG file`);
  return null;
}

function validateManifest() {
  const manifest = readJson("manifest.webmanifest");
  if (!manifest) return;

  for (const field of ["name", "short_name", "description", "start_url", "display"]) {
    if (!manifest[field]) {
      fail(`manifest.webmanifest is missing ${field}`);
    }
  }

  validateManifestImages("icon", manifest.icons, true);
  validateManifestImages("screenshot", manifest.screenshots, false);
}

function validateManifestImages(label, images, isRequired) {
  if (!Array.isArray(images) || images.length === 0) {
    if (isRequired) {
      fail(`manifest.webmanifest must include at least one ${label}`);
    }
    return;
  }

  for (const image of images) {
    if (!image.src || !fileExists(image.src)) {
      fail(`manifest ${label} is missing: ${image.src || "(empty src)"}`);
      continue;
    }

    const dimensions = getImageDimensions(image.src);
    if (!dimensions || !image.sizes) continue;

    const expectedSize = `${dimensions.width}x${dimensions.height}`;
    if (!image.sizes.split(/\s+/).includes(expectedSize)) {
      fail(`${image.src} is ${expectedSize}, but manifest declares ${image.sizes}`);
    }
  }
}

function validateHtmlAssets() {
  const html = readText("index.html");
  const assetPattern = /\b(?:href|src)="([^":#?]+)(?:[?#][^"]*)?"/g;
  let match;

  while ((match = assetPattern.exec(html)) !== null) {
    const assetPath = match[1];
    if (assetPath.startsWith("/") || assetPath.startsWith("mailto:")) continue;
    if (!fileExists(assetPath)) {
      fail(`index.html references a missing local asset: ${assetPath}`);
    }
  }
}

function validateServiceWorker() {
  const worker = readText("sw.js");
  const packageJson = readJson("package.json");
  const staticAssetPattern = /"([^"]+)"/g;
  const staticAssetsMatch = worker.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);

  if (packageJson && !worker.includes(`const APP_VERSION = "${packageJson.version}"`)) {
    fail("sw.js APP_VERSION must match package.json version");
  }

  if (!staticAssetsMatch) {
    fail("sw.js must define STATIC_ASSETS");
    return;
  }

  const listedAssets = [];
  let match;
  while ((match = staticAssetPattern.exec(staticAssetsMatch[1])) !== null) {
    listedAssets.push(match[1]);
  }

  const requiredAssets = [
    "./",
    "app.js",
    "styles.css",
    "manifest.webmanifest",
    "favicon-16.png",
    "favicon-32.png",
    "apple-touch-icon.png",
    "icon-512.png",
    "docs/screenshot.jpg",
  ];

  for (const asset of requiredAssets) {
    if (!listedAssets.includes(asset)) {
      fail(`sw.js STATIC_ASSETS is missing ${asset}`);
    }
  }

  for (const asset of listedAssets) {
    if (asset === "./") continue;
    if (/^https?:/i.test(asset)) {
      fail(`sw.js should not precache third-party URL: ${asset}`);
      continue;
    }
    if (!fileExists(asset)) {
      fail(`sw.js references a missing local asset: ${asset}`);
    }
  }
}

function validatePublicReleaseFiles() {
  const requiredFiles = [
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/dependabot.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/pages.yml",
    ".gitignore",
    "CHANGELOG.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "PUBLISHING.md",
    "PRIVACY.md",
    "README.md",
    "SECURITY.md",
    "sw.js",
  ];

  for (const file of requiredFiles) {
    if (!fileExists(file)) {
      fail(`Missing expected public-release file: ${file}`);
    }
  }
}

function validateLicenseLanguage() {
  const searchableFiles = ["README.md", "app.js", "index.html", "styles.css"];
  for (const file of searchableFiles) {
    if (/All Rights Reserved/i.test(readText(file))) {
      fail(`${file} still contains "All Rights Reserved"`);
    }
  }
}

validatePublicReleaseFiles();
validateManifest();
validateHtmlAssets();
validateServiceWorker();
validateLicenseLanguage();

if (failures.length) {
  console.error("Project validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Project validation passed");
