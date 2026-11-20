# Changelog

## S3: Domain skeleton, geo helpers, fixtures, stub pipeline (PRD 01, 20 Nov 2026)

- Domain types in `src/domain/types` (D-01): `RawPoint`, `RawFix`, `TripMeta`, `Track`, `Segment`, `DayStat`, `TripStats`, `SimplifiedRoute`, `UserEdit`, `PipelineConfig`, `PipelineInput`, `PipelineResult` (with `extras`), `Vehicle`, `MotionMode`, and `PointFlag` bits.
- One typed, frozen `pipelineConfig` with placeholder values for PRD 05 (D-02, R-12).
- `runPipeline` stub returning an empty valid result, version `0.0.0-stub`, with the eight stages of PRD 00 section 10 registered in order as identity stages; unknown stage output goes to `extras` (D-03).
- Geo helpers: haversine distance, bearing, destination point, path length, polyline encode and decode, tested against Rosetta Code and Google's published values (D-04).
- Three deterministic synthetic fixtures in `fixtures/` from `npm run fixtures:generate`, a loader in `tools/fixtures`, and a test that keeps the files in step with the generator (D-05).
- Our own UUIDv7 with injected clock and random source, tested against the RFC 9562 example (D-06).
- Jest split into `node` and `react-native` projects; `npm test` enforces 90 percent line coverage on `src/domain` (F-06, AC-14). Domain coverage is 100 percent of lines.
- Lint rules and a self-check that keep clocks, randomness and host globals out of `src/domain` (R-02).
- Choices recorded in `docs/decisions.md` (DEC-S3-01 to DEC-S3-11), plus four open questions for the owner.

## Branching and manual CI (20 Nov 2026)

- New `dev` branch from `main`; all further work on feature branches from `dev` (DEC-S2-11).
- CI and the iOS build run only by hand on `dev`; no push, pull request or nightly triggers.

## S2: CI, AGENTS.md, docs folder, decision log (PRD 01, 19 Nov 2026)

- GitHub Actions CI on every push and pull request (`.github/workflows/ci.yml`): lint (with the boundary and identity checks), typecheck, tests, `db:check`, and an Android debug APK uploaded as a workflow artifact (F-10, AC-13).
- iOS simulator build on a manual or nightly trigger (`.github/workflows/ios.yml`) on `macos-26` with Xcode 26.6 (F-10). Not run yet.
- The CI debug APK embeds the JS bundle (`-PwayraEmbedJsInDebug`), so it opens on a phone without Metro (DEC-S2-06). Local builds are unchanged.
- `AGENTS.md` is the agent entry point; `CLAUDE.md` and `.cursor/rules/wayra.mdc` point to it (F-07).
- `docs/db.md` placeholder, to be completed in S4 (F-08). `docs/decisions.md` now explains how the decision log is organised.
- README: CI section; agents start at `AGENTS.md`.
- Choices recorded in `docs/decisions.md` (DEC-S2-01 to DEC-S2-10), including runner images, costs and action SHAs.

## S1 follow-ups (19 Nov 2026)

- OD-1 recorded: English is the only language; the i18n layer stays with one English locale.
- Android builds run on a Gradle-provisioned Java 25 (`android/gradle/gradle-daemon-jvm.properties`, DEC-S1-17). The app built and ran on an Android emulator (test step 2).
- README: Java step updated and a troubleshooting section added.

## S1: Project scaffold, tooling, env files, scripts (PRD 01, 19 Nov 2026)

- Bare React Native 0.88.1 project (New Architecture, Hermes, TypeScript strict), placeholder ID `com.wayra.placeholder` (F-01, F-02).
- Folder layout from PRD 00 section 6 (empty folders hold a `.gitkeep`).
- Environments: `.env.example` committed; `.env.staging`, `.env.uat` and `.env.production` git-ignored and created by `npm run env:init`; typed access through `src/constants/env.ts` (F-03).
- ESLint 9 flat config with layer import boundaries, plus a 240-case self-check that runs in `npm run lint` (F-04).
- Prettier; Husky pre-commit running lint-staged and a TypeScript check (F-05).
- Scripts: `lint`, `typecheck`, `test`, `test:domain`, `db:check` (stub until S4), `replay` (stub until S4), `android`, `ios` (+ `:uat`, `:prod`) (F-09).
- `CLAUDE.md` as the temporary agent entry point until `AGENTS.md` (S2).
- Choices recorded in `docs/decisions.md` (DEC-S1-01 to DEC-S1-16).
