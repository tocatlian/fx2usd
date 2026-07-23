#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const watchMode = args.has("--watch");
const checkMode = args.has("--check");
const ignoredDirs = new Set([
  ".git",
  ".next",
  ".cache",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "outputs",
  "playwright-report",
  "test-results",
  "tmp",
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function slugify(value, used) {
  const base =
    String(value)
      .toLowerCase()
      .replace(/`([^`]+)`/g, "$1")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count ? base + "-" + (count + 1) : base;
}

function isExternalHref(href) {
  return href.startsWith("#") || href.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function splitHref(href) {
  const hashIndex = href.indexOf("#");
  if (hashIndex < 0) return { file: href, hash: "" };
  return { file: href.slice(0, hashIndex), hash: href.slice(hashIndex) };
}

function outputPathFor(sourcePath) {
  const relative = path.relative(root, sourcePath).replace(/\.md$/i, ".html");
  return path.join(root, "docs", "html", relative);
}

function relativeHref(fromOutputPath, toPath) {
  return (
    path.relative(path.dirname(fromOutputPath), toPath).replaceAll(path.sep, "/") ||
    path.basename(toPath)
  );
}

function rewriteHref(href, sourcePath, outputPath, markdownOutputMap) {
  if (isExternalHref(href)) return href;
  const parts = splitHref(href);
  if (!parts.file) return href;
  const sourceDir = path.dirname(sourcePath);
  const resolved = path.resolve(sourceDir, parts.file);
  const mapped = markdownOutputMap.get(resolved);
  if (mapped) return relativeHref(outputPath, mapped) + parts.hash;
  if (resolved.startsWith(root)) return relativeHref(outputPath, resolved) + parts.hash;
  return href;
}

function renderInline(value, sourcePath, outputPath, markdownOutputMap) {
  const codeTokens = [];
  const linkTokens = [];
  const imageTokens = [];
  let text = String(value).replace(/`([^`]+)`/g, function (_match, code) {
    const token = "@@CODE" + codeTokens.length + "@@";
    codeTokens.push("<code>" + escapeHtml(code) + "</code>");
    return token;
  });
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_match, alt, src) {
    const token = "@@IMAGE" + imageTokens.length + "@@";
    const href = rewriteHref(src, sourcePath, outputPath, markdownOutputMap);
    imageTokens.push(
      '<img src="' + escapeAttr(href) + '" alt="' + escapeAttr(alt) + '" loading="lazy">',
    );
    return token;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_match, label, href) {
    const token = "@@LINK" + linkTokens.length + "@@";
    const rewritten = rewriteHref(href, sourcePath, outputPath, markdownOutputMap);
    linkTokens.push(
      '<a href="' +
        escapeAttr(rewritten) +
        '">' +
        renderInline(label, sourcePath, outputPath, markdownOutputMap) +
        "</a>",
    );
    return token;
  });
  let html = escapeHtml(text);
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function (_match, prefix, url) {
    return prefix + '<a href="' + escapeAttr(url) + '">' + escapeHtml(url) + "</a>";
  });
  imageTokens.forEach(function (tokenHtml, index) {
    html = html.replaceAll("@@IMAGE" + index + "@@", tokenHtml);
  });
  linkTokens.forEach(function (tokenHtml, index) {
    html = html.replaceAll("@@LINK" + index + "@@", tokenHtml);
  });
  codeTokens.forEach(function (tokenHtml, index) {
    html = html.replaceAll("@@CODE" + index + "@@", tokenHtml);
  });
  return html;
}

function isTableStart(lines, index) {
  return (
    lines[index] &&
    lines[index].trim().startsWith("|") &&
    lines[index + 1] &&
    lines[index + 1].trim().startsWith("|") &&
    /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[index + 1].trim())
  );
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(function (cell) {
      return cell.trim();
    });
}

function renderMarkdown(markdown, sourcePath, outputPath, markdownOutputMap) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const headingIds = new Map();
  const toc = [];
  const body = [];
  let index = 0;
  let skippedTitle = false;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }
    if (trimmed.startsWith("<!--")) {
      index += 1;
      while (index < lines.length && !lines[index].trim().endsWith("-->")) index += 1;
      if (index < lines.length) index += 1;
      continue;
    }
    if (/^```/.test(trimmed)) {
      const language = trimmed.replace(/^```/, "").trim();
      const codeLines = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "```") {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      body.push(
        "<pre><code" +
          (language ? ' class="language-' + escapeAttr(language) + '"' : "") +
          ">" +
          escapeHtml(codeLines.join("\n")) +
          "</code></pre>",
      );
      continue;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 1 && !skippedTitle) {
        skippedTitle = true;
        index += 1;
        continue;
      }
      const id = slugify(text, headingIds);
      if (level >= 2 && level <= 3) toc.push({ level: level, text: text, id: id });
      body.push(
        "<h" +
          level +
          ' id="' +
          escapeAttr(id) +
          '">' +
          renderInline(text, sourcePath, outputPath, markdownOutputMap) +
          "</h" +
          level +
          ">",
      );
      index += 1;
      continue;
    }
    if (isTableStart(lines, index)) {
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      const header = rows[0] || [];
      const bodyRows = rows.slice(2);
      body.push(
        '<div class="table-wrap"><table><thead><tr>' +
          header
            .map(function (cell) {
              return (
                "<th>" + renderInline(cell, sourcePath, outputPath, markdownOutputMap) + "</th>"
              );
            })
            .join("") +
          "</tr></thead><tbody>" +
          bodyRows
            .map(function (row) {
              return (
                "<tr>" +
                row
                  .map(function (cell) {
                    return (
                      "<td>" +
                      renderInline(cell, sourcePath, outputPath, markdownOutputMap) +
                      "</td>"
                    );
                  })
                  .join("") +
                "</tr>"
              );
            })
            .join("") +
          "</tbody></table></div>",
      );
      continue;
    }
    if (/^-\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const marker = ordered ? /^\d+\.\s+(.*)$/ : /^-\s+(.*)$/;
      const items = [];
      while (index < lines.length) {
        const match = lines[index].trim().match(marker);
        if (!match) break;
        const parts = [match[1]];
        index += 1;
        while (
          index < lines.length &&
          lines[index].trim() &&
          !marker.test(lines[index].trim()) &&
          !/^#{1,6}\s+/.test(lines[index].trim()) &&
          !isTableStart(lines, index)
        ) {
          parts.push(lines[index].trim());
          index += 1;
        }
        items.push(parts.join(" "));
      }
      const tag = ordered ? "ol" : "ul";
      body.push(
        "<" +
          tag +
          ">" +
          items
            .map(function (item) {
              return (
                "<li>" + renderInline(item, sourcePath, outputPath, markdownOutputMap) + "</li>"
              );
            })
            .join("") +
          "</" +
          tag +
          ">",
      );
      continue;
    }
    const paragraph = [trimmed];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,6}\s+/.test(lines[index].trim()) &&
      !/^-\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !isTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    body.push(
      "<p>" + renderInline(paragraph.join(" "), sourcePath, outputPath, markdownOutputMap) + "</p>",
    );
  }
  return { body: body.join("\n"), toc: toc };
}

function titleFor(markdown, sourcePath) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return path
    .basename(sourcePath, ".md")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
}

function renderPage(markdown, sourcePath, outputPath, markdownOutputMap) {
  const title = titleFor(markdown, sourcePath);
  const rendered = renderMarkdown(markdown, sourcePath, outputPath, markdownOutputMap);
  const sourceRelative = path.relative(root, sourcePath).replaceAll(path.sep, "/");
  const outputRelative = path.relative(root, outputPath).replaceAll(path.sep, "/");
  const toc = rendered.toc.length
    ? '<nav class="toc" aria-label="Table of contents"><h2>Contents</h2><ol>' +
      rendered.toc
        .map(function (item) {
          return (
            '<li class="toc-level-' +
            item.level +
            '"><a href="#' +
            escapeAttr(item.id) +
            '">' +
            renderInline(item.text, sourcePath, outputPath, markdownOutputMap) +
            "</a></li>"
          );
        })
        .join("") +
      "</ol></nav>"
    : "";
  return (
    "<!doctype html>\n" +
    "<!-- Generated from " +
    sourceRelative +
    ". Do not edit directly. -->\n" +
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>" +
    escapeHtml(title) +
    "</title>" +
    '<style>:root{color-scheme:light;--bg:#eef2f5;--paper:#fff;--ink:#24292f;--muted:#5d6673;--line:#d6dde5;--soft:#f5f8fa;--accent:#0f766e;--accent-dark:#134e4a;--code:#edf4f3}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.62}.page{width:min(1120px,calc(100% - 32px));margin:32px auto;background:var(--paper);border:1px solid var(--line);border-radius:8px;box-shadow:0 18px 45px rgba(20,35,48,.08);overflow:hidden}header{padding:42px clamp(24px,5vw,72px) 30px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#fff 0%,#f7fafb 100%)}.source-note{display:inline-flex;flex-wrap:wrap;gap:.35rem;align-items:baseline;margin:0 0 20px;padding:8px 11px;border:1px solid var(--line);border-radius:6px;background:#fff;color:var(--muted);font-size:.88rem}.source-note code{color:var(--accent-dark)}h1{margin:0;color:var(--accent-dark);font-size:clamp(2rem,4vw,3.2rem);line-height:1.15}header p{max-width:760px;color:var(--muted);margin:12px 0 0}main{display:grid;grid-template-columns:260px minmax(0,1fr);gap:42px;padding:34px clamp(24px,5vw,72px) 64px}.toc{align-self:start;position:sticky;top:24px;padding:18px;background:var(--soft);border:1px solid var(--line);border-radius:8px}.toc h2{margin:0 0 10px;font-size:.95rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent-dark);border:0;padding:0}.toc ol{margin:0;padding-left:1.2rem}.toc li{margin:.35rem 0}.toc-level-3{margin-left:.9rem}.toc a{color:var(--accent-dark);text-decoration:none}.toc a:hover{text-decoration:underline}article{min-width:0}h2,h3,h4,h5,h6{color:var(--accent-dark);line-height:1.2}h2{margin:3rem 0 1rem;padding-bottom:.45rem;border-bottom:1px solid var(--line);font-size:clamp(1.55rem,2.4vw,2.25rem)}h3{margin:2rem 0 .85rem;font-size:1.25rem}p{margin:0 0 1.05rem}ul,ol{padding-left:1.45rem;margin:0 0 1.25rem}li{margin:.38rem 0}a{color:var(--accent);text-decoration-thickness:.08em;text-underline-offset:.16em}code{background:var(--code);padding:.1em .32em;border-radius:4px;font-family:"SFMono-Regular",Consolas,monospace;font-size:.92em}pre{overflow-x:auto;margin:1.2rem 0 1.6rem;padding:16px;border:1px solid var(--line);border-radius:8px;background:#172126;color:#edf6f5;line-height:1.5}pre code{background:transparent;color:inherit;padding:0;border-radius:0;font-size:.9rem}img{display:block;width:100%;max-width:920px;height:auto;margin:1.2rem 0 1.6rem;border:1px solid var(--line);border-radius:8px}.table-wrap{overflow-x:auto;margin:1.2rem 0 1.8rem;border:1px solid var(--line);border-radius:8px}table{width:100%;min-width:720px;border-collapse:collapse;font-size:.95rem}th,td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}th{background:var(--soft);color:var(--accent-dark);font-weight:700}tr:last-child td{border-bottom:0}footer{padding:22px clamp(24px,5vw,72px);border-top:1px solid var(--line);color:var(--muted);font-size:.9rem;background:#f7fafb}@media(max-width:860px){.page{width:100%;margin:0;border-left:0;border-right:0}main{display:block;padding-top:24px}.toc{position:static;margin-bottom:26px}table{min-width:640px}}</style>' +
    '</head><body><div class="page"><header><div class="source-note"><strong>Source of truth:</strong> <code>' +
    escapeHtml(sourceRelative) +
    "</code></div><h1>" +
    renderInline(title, sourcePath, outputPath, markdownOutputMap) +
    "</h1><p>This HTML file is generated from Markdown. Edit the Markdown source, then regenerate this file.</p></header><main>" +
    toc +
    "<article>" +
    rendered.body +
    "</article></main><footer>Generated from <code>" +
    escapeHtml(sourceRelative) +
    "</code>. Output file: <code>" +
    escapeHtml(outputRelative) +
    "</code>.</footer></div></body></html>\n"
  );
}

function shouldSkipDir(dirName, fullPath) {
  if (ignoredDirs.has(dirName)) return true;
  const relative = path.relative(root, fullPath).replaceAll(path.sep, "/");
  return relative === "docs/html" || relative.startsWith("docs/html/");
}

function findMarkdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name, fullPath))
        files.push.apply(files, findMarkdownFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(fullPath);
  }
  return files.sort(function (a, b) {
    return path.relative(root, a).localeCompare(path.relative(root, b));
  });
}

function renderIndex(markdownFiles, markdownOutputMap, indexPath) {
  const rows = markdownFiles.map(function (sourcePath) {
    const markdown = fs.readFileSync(sourcePath, "utf8");
    const outputPath = markdownOutputMap.get(sourcePath);
    const sourceRelative = path.relative(root, sourcePath).replaceAll(path.sep, "/");
    return (
      "| [" +
      titleFor(markdown, sourcePath).replace(/\|/g, "\\|") +
      "](" +
      relativeHref(indexPath, outputPath) +
      ") | `" +
      sourceRelative +
      "` |"
    );
  });
  const markdown = [
    "# Project Documentation",
    "",
    "This is the browser-friendly entry point for generated project documentation. Markdown files remain the source of truth.",
    "",
    "## Documentation Pages",
    "",
    "| Page | Source |",
    "|---|---|",
    rows.join("\n"),
    "",
    "## Notes",
    "",
    "- Edit Markdown sources, not generated HTML.",
    "- Regenerate with `npm run docs:html` or `node scripts/render-doc-html.mjs --portal`.",
  ].join("\n");
  return renderPage(markdown, indexPath, indexPath, markdownOutputMap);
}

function build() {
  const markdownFiles = findMarkdownFiles(root);
  const markdownOutputMap = new Map(
    markdownFiles.map(function (sourcePath) {
      return [sourcePath, outputPathFor(sourcePath)];
    }),
  );
  const outputs = [];
  for (const sourcePath of markdownFiles) {
    const outputPath = markdownOutputMap.get(sourcePath);
    const markdown = fs.readFileSync(sourcePath, "utf8");
    outputs.push({
      path: outputPath,
      html: renderPage(markdown, sourcePath, outputPath, markdownOutputMap),
    });
  }
  const indexPath = path.join(root, "docs", "html", "index.html");
  outputs.push({ path: indexPath, html: renderIndex(markdownFiles, markdownOutputMap, indexPath) });
  if (checkMode) {
    const stale = outputs.filter(function (output) {
      return !fs.existsSync(output.path) || fs.readFileSync(output.path, "utf8") !== output.html;
    });
    if (stale.length) {
      console.error("Generated HTML documentation is out of date. Run `npm run docs:html`.");
      for (const output of stale) console.error("- " + path.relative(root, output.path));
      process.exit(1);
    }
    console.log("HTML documentation is in sync with Markdown sources.");
    return;
  }
  for (const output of outputs) {
    fs.mkdirSync(path.dirname(output.path), { recursive: true });
    fs.writeFileSync(output.path, output.html, "utf8");
  }
  console.log("Rendered " + outputs.length + " HTML documentation file(s) under docs/html.");
}

build();

if (watchMode) {
  console.log("Watching Markdown documentation. Press Ctrl+C to stop.");
  let timer = null;
  fs.watch(root, { recursive: true }, function (_event, filename) {
    if (!filename || !filename.endsWith(".md") || filename.startsWith("docs/html/")) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      try {
        build();
      } catch (error) {
        console.error(error && error.stack ? error.stack : error);
      }
    }, 150);
  });
}
