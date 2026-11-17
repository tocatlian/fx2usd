# Changelog

All notable changes to this project will be documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic versioning once releases begin.

## [Unreleased]

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
