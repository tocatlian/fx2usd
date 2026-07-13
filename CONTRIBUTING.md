# Contributing

Thanks for considering a contribution to FX to USD Converter.

## GitHub Workflow

The `main` branch is protected. For every change:

1. Create a focused `codex/<description>` branch from `main`.
2. Commit only the intended source, test, and documentation changes.
3. Push the branch and open a pull request targeting `main`.
4. Wait for the required Node.js CI checks to pass.
5. Squash-merge the pull request. Merged branches are deleted automatically.

Do not push directly to `main`. Keep generated `dist/` output, local fixtures, logs, and unrelated working-tree changes out of pull requests.

## Local Setup

```bash
npm ci
npm run check
npm run serve
```

Local use does not require a build step; run `npm run build` when you need to inspect the deployment output. For scheduled local maintenance, see [docs/local-maintenance.md](docs/local-maintenance.md).

## Pull Requests

- Keep pull requests focused on one fix or feature.
- Add or update tests when behavior changes.
- Update README or privacy documentation when user-facing behavior, storage, or network requests change.
- Run `npm run check` before submitting.
- Keep the pull request on a focused branch targeting protected `main`.
- Do not commit secrets, local `.env` files, generated logs, or dependency folders.

## Style

- Match the existing plain JavaScript, HTML, and CSS style.
- Prefer browser APIs over adding dependencies unless a dependency clearly reduces risk or complexity.
- Keep the app usable without a build step for local development.
