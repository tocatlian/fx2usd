# Publishing and Releases

This repository is already public and deploys through GitHub Pages. Use the protected branch workflow in [CONTRIBUTING.md](CONTRIBUTING.md) for changes; do not initialize or push a replacement repository from a local checkout.

## Repository Settings

- Keep GitHub Pages configured to use GitHub Actions.
- Keep the repository description and topics aligned with the project.
- Enable private vulnerability reporting when the repository setting is available.

The Pages workflow at `.github/workflows/pages.yml` runs on pushes to `main`. It installs the locked dependencies with `npm ci`, runs `npm run check`, builds `dist/`, and deploys that directory.

## Release Checklist

1. Create a focused `codex/<description>` branch from the latest `main`.
2. If the version changes, update `package.json` and `APP_VERSION` in `sw.js` together.
3. Update [CHANGELOG.md](CHANGELOG.md) and any affected README, privacy, or support documentation.
4. Run `npm ci` and `npm run check`.
5. Open a pull request, wait for the required CI checks, and squash-merge it.
6. From the updated local `main`, create and push an annotated version tag:

   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

7. Create the GitHub Release from the pushed tag and summarize the changes from [CHANGELOG.md](CHANGELOG.md).
