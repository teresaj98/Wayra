# Changelog

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
