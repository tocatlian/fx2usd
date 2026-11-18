# Changelog

All notable changes to this project will be documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic versioning once releases begin.

## [Unreleased]

- Removed the remaining Picomatch implementation bundled in Prettier by retaining only its official standalone formatter and required parser plugins. Added literal file traversal, restricted configuration, artifact hashes and dependency bundle regression checks. Application runtime files are unchanged.

- Shortened the footer copyright notice by removing the release-license sentence.

- Aligned the footer in one row with copyright on the left, exchange-rate attribution centered, and Kisau Sites on the right, keeping matching typography and allowing text to wrap within its column on narrow screens.

- Added a “Need a Website? Kisau Sites.” footer link that opens Kisau Sites in a new tab.

## [0.1.2] - 2026-11-17

- Added content hashes to production asset URLs in HTML, the PWA manifest, and the service-worker precache so returning browsers receive updated files under the canonical host's immutable cache policy.
- Kept the PWA identity stable and explicitly bypassed the HTTP cache for worker updates.
- Added regression checks for script changes, icon-to-manifest dependency changes, and precache URL coherence.

## [0.1.1] - 2026-11-17

- Added visible converter instructions covering live, cached, and manual rates.
- Verified the canonical HostGator directory through matching SFTP and HTTPS hashes and added an app-scoped uploader with backups, rollback batches, and post-upload verification.
- Restricted service-worker cache cleanup to FX2USD caches so other apps on the shared origin are preserved.
- Recorded the Search Console audit and clarified the separate GitHub Pages mirror deployment.

## [0.1.0]

- Added canonical, robots, Open Graph, and Twitter metadata for the canonical tocatlian.com app URL.
- Prepared the project for public GitHub release with license, contribution, security, privacy, CI, and package metadata.
- Added PWA offline app-shell caching, static build validation, GitHub Pages deployment, and service-worker regression tests.
