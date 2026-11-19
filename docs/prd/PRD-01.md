# PRD 01: Foundations, repo, data layer and app shell

Nov 19, 2026 · @Teresa

Status: Draft v0.1, 14 Oct 2026. Depends on PRD 00 (Draft v0.2). Readers: the owner (reads, approves, tests) and the AI coding agent (implements).

## 1. Purpose and outcome

After PRD 01 the owner can clone the repository, run Wayra on an Android device or emulator and an iOS simulator, and see a working app shell: navigation, light and dark themes, two languages, a local database with migrations, a fake recorder that can start and stop a trip, and a diagnostics screen. CI is green and lint enforces the architecture rules from PRD 00.

Nothing in PRD 01 records real location. The point is to build the floor that every later PRD stands on, and to prove it with tests, so that the recording spike (PRD 02) can plug real recorders into a finished socket.

**Why this order:** every later feature depends on four things being right: the layering rules, the database, the recorder contract and the test harness. Fixing any of them later means touching every feature.

## 2. Scope

### In scope

- Bare React Native project with the New Architecture, TypeScript strict mode, laid out as in PRD 00 section 6.
- Tooling: ESLint with import-boundary rules, Prettier, Husky pre-commit hooks, Jest, GitHub Actions CI.
- Environment files and typed environment access.
- `AGENTS.md` and project docs that every agent session reads first.
- Domain skeleton: types, config module, stub pipeline with a stage registry, geo helpers, synthetic fixtures.
- Data layer: SQLite client, migration runner, schema version 1, repositories, idempotent point ingestion.
- Recorder port: the `TripRecorder` interface, a `FakeRecorder`, permission and map interfaces (interfaces only).
- Use-cases: start trip, end trip, pause, resume, recover active trip on launch.
- App shell: Redux store, navigation, theme tokens (light and dark), i18n (English and Hindi), unit and date formatting, error boundary and in-app logging.
- Diagnostics screen reachable in every build, including release builds.

### Out of scope (later PRDs)

- Any real recorder or location permission flow (PRD 02 and 04).
- Pipeline logic beyond the stub (PRD 05).
- Real map rendering (PRD 03 and 07).
- Real screens beyond the shell and diagnostics (PRD 06 and 07).
- Any backend call.

## 3. Work slices

The agent builds PRD 01 in six slices, one agent session each. The owner runs the matching steps of the test sheet (section 12) after each slice before the next starts.

| Slice | Content | Owner checks (test sheet steps) |
| --- | --- | --- |
| S1 | Project scaffold, tooling, env files, scripts | 1, 2, 3 |
| S2 | CI, `AGENTS.md`, docs folder, decision log | 11, 12 |
| S3 | Domain skeleton, geo helpers, fixtures, stub pipeline | none (automated tests only) |
| S4 | Data layer, migrations, repositories, ingestion | 6, 7 |
| S5 | Redux store, theme, i18n, navigation shell | 4, 5 |
| S6 | Recorder port, `FakeRecorder`, use-cases, diagnostics screen | 6, 7, 8, 9, 10 |

## 4. Choices the agent proposes and the owner approves

The agent must look up current versions and maintenance status, never rely on memory, and record each choice in `docs/decisions.md` with what was chosen, what was rejected and why. The owner approves in the pull request.

| Area | Requirements | Candidates to evaluate |
| --- | --- | --- |
| SQLite library | Write-ahead logging, New Architecture support, fast batched writes, database file reachable from native code later, actively maintained | op-sqlite, react-native-nitro-sqlite, others the agent finds |
| SQLite in tests | Run the same SQL in Node without a device | better-sqlite3 or Node's built-in SQLite module if the pinned Node version has it |
| i18n | Typed keys, plurals, fully offline | i18next with react-i18next, or the approach already used in the owner's template |
| Date and number formatting | Locale-aware, accepts a UTC offset per timestamp | Platform Intl APIs (check what Hermes supports) or a small library |
| UUIDv7 | Injectable clock and random source (R-02) | A small maintained package, or our own short implementation with tests |
| Import boundaries | Fail lint on forbidden imports | eslint-plugin-boundaries or import/no-restricted-paths |
| Component tests | Render and interact without a device | React Native Testing Library |

## 5. Repository and tooling requirements

- **F-01 Scaffold.** Bare React Native CLI project (no Expo), New Architecture enabled, TypeScript strict. Folder layout exactly as PRD 00 section 6. Pinned versions are recorded in `docs/decisions.md`.
- **F-02 Application ID.** The application ID and display name live in one documented place and are placeholders until the owner fixes them before the first store build.
- **F-03 Environments.** `.env.example`, `.env.staging`, `.env.uat`, `.env.production`. Typed access through `src/constants/env.ts`. Real env files are git-ignored; only `.env.example` is committed. No secrets exist yet.
- **F-04 Import boundaries.** ESLint enforces the rules in PRD 00 section 6 (`domain` imports nothing from other layers, React or React Native; `data` and `services` import `domain` only; `usecases` import domain, data and services; `store` and `hooks` import `usecases`; `screens` and `components` import `hooks`, `store` and components). A test file that violates each rule must fail lint, and CI runs that check.
- **F-05 Formatting and hooks.** Prettier, ESLint with no warnings allowed, Husky pre-commit running lint-staged plus a TypeScript check.
- **F-06 Tests.** Jest with two projects: a Node project for domain, data and use-case tests, and a React Native project for components. Domain code must reach at least 90 percent line coverage.
- **F-07 AGENTS.md.** The single entry point for agents. It states the read order (this PRD, PRD 00, then the current slice), a one-paragraph summary of rules R-01 to R-16, the exact commands for lint, typecheck, test and run, the definition of done, the NEEDS DEVICE VALIDATION convention, and the instruction to stop and ask when a PRD is unclear. `.claude` and `.cursor` rule files point to `AGENTS.md` instead of duplicating it.
- **F-08 Docs.** `docs/prd/` holds Markdown exports of PRD 00 and PRD 01 (the owner exports them from the doc editor), `docs/decisions.md` holds the decision log and choice records, `docs/db.md` documents the database file name, location and schema for any future native code, and `docs/CHANGELOG.md` is updated per slice.
- **F-09 Scripts.** `lint`, `typecheck`, `test`, `test:domain`, `db:check` (runs migrations on an empty database and prints the schema), `replay` (feeds a fixture through ingestion), `android`, `ios`.
- **F-10 CI.** GitHub Actions, on every push and pull request: install, lint including the boundary check, typecheck, all Jest projects, `db:check`, and an Android debug build whose APK is uploaded as a workflow artifact so the owner can install it on a real phone. The iOS simulator build runs on a manual or nightly trigger only, because macOS runners cost more; the agent checks the current runner limits and documents the choice.

## 6. Domain skeleton requirements

All code lives in `src/domain`, is pure (R-02) and runs in Node (R-16).

- **D-01 Types.** `RawPoint`, `TripMeta`, `Track`, `Segment`, `DayStat`, `TripStats`, `SimplifiedRoute`, `UserEdit`, `PipelineConfig`, `PipelineInput`, `PipelineResult` (with an `extras` map), `Vehicle`, `MotionMode`. Field names and units follow PRD 00 sections 8 to 10 and rule R-08.
- **D-02 Config module.** One typed `pipelineConfig` with documented defaults (R-12). Values that PRD 05 will decide are marked as placeholders with a comment saying which PRD sets them.
- **D-03 Pipeline stub.** `runPipeline` returns an empty but valid `PipelineResult` with version `0.0.0-stub`. Stages are registered in one ordered list (PRD 00 section 10); the stub registers identity stages. A test proves stages run in order and that unknown stage output lands in `extras`.
- **D-04 Geo helpers.** Haversine distance, bearing, polyline encode and decode, with tests against known values.
- **D-05 Fixtures.** A generator script produces three synthetic tracks as JSON: a straight line at constant speed, a loop with a ten-minute stop, and a noisy track with a gap. Fixture format: an array of raw points plus optional expected stats. A loader in `tools/` and `__tests__/` reads them. Real recorded tracks are added by later PRDs.
- **D-06 ID generation.** UUIDv7 generation takes a clock and random source as arguments. Domain code never creates IDs itself; the layer that calls it supplies them.

## 7. Data layer requirements

- **DB-01 Client.** One database file, `wayra.db`, in app-private storage. On open: write-ahead logging on, foreign keys on, a busy timeout set. A small `DbClient` interface (query, execute, transaction) has two implementations: the device implementation and a Node implementation for tests. Both run the same SQL.
- **DB-02 Migrations.** Forward-only numbered SQL files. A runner records applied migrations with checksums in `schema_migrations`, is idempotent, and runs at startup before any screen renders. A failed migration shows an error screen with the log, never a crash loop. Tests: empty database to latest, step by step through every version, and a stored snapshot of the previous version upgrading to the current one (the harness exists from version 1 even though only one version exists yet).
- **DB-03 Schema version 1.** All tables and columns from PRD 00 section 8: `tracks`, `points`, `recording_log`, `trips`, `user_edits`, `segments`, `days`, `trip_stats`, `routes_simplified`. Plus one table added by this PRD: `app_settings` (`key`, `value`, `updated_at`) for theme, language and unit preferences, so no extra storage library is needed. PRD 00 section 8 is updated when this PRD is approved. Required indexes: unique on `points(track_id, seq)`, plus `points(trip_id, ts)`, `recording_log(ts)`, `segments(trip_id, start_ts)` and `user_edits(trip_id, created_at)`.
- **DB-04 Raw data protection (R-04).** The database itself must reject any UPDATE of a `points` row, and must allow DELETE of points only as part of deleting their trip. The agent proposes the mechanism (for example triggers), documents it, and tests that violations fail.
- **DB-05 Repositories.** Interfaces in `src/data`, with implementations over `DbClient`: `TripRepo` (create, get, list, update status, soft delete, hard delete), `TrackRepo`, `PointRepo` (append batch, read by trip in order, count, last point), `RecordingLogRepo` (append, list recent, filter by event), `SettingsRepo`, `DerivedRepo` (replace all derived rows for a trip in one transaction). Sync columns from R-11 are filled correctly even though no sync exists.
- **DB-06 Ingestion.** `ingestPoints(trackId, fixes)` is idempotent (dedupe on track, timestamp and coordinates), assigns the increasing `seq`, writes in batches inside short transactions, tolerates out-of-order input, and returns counts of inserted and skipped points. It logs a summary to `recording_log`. A performance test ingests 100,000 points in Node and records the baseline time; the CI flags a regression of more than double.
- **DB-07 Log events.** `recording_log` event names are an exported constant list matching PRD 00 section 8, so native code can reuse the same names later.

## 8. Recorder port and use-cases

- **P-01 Interface.** `TripRecorder` exactly as in PRD 00 section 9, in `src/services/recorder`. `PermissionsService` and `MapProvider` exist as interfaces only.
- **P-02 FakeRecorder.** Implements the full state machine (idle, recording, paused, recovering). It can replay a fixture into ingestion at a chosen speed, simulate a gap, simulate a process kill, and emit health updates. It is used by tests, by UI development without a phone, and by the diagnostics screen.
- **P-03 Use-cases** in `src/usecases`, each with tests against the Node database and `FakeRecorder`:
  - `StartTrip`: creates the trip and its single live track, starts the recorder, rejects starting a second trip while one is active (PRD 00 section 12).
  - `PauseTrip`, `ResumeTrip`, `EndTrip`: valid transitions only, each writing a `recording_log` event.
  - `RecoverActiveTrip`: runs on every launch. If an active trip exists and the recorder is not running, it logs `process-killed-detected`, enters recovering, restarts the recorder and logs `recovered`.

## 9. App shell requirements

- **A-01 Redux store.** Redux Toolkit (D-012). Slices: `app` (hydration flag, theme mode, language, units), `recorder` (health), `tripsUi` (selected trip, edit mode). Persistent data is never copied into the store. Settings are saved through `SettingsRepo`, not a persistence library. Recorder health updates are throttled to at most one per second before reaching the store. Typed hooks are exported.
- **A-02 Navigation.** React Navigation. Two tabs, Trips (empty state with a placeholder call to action) and Settings. Settings contains theme, language, units and a Diagnostics entry. Diagnostics must be reachable in every build, including release and TestFlight builds, because the owner field-tests those.
- **A-03 Theme.** Tokens for colours, spacing, radii and typography, defined once in `src/constants`. Light and dark variants. Modes: system, light, dark; the choice persists. Components use tokens only, never raw colour values (a lint rule or test checks this).
- **A-04 i18n.** English default and Hindi as the second language, which proves the pipeline works for a non-Latin script. No user-facing string appears in a screen or component outside the locale files (lint rule or test). Plural forms work.
- **A-05 Formatting helpers** in `src/utils`: `formatDistance`, `formatDuration`, `formatSpeed`, `formatAltitude`, `formatDateTime`, honouring the unit setting, the locale and a per-timestamp UTC offset (D-017). Unit-tested, including negative offsets and half-hour offsets.
- **A-06 Errors and logs.** A root error boundary with a recovery screen. An in-memory ring buffer of the last 500 app log lines, shown in Diagnostics. A logger that writes to the console in development only.

## 10. Diagnostics screen

One screen, reachable from Settings in all builds, with these sections:

- **Build info:** app version and build number, environment, React Native version, New Architecture flag, OS and version, device model.
- **Recorder health:** live values from the store: state, active trip, last point time, points in the last minute, power mode, battery, permissions, issues.
- **Database:** file path, size, schema version, row count per table.
- **Recording log:** the latest 200 events, filter by event name, a button that shares the log as plain text through the system share sheet.
- **App log:** the ring buffer.
- **Actions:** Seed sample trip from a fixture; Start, pause, resume and end a fake trip; Simulate gap; Simulate process kill; Reset database (asks for confirmation and is hidden in production builds).

## 11. Acceptance criteria

- **AC-01** Given a fresh clone, when the documented setup commands run, then the app builds and launches on an Android device or emulator and an iOS simulator.
- **AC-02** Given the repository, when lint runs on a file that violates any import rule from F-04, then lint fails; and CI runs this check on every push.
- **AC-03** Given an empty database, when the app starts, then all migrations apply and Diagnostics shows schema version 1 with zero rows in every table.
- **AC-04** Given a database snapshot from a previous schema version, when migrations run, then it upgrades with no data loss (harness test).
- **AC-05** Given a `points` row, when any code tries to UPDATE it, then the database rejects the change; and when its trip is hard-deleted, then its points are deleted with it.
- **AC-06** Given a batch containing duplicates and out-of-order points, when ingested twice, then the table holds each point once and `seq` is strictly increasing.
- **AC-07** Given 100,000 points, when ingested, then the baseline time is recorded and later runs fail CI above double that time.
- **AC-08** Given an active trip, when the owner tries to start another, then the action is refused with a clear message and a log entry.
- **AC-09** Given a fake trip is active and the process is killed, when the app relaunches, then it logs `process-killed-detected`, recovers, and Diagnostics shows the recovered state.
- **AC-10** Given the theme set to dark and the language set to Hindi, when the app is restarted, then both persist and every visible string is in Hindi.
- **AC-11** Given the unit setting changed from metric to imperial, when the sample trip is shown in Diagnostics, then distances and speeds change accordingly.
- **AC-12** Given a release build, when Settings is opened, then Diagnostics is reachable and the Reset database action is absent.
- **AC-13** Given any push to the main branch, when CI finishes, then lint, typecheck, tests, `db:check` and the Android debug build pass and the APK is attached as an artifact.
- **AC-14** Domain code reaches at least 90 percent line coverage.

## 12. Owner test sheet

The owner fills the Result column. Steps are grouped by the slice they belong to (section 3).

| Step | Do this | Expect | Result |
| --- | --- | --- | --- |
| 1 | Follow the README setup on your Mac | Install finishes with no errors |  |
| 2 | Run on an Android emulator or phone | App opens on the Trips tab with an empty state; a Settings tab exists |  |
| 3 | Run on an iOS simulator | Same as step 2 |  |
| 4 | In Settings, switch theme between system, light and dark; restart the app | Colours change immediately and the choice survives the restart |  |
| 5 | Switch language to Hindi and units to imperial | All visible text changes; no English leftovers outside of names |  |
| 6 | Open Settings, then Diagnostics | Build info is correct, schema version is 1, all table counts are 0 |  |
| 7 | Tap Seed sample trip, then kill and relaunch the app | One trip and the fixture's number of points remain after restart |  |
| 8 | Start a fake trip, tap Simulate gap, then End | Health shows recording; a gap event appears in the log; state returns to idle |  |
| 9 | Start a fake trip, then try to start another | Second start is refused with a message |  |
| 10 | Start a fake trip, force-quit the app, reopen it | Log shows `process-killed-detected` then `recovered`; trip is still active |  |
| 11 | Push a trivial commit | CI turns green |  |
| 12 | Download the Android APK artifact from CI and install it on a real phone | App installs and opens; Diagnostics is reachable |  |

## 13. Owner decisions needed

- **OD-1 Second language.** Hindi is proposed to prove non-Latin text works. Confirm Hindi, or name another language.
- **OD-2 OS backup of the database.** Android and iOS may back up app data to cloud storage. Including the database lowers the risk of losing every trip with a lost phone (PRD 00 risk 6) but puts location history into the user's own cloud backup. Recommendation: include it and say so in the privacy text. The agent first documents what each OS does by default.
- **OD-3 Application ID.** Choose the identifier format (for example a reverse-domain you control) before the first store build.
- **OD-4 CI provider.** GitHub Actions is assumed because the owner's template already has a `.github` folder.

## 14. Risks

1. A SQLite library that does not expose its file to native code would block a future in-house recorder. The selection criteria in section 4 cover this.
2. New Architecture compatibility of third-party libraries. Each library choice records its status.
3. iOS builds need a Mac with Xcode 26 or later (PRD 00, D-022), and macOS CI minutes cost more than Linux, so iOS CI is manual or nightly.
4. Lint rules for strings and colours can be noisy; the agent tunes them with the owner rather than disabling them.

## 15. Definition of done and handoff

PRD 01 is done when AC-01 to AC-14 pass, the owner has completed the test sheet, the decision log records every choice from section 4, and PRD 00 section 8 has been updated with `app_settings`.

**Handoff to PRD 02:** the recording spike plugs candidate recorders into the `TripRecorder` interface behind the same Diagnostics screen, so their health, gaps and ingestion can be compared on real phones without building any new UI.
