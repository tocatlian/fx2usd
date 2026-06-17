# Contributing

Thanks for considering a contribution to FX to USD Converter.

## Local Setup

```bash
npm install
npm run check
npm run serve
```

The app is static, so most changes only need a browser refresh and the Node test suite.

## Pull Requests

- Keep pull requests focused on one fix or feature.
- Add or update tests when behavior changes.
- Update README or privacy documentation when user-facing behavior, storage, or network requests change.
- Run `npm run check` before submitting.
- Do not commit secrets, local `.env` files, generated logs, or dependency folders.

## Style

- Match the existing plain JavaScript, HTML, and CSS style.
- Prefer browser APIs over adding dependencies unless a dependency clearly reduces risk or complexity.
- Keep the app usable without a build step.
