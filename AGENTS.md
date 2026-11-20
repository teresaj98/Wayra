# Wayra: agent entry point

This is the single entry point for AI coding agents (PRD 01 F-07). `CLAUDE.md` and `.cursor/rules/wayra.mdc`
only point here. Wayra is a bare React Native (no Expo) road-trip and trek recorder for iOS and Android,
built one slice at a time by agents. The owner reviews PRDs, approves decisions and runs the owner test sheets.

## 1. Read first, in this order

1. `docs/prd/PRD-01.md`: the current PRD, its work slices (section 3) and requirements.
2. `docs/prd/PRD-00.md`: master architecture. Read it fully before writing code.
3. The current slice: its row in PRD 01 section 3, the requirements it names, and its owner test sheet steps
   (PRD 01 section 12).
4. `docs/decisions.md`: choices already made per slice and owner decisions. Do not reopen them without the owner.

Also useful: `README.md` (setup on a Mac), `docs/db.md` (database file and schema), `docs/CHANGELOG.md`.

## 2. Architecture rules R-01 to R-16 (summary)

The full text is in PRD 00 section 5. These rules are hard: breaking one needs an owner-approved
decision-log entry. Layers depend downward only (ui → app → domain, data, platform), and `src/domain` is pure,
deterministic TypeScript with no React, React Native, native modules, SQLite, network, clock or randomness;
time and IDs are injected, and it runs unchanged in plain Node (R-01, R-02, R-16). The recorder, maps, file
export, permissions and later places and sync sit behind interfaces (R-03). Raw `points` are append-only,
written only by ingestion and deleted only with their trip (R-04); derived data is disposable, rebuildable
and stamped with its `pipeline_version` (R-05). Recording never depends on the JS runtime (R-06), everything
works offline (R-07), and values are SI units, WGS84 degrees and UTC epoch milliseconds, converted only in the
UI (R-08). Every schema change is a forward-only, tested migration (R-09). Recording never fails silently:
anything that may lose data goes to `recording_log` and recorder health (R-10). User-owned tables carry `id`
(UUIDv7), `created_at`, `updated_at`, `deleted_at` and `synced_at` (R-11). All thresholds live in one typed
config module (R-12). Files stay under about 300 lines and functions under about 60, or the PR says why
(R-13). Privacy zones and trimming are applied when something is shared, never to raw points (R-14). All
user-facing text goes through the i18n layer, and the UI uses theme tokens with light and dark modes (R-15).

`npm run lint` enforces the layer import rules (PRD 00 section 6, DEC-S1-08) and checks itself with
`scripts/check-boundaries.js`.

## 3. Commands

Use Node 26 LTS (`.nvmrc`; 24.3 or later is accepted) and npm. Setup: `npm install`, then `npm run env:init`.

```bash
npm run lint        # ESLint (no warnings) + import-boundary self-check + app identity check
npm run typecheck   # tsc --noEmit
npm test            # Jest, all tests
npm run db:check    # migrations on an empty database (stub that prints SKIPPED until S4)
npm run android     # run on Android with .env.staging; also android:uat, android:prod
npm run ios         # run on iOS with .env.staging; also ios:uat, ios:prod
```

iOS also needs `bundle install` and `cd ios && LANG=en_US.UTF-8 bundle exec pod install`. CI
(`.github/workflows/ci.yml`: lint, typecheck, tests, `db:check`, Android debug build) and the iOS simulator
build (`.github/workflows/ios.yml`) run **only when started by hand** (Actions tab → Run workflow) on the
`dev` branch (DEC-S2-11). Pushes and pull requests do not start them.

## 4. Definition of done for a slice (PRD 00 section 15)

- Typecheck, lint and tests pass in CI on both platforms.
- New or changed behaviour has tests, or a stated reason why not.
- Architecture rules R-01 to R-13 are respected, and the PR says so explicitly.
- The PRD's manual test protocol is updated and ready for the owner to run.
- The decision log (`docs/decisions.md`) is updated if a decision was made, with what was chosen, what was
  rejected and why.

Also: update `docs/CHANGELOG.md`, and finish with a one-page owner test sheet (exact steps, expected result,
a pass/fail box).

## 5. NEEDS DEVICE VALIDATION

Agents cannot verify background reliability, battery use, real GPS quality, OS permission dialogs, store
review or anything that only shows on a real phone. Tag every such item **NEEDS DEVICE VALIDATION** in the
PRD notes, the PR and the owner test sheet. A passing test suite or a green CI run is never reported as proof
that it works.

## 6. Working agreement (PRD 00 section 16)

- Build one slice per session. Do not start the next slice or PRD.
- **If a PRD is unclear, incomplete or seems wrong, stop and ask the owner. Never improvise.**
- Never invent library versions or APIs from memory. Look them up and pin them: the newest stable release
  that is at least 14 days old (DEC-S1-01). GitHub Actions are pinned by commit SHA (DEC-S2-04).
- Never weaken a test to make it pass. If a test is wrong, explain why.
- Prefer boring, well-documented approaches over clever ones.
- Refer to requirement and decision IDs (R-05, D-003, F-10, DEC-S2-01) in commits and PRs.
- Commit and push only when the owner says so.
- **Branches (DEC-S2-11):** `main` is the stable line; `dev` is the integration branch, created from `main`.
  Every piece of work gets its own feature branch from `dev` (for example `feature/s3-domain`). Never commit
  directly to `main` or `dev`; merging is the owner's call.
