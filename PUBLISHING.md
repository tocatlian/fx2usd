# Publishing

Use this checklist when publishing FX to USD Converter as a public GitHub project.

## First Publish

```bash
git init -b main
git add .
git commit -m "Prepare public GitHub release"
gh repo create fx2usd --public --source=. --remote=origin --push
```

Then in GitHub:

- Add a short repository description: `Static FX to USD converter with live, cached, manual, and offline support.`
- Add topics: `currency`, `exchange-rates`, `pwa`, `offline`, `javascript`.
- Enable GitHub Pages with `GitHub Actions` as the source.
- Enable private vulnerability reporting if it is available.

## Before Each Release

```bash
npm run check
```

If the version changes, update both `package.json` and `APP_VERSION` in `sw.js`. The project validator will fail if they drift apart.

Create a release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```
