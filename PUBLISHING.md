# Publishing and Releases

This repository is already public and deploys through GitHub Pages. Use the protected branch workflow in [CONTRIBUTING.md](CONTRIBUTING.md) for changes; do not initialize or push a replacement repository from a local checkout.

## Repository Settings

- Keep GitHub Pages configured to use GitHub Actions.
- Keep the repository description and topics aligned with the project.
- Enable private vulnerability reporting when the repository setting is available.

The Pages workflow at `.github/workflows/pages.yml` runs on pushes to `main`. It installs the locked dependencies with `npm ci`, runs `npm run check`, builds `dist/`, and deploys that directory to `https://tocatlian.github.io/fx2usd/`.

## Canonical Production Target

The app and Pages mirror declare `https://www.tocatlian.com/apps/fx/` as canonical. This URL is served by Apache independently of GitHub Pages. The [November 17, 2026 audit](docs/gsc-audit-2026-11-17.md) established the HostGator directory by downloading its HTML and JavaScript through authenticated SFTP and matching both hashes to the canonical HTTPS responses.

The only accepted target is `public_html/tocatlian.com/apps/fx`. The uploader refuses root, sibling, absolute, or traversal destinations. Shared root rules and the root sitemap belong to the Tocatlian.com project and are not uploaded here.

1. Copy `.env.hostgator.example` to `.env.hostgator`. Set the existing hosting server, username, and optional key path. Use port `2222` and the exact app directory above. Keep the file private and untracked. The SSH host key must already be trusted. Do not put a password or private key contents in configuration.
2. Run `npm run deploy:hostgator:plan`. This prints the fixed target and performs no connection or upload.
3. Follow the protected-branch release checklist below, then run `npm run deploy:hostgator` from the clean committed checkout. The command runs the complete quality gate, validates the exact build allowlist, downloads the current app directory, and checks the backed-up HTML against the live canonical URL before uploading.
4. Inspect `.cache/hostgator-releases/<UTC-release-id>/receipt.json`. Successful verification requires matching SHA-256 hashes for all ten runtime files over both SFTP and HTTPS. The upload writes assets before HTML, preserves existing folders and remote-only files, and excludes documentation, credentials, and `.nojekyll` from the canonical host.
5. Verify canonical, robots, redirects, real missing-page responses, and rendered conversion behavior. Keep the release receipt distinct from Google's later crawl, indexing, and ranking observations.

The app deploy lock is `.cache/deploy-hostgator.lock`. Deployment also refuses to run while the local maintenance lock exists. Do not remove another process's lock.

Each release stores the previous remote subtree under `before/` and a `rollback.sftp` batch beside the receipt. To roll back, use that exact batch with the same trusted SFTP connection, port `2222`, `BatchMode=yes`, and `StrictHostKeyChecking=yes`. Review it first. It restores only files inside the fixed app directory, preserves folders and newly added files, and adds a retiring FX-only worker if the previous release had no worker. That worker clears only FX2USD caches and unregisters itself when clients next update it. Reverify restored file hashes, rendered behavior, and affected clients after rollback. The rollback batch is retained but is not automatically executed after a partial upload.

## Release Checklist

1. Create a focused `codex/<description>` branch from the latest `main`.
2. If the version changes, update `package.json` and `APP_VERSION` in `sw.js` together.
3. Update [CHANGELOG.md](CHANGELOG.md) and any affected README, privacy, or support documentation.
4. Run `npm ci` and `npm run check`.
5. Open a pull request, wait for the required CI checks, and squash-merge it.
6. Deploy and verify the canonical host with `npm run deploy:hostgator`. Record its receipt separately from the automatic Pages mirror run.
7. From the updated local `main`, create and push an annotated version tag:

   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

8. Create the GitHub Release from the pushed tag and summarize the changes from [CHANGELOG.md](CHANGELOG.md).
