# Codex Project Instructions

## Documentation

- Treat Markdown documentation as the source of truth. Generated HTML documentation belongs under `docs/html/` and should not be hand-edited except to repair the generator.
- When Markdown docs change, regenerate the HTML version with `npm run docs:html` when package scripts are available, or `node scripts/render-doc-html.mjs --portal` otherwise. For longer documentation sessions, use `npm run docs:html:watch` or `node scripts/render-doc-html.mjs --portal --watch`.

## Product Design Context

- Keep Product Design context project-scoped. If a future run creates or updates Product Design context for this project, save it inside this repository, preferably at `docs/product-design/user-context.md` with visual references in `docs/product-design/assets/`, instead of the global Product Design plugin state at `~/.codex/state/plugins/product-design/`.
- Each Codex project can have its own design language, UI conventions, UX decisions, and reference screenshots. Do not reuse or overwrite another project's Product Design context unless the user explicitly asks.
