#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "../vendor/prettier/standalone.mjs";
import babel from "../vendor/prettier/plugins/babel.mjs";
import estree from "../vendor/prettier/plugins/estree.mjs";
import postcss from "../vendor/prettier/plugins/postcss.mjs";
import html from "../vendor/prettier/plugins/html.mjs";
import markdown from "../vendor/prettier/plugins/markdown.mjs";
import yaml from "../vendor/prettier/plugins/yaml.mjs";

const plugins = [babel, estree, postcss, html, markdown, yaml];
const parsers = new Map([
  [".js", "babel"],
  [".cjs", "babel"],
  [".mjs", "babel"],
  [".json", "json"],
  [".webmanifest", "json"],
  [".css", "css"],
  [".html", "html"],
  [".md", "markdown"],
  [".yml", "yaml"],
  [".yaml", "yaml"],
]);
const ignoredDirectories = new Set([
  ".git",
  ".cache",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "vendor",
]);

// Literal directory entries only. Filenames never become matcher expressions.
export function collectFiles(root, relative = "") {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name) && name !== path.join("docs", "html")) {
        files.push(...collectFiles(root, name));
      }
    } else if (entry.isFile() && parsers.has(path.extname(entry.name))) {
      files.push(name);
    }
  }
  return files.sort();
}

export function readOptions(root) {
  const config = JSON.parse(fs.readFileSync(path.join(root, ".prettierrc.json"), "utf8"));
  if (
    !config ||
    Array.isArray(config) ||
    Object.keys(config).some((key) => key !== "printWidth") ||
    !Number.isInteger(config.printWidth) ||
    config.printWidth < 1 ||
    config.printWidth > 1000
  ) {
    throw new Error("Formatting configuration supports only an integer printWidth from 1 to 1000");
  }
  return config;
}

export function formatSource(source, file, options) {
  const parser = ["package.json", "package-lock.json"].includes(path.basename(file))
    ? "json-stringify"
    : parsers.get(path.extname(file));
  if (!parser) throw new Error(`Unsupported formatting file: ${file}`);
  return format(source, { ...options, parser, plugins });
}

export async function formatProject(root, mode) {
  if (mode !== "--check" && mode !== "--write") {
    throw new Error("Usage: node scripts/format.mjs --check|--write (no paths or globs)");
  }
  const options = readOptions(root);
  const files = collectFiles(root);
  const changed = [];
  for (const file of files) {
    const absolute = path.join(root, file);
    const source = fs.readFileSync(absolute, "utf8");
    const result = await formatSource(source, file, options);
    if (result !== source) {
      changed.push(file);
      if (mode === "--write") fs.writeFileSync(absolute, result);
    }
  }
  return { files, changed };
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    if (process.argv.length !== 3) throw new Error("Expected exactly --check or --write");
    const result = await formatProject(
      path.resolve(path.dirname(scriptPath), ".."),
      process.argv[2],
    );
    for (const file of result.changed) console.log(file);
    console.log(
      `Checked ${result.files.length} files, ${result.changed.length} formatting changes`,
    );
    if (process.argv[2] === "--check" && result.changed.length) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
