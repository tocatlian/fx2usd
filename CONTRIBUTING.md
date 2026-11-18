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

The npm override for `minimatch` in ESLint's dependency tree addresses [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Once published versions of ESLint and `@eslint/config-array` both resolve to patched versions without the override, remove it, refresh the lockfile, and rerun `npm audit` and `npm run check`.

### CSS linting

CSS is checked by the official [`@eslint/css` plugin](https://github.com/eslint/css) using its recommended rules in `eslint.config.js`. `npm run lint:css` checks CSS, and `npm run lint:js` checks JavaScript. Generated output, dependencies and private audit evidence remain ignored. Prettier remains the formatting check.

This replaces Stylelint and its glob dependencies after the November 17, 2026 review of [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf). Seven high-severity package alerts shared the vulnerable Picomatch implementation. No patched Picomatch release was available, and Stylelint 18 still depended on it. The migration removes that dependency chain without a custom glob adapter or patched fork. Runtime app files are unaffected.

The CSS rule sets are different. ESLint checks syntax, properties, at-rules, grid areas, font fallbacks, empty blocks, duplicate imports and keyframe selectors, impossible selectors, important declarations and Baseline compatibility. It does not preserve every Stylelint convention, including duplicate declaration detection and naming patterns. The existing `::marker` enhancement is allowed by the Baseline rule because summary elements also have `list-style` and WebKit marker fallbacks. Other Baseline checks remain enabled. `tests/css-lint.test.js` verifies representative error detection, the real stylesheet, JavaScript rule isolation and ignored paths. Revisit this coverage deliberately when changing lint tooling.

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
