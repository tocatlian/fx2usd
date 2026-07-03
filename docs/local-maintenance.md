# Local Maintenance

This project has a local maintenance runner for checking the repository, validating safe local changes, committing them, and deploying only after a successful commit.

Deployment is not enabled yet. The repository documents GitHub Pages deployment and a generic static-host build with `npm run build`, but it does not currently include a HostGator deployment command, SFTP configuration, or destination path. The launchd configuration therefore leaves `FX2USD_MAINTENANCE_DEPLOY_COMMAND` empty, and the runner refuses to make a real commit when changed files are present and deployment is required.

## Files

- Runner: `scripts/local-maintenance.js`
- launchd template: `ops/launchd/com.paultocatlian.fx2usd.local-maintenance.plist`
- Main log: `~/Library/Logs/fx2usd-maintenance/fx2usd-maintenance.log`
- launchd stdout log: `~/Library/Logs/fx2usd-maintenance/launchd.out.log`
- launchd stderr log: `~/Library/Logs/fx2usd-maintenance/launchd.err.log`
- Lock directory: `~/Library/Caches/fx2usd-maintenance/maintenance.lock`

## Schedule

The requested source of truth is 1:30 PM California time.

The launchd template uses `StartCalendarInterval` with local system time:

- Hour: `13`
- Minute: `30`

launchd does not store this as a UTC schedule. If this Mac's system time zone remains set to California time, the run time is daylight-saving aware through macOS local time:

- During Pacific Daylight Time, 1:30 PM California time is 20:30 UTC.
- During Pacific Standard Time, 1:30 PM California time is 21:30 UTC.

If the Mac's system time zone changes away from California time, launchd will follow the Mac's new local time instead of fixed California time. A safer UTC-based alternative would be to run a small always-UTC scheduler outside launchd, or to schedule a frequent launchd check that exits unless the current `America/Los_Angeles` time is 1:30 PM.

## Dry Run

Run this before enabling launchd:

```bash
npm run maintenance:dry-run
```

The dry run logs the current branch, changed files, validation command, commit message that would be used, and the deployment command that would run if configured.

## Enable

Do not enable until a HostGator deployment command and destination path are confirmed.

After confirmation, edit `ops/launchd/com.paultocatlian.fx2usd.local-maintenance.plist` and set `FX2USD_MAINTENANCE_DEPLOY_COMMAND` to the existing safe deployment command. Do not put passwords, tokens, private keys, or other secrets in the plist.

Then install and enable:

```bash
mkdir -p "$HOME/Library/Logs/fx2usd-maintenance"
cp ops/launchd/com.paultocatlian.fx2usd.local-maintenance.plist "$HOME/Library/LaunchAgents/com.paultocatlian.fx2usd.local-maintenance.plist"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.paultocatlian.fx2usd.local-maintenance.plist"
launchctl enable "gui/$(id -u)/com.paultocatlian.fx2usd.local-maintenance"
```

To run it once through launchd after enabling:

```bash
launchctl kickstart -k "gui/$(id -u)/com.paultocatlian.fx2usd.local-maintenance"
```

## Disable

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.paultocatlian.fx2usd.local-maintenance.plist"
rm "$HOME/Library/LaunchAgents/com.paultocatlian.fx2usd.local-maintenance.plist"
```

## Safety Behavior

The runner:

- checks tracked and untracked files while respecting `.gitignore`;
- blocks environment files, private keys, credentials paths, database dumps, backup archives, logs, generated directories, and likely secret assignments;
- runs `npm run check` before committing;
- includes California and UTC timestamps in the commit body;
- does not push, amend, force push, or rewrite history;
- deploys only after a new commit is created successfully and a deployment command is configured;
- uses a lock directory so runs cannot overlap.
