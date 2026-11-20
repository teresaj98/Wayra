# Decisions and choice records

This file is Wayra's decision log (PRD 01 F-08). It has three parts:

1. **Project decisions D-001 to D-023**: kept in PRD 00 section 4 (`docs/prd/PRD-00.md`), the owner's
   export, which agents do not edit. They are not copied here, so there is one copy only (DEC-S2-09).
2. **Choice records per slice** (`DEC-S<slice>-<n>`): what the agent chose, what it rejected and why
   (PRD 01 section 4). The owner approves them in the pull request.
3. **Owner decisions** on PRD open questions (`OD-<n>`), at the end of this file.

A new project-level decision (one that changes PRD 00) is proposed here as a `DEC-` entry and copied into
PRD 00 section 4 by the owner at the next export.

Status key: **Proposed** (awaiting owner approval in the PR), **Owner decision** (answered by the owner).

---

## Slice S1: project scaffold, tooling, env files, scripts (19 Nov 2026)

All versions were looked up on the npm registry, nodejs.org and the official docs on 19 Nov 2026.

### DEC-S1-01 Version pinning policy (Proposed)

- **Chosen:** exact versions in `package.json` (`.npmrc` sets `save-exact=true`), with committed lockfiles
  (`package-lock.json`, `Gemfile.lock`, `ios/Podfile.lock`). Each package gets its **newest stable release
  that is at least 14 days old** (cutoff 5 Nov 2026).
- **Rejected:** caret ranges (builds drift between machines); "latest on the day" (several tools shipped
  patches 4 to 9 days ago, and a short delay lowers supply-chain risk).
- **Exception:** packages pinned by the React Native template (`react`, `react-test-renderer`, the
  `@react-native/*` packages and the CLI) keep the template's exact versions, because React Native is
  tested against them.

### DEC-S1-02 React Native 0.88.1, bare CLI, New Architecture (Proposed; implements D-001, D-021)

- **Chosen:** `react-native` 0.88.1 (released 27 Oct 2026), generated with `@react-native-community/cli`
  20.2.0 from `@react-native-community/template` 0.88.1. React 19.3.0, as pinned by the template.
  `newArchEnabled=true` and `hermesEnabled=true` (template defaults). Removed the template's
  `@react-native/new-app-screen`; kept `react-native-safe-area-context`, updated to 5.11.1.
- **Rejected:** 0.89.0-rc.2 (prerelease). CLI 21.0.0, because the 0.88.1 template pins CLI 20.2.0.
  React 19.3.1, because the React Native renderer expects the exact React version it ships with.
  Expo (D-021).

### DEC-S1-03 Node 26 LTS (Proposed)

- **Chosen:** Node **26.13.0** in `.nvmrc` (Active LTS "Lithium", 28 Oct 2026). `engines` accepts
  `^24.3.0 || ^26.0.0`, matching React Native 0.88.1's own range, and `engine-strict=true` enforces it.
- **Rejected:** 26.13.1 (9 days old). Node 24 as the target (Maintenance LTS since Oct 2026, but still accepted).
- **Note:** local verification in S1 ran on Node 24.14.0, the version already on the owner's Mac.

### DEC-S1-04 npm as package manager (Proposed)

- **Chosen:** npm (11.9.0 locally), the template's default and the only manager installed.
- **Rejected:** Yarn and pnpm (an extra tool to install, and no benefit at this size).

### DEC-S1-05 TypeScript 6.0.3, strict (Proposed)

- **Chosen:** TypeScript 6.0.3. `tsconfig.json` extends `@react-native/typescript-config` (already strict)
  and also sets `"strict": true` explicitly (F-01).
- **Rejected:** TypeScript 7.0.2. typescript-eslint 8.x (used by the React Native ESLint config) supports
  only `<6.1.0`.

### DEC-S1-06 Jest 29.7.0 (Proposed)

- **Chosen:** Jest 29.7.0 with `@react-native/jest-preset` 0.88.1, which depends on Jest 29.
  `roots` is `src` and `__tests__`, so mocks of npm packages live in `src/__mocks__` as PRD 00 section 6 lays out.
- **Rejected:** Jest 30.5.2 (the React Native preset still targets Jest 29).
- **Note:** S3 splits this into Node and React Native projects (F-06).

### DEC-S1-07 ESLint 9.39.5 with React Native's flat config (Proposed; needs owner attention)

- **Chosen:** ESLint **9.39.5** with `@react-native/eslint-config/flat` 0.88.1, `--max-warnings=0` (F-05).
- **Known issue 1, ESLint 9 is end-of-life since 6 Aug 2026.** ESLint 10 is current, but React Native's
  config and `@babel/eslint-parser` only declare support for ESLint 8 or 9.
- **Known issue 2, the Flow plugin crashes.** React Native's config enables `eslint-plugin-ft-flow` 2.0.3
  on every `.js` file, and that plugin calls an API ESLint 9 removed. Wayra has no Flow code, so
  `eslint.config.js` switches all `ft-flow/*` rules off for `.js` files. No other rule is disabled.
- **Rejected:** ESLint 10 with a hand-written config replacing React Native's (loses React Native's
  maintained rule set; not the boring option). ESLint 8 (end-of-life longer, legacy config format).
- **Revisit:** when `@react-native/eslint-config` declares ESLint 10 support.

### DEC-S1-08 Import boundaries: eslint-plugin-boundaries 7.4.2 (Proposed; layer map is an owner decision)

- **Chosen:** `eslint-plugin-boundaries` 7.4.2 with `default: 'disallow'`, `checkAllOrigins` and
  `checkUnknownLocals`. One element per `src` folder.
- **Rejected:** `import/no-restricted-paths` (needs a separate zone per forbidden pair and a second
  mechanism for npm packages, while boundaries does both with default-deny).
- **Layer map** (PRD 00 section 6). Folders the PRD does not cover were mapped by **owner decision**
  (19 Nov 2026):

  | From                                              | May import (its own folder always allowed)                                                                                                  |
  | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
  | domain                                            | nothing; also blocked: React, React Native, `react-native-*`, `@react-native*`, SQLite libraries, axios, Supabase, Redux, Node core modules |
  | data, services                                    | domain                                                                                                                                      |
  | usecases                                          | domain, data, services, leaves                                                                                                              |
  | store, hooks                                      | usecases, leaves                                                                                                                            |
  | screens                                           | hooks, store, components, leaves                                                                                                            |
  | components                                        | hooks, store, leaves                                                                                                                        |
  | navigation                                        | screens, components, hooks, store, leaves                                                                                                   |
  | leaves (constants, utils, types, locales, assets) | leaves                                                                                                                                      |
  | api                                               | nothing until Part 3                                                                                                                        |

  Files outside `src` (`App.tsx`, `index.js`, tests, scripts) are the composition root and are not checked.

- **Proof (F-04):** `scripts/check-boundaries.js` runs inside `npm run lint`. It lints a probe import for
  every pair of folders (225), the banned domain packages (13), a stray `src` file and an allowed
  package: 240 cases. It compares them with its own expected table, so loosening the ESLint config makes
  lint fail. This was tested by adding `domain → data` to the config; lint failed.
- **Heads-up for S5/S6:** as the PRD states, `hooks` may not import `store`, and `store` and `hooks` may not
  import `domain` types directly. If typed Redux hooks or shared types need this, the slice must propose a change.

### DEC-S1-09 Prettier 3.9.10 (Proposed)

- **Chosen:** Prettier 3.9.10 with the template's settings (single quotes, trailing commas, no
  parentheses around single arrow-function parameters). `docs/prd/` is excluded so the exported PRDs
  stay unchanged.
- **Rejected:** 2.8.8 (the template's pin, a 2023 major line). 3.10.1 (7 days old).

### DEC-S1-10 Husky 9.1.7 and lint-staged 17.6.0 (Proposed)

- **Chosen:** the pre-commit hook runs `lint-staged` (ESLint with `--fix` and Prettier on staged files) and
  then `npm run typecheck` on the whole project (F-05). `npm install` installs the hook through `prepare`.
- **Rejected:** lint-staged 17.6.1 (4 days old). Running the full test suite on every commit (slow; CI runs it from S2).

### DEC-S1-11 Environments: react-native-config 1.7.2 (Proposed; dev default is an owner decision)

- **Chosen:** `react-native-config` 1.7.2 (New Architecture TurboModule, MIT, updated Aug 2026). npm
  scripts select the file with `ENVFILE`. Typed, validated access is through `getEnv()` in
  `src/constants/env.ts`; nothing else reads `react-native-config`.
- **Owner decision:** plain `npm run android` / `npm run ios` use `.env.staging`; `:uat` and `:prod`
  variants exist. No `.env` and no development file.
- **Guard:** if the file `ENVFILE` names is missing, react-native-config silently falls back to `.env`.
  `scripts/env.js check <name>` therefore runs before every run script and stops with a clear message.
  `npm run env:init` creates the three git-ignored files from `.env.example`.
- **Rejected:** `react-native-dotenv` 5.0.0. It inlines values through Babel, so switching environments
  needs a Metro cache reset, and native code (Gradle, Xcode) cannot read the values.
- **Open item:** a build started from Xcode directly (not from the npm scripts) has no `ENVFILE`; the app
  then stops at launch with the `getEnv()` error. Release and TestFlight builds will need a per-configuration
  mapping in the Podfile (react-native-config README, "Per build configuration"). That belongs to the
  first release-build work, not S1.

### DEC-S1-12 App identity in app.json (Proposed; values are placeholders, OD-3 open)

- **Chosen:** `app.json` is the one documented place (F-02): `displayName` "Wayra", `applicationId` and
  `bundleIdentifier` `com.wayra.placeholder`. Gradle and Xcode need literal values, so
  `scripts/app-identity.js` checks the four native copies (`android/app/build.gradle`, `strings.xml`,
  `project.pbxproj`, `Info.plist`) inside `npm run lint`. `npm run identity:apply` writes them.
  `app.json` `name` ("Wayra") is the JS component name and is not part of the identity.
- **Rejected:** Gradle reading `app.json` directly (iOS cannot do the same, so there would be two mechanisms).
- **Note:** the Android Kotlin package and `namespace` stay `com.wayra.placeholder`; they are code
  packages and need not change with the store ID (`proguard-rules.pro` refers to the namespace).

### DEC-S1-13 Native toolchain on the owner's Mac (Proposed)

- **iOS:** Xcode 26 or later (D-022). The template's minimum iOS version is kept: 15.1.
- **Ruby/CocoaPods:** the system Ruby 2.6.10 and Bundler 1.17.2, as React Native's docs recommend. CocoaPods
  1.15.2 is installed into `vendor/bundle` and pinned in `Gemfile.lock` (resolved within the template's
  `Gemfile` limits). `pod install` needs `LANG=en_US.UTF-8`, otherwise CocoaPods fails with an encoding error.
- **Android:** the build runs on Java 25 provisioned by Gradle (see DEC-S1-17); any installed JDK 17 or newer
  only starts the Gradle wrapper. Android SDK levels are the template's own: compileSdk 37, build-tools 37.0.0, targetSdk 36 (D-022),
  minSdk 24.
- **Rejected:** a Homebrew or rbenv Ruby (an extra tool; the system Ruby works).

### DEC-S1-14 S1 placeholder screen (Owner decision)

PRD 01 maps test-sheet steps 2 and 3 to S1, but their expected result (Trips and Settings tabs) needs the
navigation shell from S5. S1 shows one placeholder screen with the app name and the active environment.
For S1, steps 2 and 3 pass when the app opens on each platform and shows `Environment: staging`. The full
expectation is re-checked after S5. The screen's text is not translated and its colours are not themed
yet (S5 adds i18n and theme tokens).

### DEC-S1-15 Placeholder scripts (Proposed)

`db:check` and `replay` (F-09) print `SKIPPED: … arrives in slice S4` and exit 0, so script names are stable
and CI (S2) can call them before S4. `test:domain` uses `--passWithNoTests` until S3 adds domain tests.

### DEC-S1-16 PRD location (Owner decision)

The Markdown PRDs moved to `docs/prd/PRD-00.md` and `docs/prd/PRD-01.md` (formally F-08, S2).

### DEC-S1-17 Gradle runs the Android build on its own Java 25 (Owner decision, 19 Nov 2026)

- **Chosen:** keep `android/gradle/gradle-daemon-jvm.properties` (`toolchainVersion=25`), which Android Studio
  generated when it opened the project. Gradle 9.4.1 downloads an Eclipse Adoptium JDK 25 into `~/.gradle/jdks`
  (download links from foojay.io, listed in the file) and runs every Android build on it, whatever Java the
  machine has. The owner's Mac only had Oracle JDK 27, which Gradle cannot use ("Unsupported class file major
  version 71"); with this file the build succeeded and the app ran on an emulator.
- **Rejected:** Java 17 as React Native's docs recommend, either installed by hand (`JAVA_HOME`) or through
  this file. Kept 25 because it is what was verified to build and run, and every machine (and CI from S2)
  gets the same Java automatically.
- **Risk:** React Native's docs say JDKs newer than 17 "may" cause problems. If a native build breaks for
  that reason, set `toolchainVersion=17` (Gradle also provisions 17).
- **Gotcha:** a Gradle daemon started by Android Studio cannot find `node` (macOS apps launched from the Dock
  do not see `/usr/local/bin`). If a terminal build fails with "A problem occurred starting process 'command
  'node''", run `./gradlew --stop` in `android/` and build again from the terminal.

---

## Slice S2: CI, AGENTS.md, docs folder, decision log (19 Nov 2026)

Versions, runner images and prices were looked up on 19 Nov 2026 on the GitHub API (release dates and tag
commits), the `actions/runner-images` readmes and the `github/docs` source. The pinning cutoff (DEC-S1-01) was 5 Nov 2026.

### DEC-S2-01 CI layout: GitHub Actions, two workflows (Proposed; provider is OD-4)

- **Chosen:** `.github/workflows/ci.yml` runs on every `push` (any branch) and `pull_request` with two jobs
  in parallel: **checks** (`npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --ci`, `npm run db:check`)
  and **android** (debug APK, uploaded as an artifact). `.github/workflows/ios.yml` holds the iOS simulator build
  (DEC-S2-03). Both use `permissions: contents: read`, a per-branch `concurrency` group that cancels outdated
  runs, job timeouts, and `HUSKY=0` so no git hooks are installed on CI machines.
- **Rejected:** one job doing everything (a lint error would hide whether the native build works, and it is
  slower); running the Android job only after checks pass (later feedback; minutes are free, DEC-S2-02).

### DEC-S2-02 Runner images and cost (Proposed)

- **Chosen:** `ubuntu-24.04` for the checks and Android jobs, and `macos-26` (Apple silicon) for iOS. Both
  are named explicitly instead of `-latest`, because GitHub announced that `ubuntu-latest` moves to Ubuntu 26.04
  in November 2026. `ubuntu-24.04` has Android SDK Platform 37, Build-Tools 37.0.0 and JDK 17 (default)
  preinstalled; NDK 27.1.12297006 (the template's) is not, so Gradle downloads it on each run (about a minute).
  `macos-26` (image 20261102) has Xcode 26.6 as the default, plus 26.0.1 to 26.5, which meets D-022.
- **Cost:** the repository `teresaj98/Wayra` is **public**, and GitHub's docs say standard GitHub-hosted
  runners are free in public repositories, macOS included. Each job may run up to 6 hours; the Free plan
  allows 20 concurrent jobs, at most 5 on macOS. **If the repository is made private**, usage is billed against
  the Free plan's included $12 USD per month: Linux 2-core is $0.006 per minute (about 2,000 minutes) and
  macOS is $0.062 per minute (about 190 minutes, roughly 10 times Linux). A nightly iOS build of about 20 to
  25 minutes would then cost about $40 a month, so the nightly schedule should be removed (manual runs only).
  Artifact storage on the Free plan is 500 MB for private repositories; DEC-S2-05 keeps 14 days.
- **Rejected:** larger runners (billed even for public repositories); Ubuntu 26.04 (newer, and not needed yet).

### DEC-S2-03 iOS simulator build: manual or nightly (Proposed)

- **Chosen:** `ios.yml` runs on `workflow_dispatch` (Actions tab → iOS simulator build → Run workflow) and
  nightly at 21:30 UTC (03:00 IST); GitHub recommends avoiding the start of the hour for schedules. Scheduled
  runs use the default branch (`main`). Steps: `npm ci`, `npm run env:init`, Ruby with Bundler cache,
  `bundle exec pod install` (with `LANG=en_US.UTF-8`), then `xcodebuild` for the `Wayra` scheme, Debug,
  `generic/platform=iOS Simulator`, no code signing, with `ENVFILE=.env.staging` (react-native-config reads
  it at build time). The build output is not uploaded: nobody installs a simulator build from CI.
- **Rejected:** iOS on every push (PRD 01 F-10 says manual or nightly only); a Release simulator build
  (slower, and Debug proves the native project and pods compile); booting a simulator and launching the app
  (a later slice can add it when there are UI tests).
- **Not yet verified:** this workflow has never run. Xcode is not yet installed on the owner's Mac, so the
  iOS project itself has not been built anywhere yet (test step 3 is still open).

### DEC-S2-04 Actions pinned by commit SHA (Proposed)

Each action uses its newest stable release that is at least 14 days old, referenced by the full commit SHA
with the tag as a comment. Dependabot or Renovate is not set up; updating a pin means repeating the lookup.

| Action                        | Tag      | Released    | Commit SHA                                 |
| ----------------------------- | -------- | ----------- | ------------------------------------------ |
| `actions/checkout`            | v7.0.1   | 20 Jul 2026 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node`          | v7.1.0   | 8 Oct 2026  | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `gradle/actions/setup-gradle` | v6.4.1   | 28 Oct 2026 | `8da46b539cd8fe6ab27ca75128919a18d757604c` |
| `actions/upload-artifact`     | v7.0.2   | 7 Oct 2026  | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| `ruby/setup-ruby`             | v1.336.0 | 30 Oct 2026 | `de492cf36cbab201753d720ce4f4e336cd688c94` |

- **Rejected:** tag references such as `@v7` (a tag can be moved to different code); `ruby/setup-ruby`
  v1.337.0 and later (under 14 days old); `actions/setup-java` (not needed: the runner's JDK 17 starts the
  Gradle wrapper, and Gradle provisions Java 25 itself, DEC-S1-17); `actions/cache` directly (setup-node and
  setup-gradle already cache).

### DEC-S2-05 Install, caching and the APK artifact (Proposed)

- **Chosen:** Node from `.nvmrc` (26.13.0) through setup-node, with its npm cache; `npm ci` from the committed
  lockfile. Gradle caching through `setup-gradle` with `cache-provider: basic` (the MIT-licensed wrapper over
  `actions/cache`). The env files are created with `npm run env:init`, then checked with
  `node scripts/env.js check staging`. The APK is uploaded as `wayra-staging-debug-apk-<run number>`, kept for
  14 days, and the job fails if the file is missing. It contains all four ABIs (about 127 MB unzipped),
  so it also installs on emulators.
- **Rejected:** setup-gradle's default "Enhanced Caching" provider (proprietary, though free for public
  repositories; the open-source option is the boring one); an arm64-only APK (smaller, but fails on x86_64
  emulators); the 90-day default retention (each APK is large; rebuild by re-running the workflow).

### DEC-S2-06 The CI debug APK embeds the JS bundle (Owner decision, approved 20 Nov 2026)

- **Problem:** by default React Native does not put the JS bundle into **debug** APKs; they load JS from
  Metro on the developer's Mac. Installed on a phone straight from CI, such an APK shows a red "Unable to load
  script" error. PRD 01 F-10 asks for a debug build, and test step 12 expects it to open on a real phone.
- **Chosen:** an opt-in Gradle property. `android/app/build.gradle` sets `debuggableVariants = []` only when
  the build is started with `-PwayraEmbedJsInDebug`, which CI passes. The debug APK then contains
  `assets/index.android.bundle`. When Metro is reachable (local development), React Native 0.88 still loads
  from Metro first (`ReactHostImpl`); otherwise it uses the embedded bundle. Local builds without the flag
  are unchanged.
- **Verified:** built locally with the flag (the APK contains the bundle, about 1 MB); it installed on the
  Android emulator and showed "Wayra" and "Environment: staging". This was not a clean test without Metro,
  because Metro was running on the Mac at the time. **NEEDS DEVICE VALIDATION** (test step 12).
- **Rejected:** building the release variant instead (the template signs it with the debug key, but PRD 01
  says debug build, and release changes behaviour such as the dev menu); embedding the bundle in every local
  debug build (slows every `npm run android`).

### DEC-S2-07 Ruby on the iOS runner: 2.6.10, same as the owner's Mac (Proposed)

- **Chosen:** `ruby/setup-ruby` with Ruby `2.6.10` and `bundler-cache: true`. `Gemfile.lock` was written by
  Ruby 2.6.10 and Bundler 1.17.2 (DEC-S1-13), so CI installs exactly the locked CocoaPods 1.15.2 and its gems.
  ruby-builder publishes a 2.6.10 build for macOS arm64.
- **Rejected:** the runner's preinstalled Ruby 3.4.12 and Bundler 4.0.23. Bundler 4 would rewrite the lockfile
  made by Bundler 1.17.2, and the gems locked for Ruby 2.6 (json 2.7.6, ffi 1.17.4) are untested there.
  The runner's preinstalled CocoaPods 1.17.0 (not the locked version).
- **Risk:** Ruby 2.6 has been end-of-life since 2022. If setup-ruby stops offering it on `macos-26`, move both
  the owner's Mac and CI to a current Ruby (3.3 or 3.4) and re-lock the Gemfile in one change.

### DEC-S2-08 AGENTS.md and pointer files (Proposed)

- **Chosen:** `AGENTS.md` at the root is the only file with agent instructions (F-07): read order, a summary
  of R-01 to R-16, commands, definition of done, the NEEDS DEVICE VALIDATION convention, and stop-and-ask.
  `CLAUDE.md` holds two sentences and `@AGENTS.md` (Claude Code imports the file). `.cursor/rules/wayra.mdc`
  uses `alwaysApply: true` and points to `AGENTS.md`. The `.gitkeep` files in `.cursor/` and `.github/` were
  removed because the folders now have content; `.claude/` keeps its `.gitkeep`, because Claude Code reads the
  root `CLAUDE.md` and a second copy in `.claude/CLAUDE.md` would be loaded twice.
- **Rejected:** copying the instructions into each tool's file (they would drift apart).

### DEC-S2-09 One copy of project decisions (Proposed)

- **Chosen:** D-001 to D-023 stay only in PRD 00 section 4; this file links to them and holds the choice
  records and owner decisions (see the top of this file). The S1 header said S2 would merge the two.
- **Rejected:** copying the D table into this file (two copies of the same decisions, which drift as soon as
  the owner re-exports PRD 00). If the owner wants one file instead, the table can be copied here and PRD 00
  section 4 replaced by a link at the next export.

### DEC-S2-10 docs/db.md placeholder (Proposed)

`docs/db.md` records what is already fixed (SQLite with WAL, `wayra.db`, app-private storage,
`schema_migrations`) and lists what S4 adds (paths per platform, library, full schema, points protection, log
event names, rules for native writers, OS backup).

### DEC-S2-11 Branches and manual-only CI (Owner decision, 20 Nov 2026)

- **Branches:** `main` stays the stable line (S1 and its follow-ups). `dev` was created from `main` and holds
  S2. Every later piece of work goes on its own feature branch from `dev` (for example `feature/s3-domain`).
  Nothing is committed directly to `main` or `dev`; the owner decides when to merge.
- **CI:** both workflows run only when started by hand (`workflow_dispatch`), and their jobs run only on
  `dev` (`if: github.ref == 'refs/heads/dev'`); started on any other branch, the jobs show as skipped.
  Pushes and pull requests start nothing, and the iOS nightly schedule is removed.
- **Changes:** DEC-S2-01 ("every push and pull request") and DEC-S2-03 ("manual or nightly") are replaced by
  this entry. PRD 01 F-10 and AC-13 ("on every push") are deviated from by owner decision. Test step 11 becomes
  "start CI by hand on `dev`; it turns green".

---

## Slice S3: domain skeleton, geo helpers, fixtures, stub pipeline (20 Nov 2026)

Versions were looked up on the npm registry on 20 Nov 2026; the pinning cutoff (DEC-S1-01) was 6 Nov 2026.

### DEC-S3-01 New dev dependencies (Proposed)

- **Chosen:** `@babel/register` 7.29.13 (4 Nov 2026, same release line as the pinned `@babel/core` 7.29.13;
  see DEC-S3-08) and `@types/node` 26.6.6 (28 Oct 2026, matches Node 26 in `.nvmrc`). Both were already in
  the tree transitively or as siblings; now they are declared and pinned.
- **Rejected:** `@babel/register` 8.1.2 (Babel 8 line, 9 days old, and the rest of Babel is on 7.29);
  `@types/node` 24.x (the target runtime is Node 26).

### DEC-S3-02 Domain type naming (Proposed)

- **Chosen:** TypeScript fields are the camelCase form of the PRD 00 section 8 columns, keeping the unit
  suffix (`tz_offset_min` → `tzOffsetMin`, `accuracy_m` → `accuracyM`, `speed_mps` → `speedMps`), as PRD 00
  sections 9 and 10 already do (`activeTripId`, `pipelineVersion`). Units follow R-08. The types follow the
  section 8 columns exactly; gaps found are listed under "Open questions for the owner" below, not filled in.
- **Added beyond D-01:** `RawFix` (a fix before ingestion: `RawPoint` without `id`, `tripId`, `trackId`,
  `seq`, `ingestedAt`), which fixtures use and S4's `ingestPoints(trackId, fixes)` will take; `JsonObject`
  for JSON columns; `SyncColumns` (R-11); `LatLng`; `Clock`, `RandomSource`, `IdGenerator`.
- **Rejected:** snake_case in TypeScript (PRD 00 sections 9 and 10 use camelCase); dropping unit suffixes
  (they keep units visible in code, R-08).

### DEC-S3-03 Point flag bits (Proposed)

- **Chosen:** `PointFlag.RejectedByFilter = 1`, `LowPowerSample = 2`, `Estimated = 4` (the order PRD 00
  section 8 lists them). These values will be stored in `points.flags`, so they never change meaning; new
  flags take the next free bit.

### DEC-S3-04 `TripStats` has no `processedAt` (Proposed)

- **Chosen:** the domain `TripStats` type omits `trip_stats.processed_at`. It is a clock reading, and the
  pipeline is pure (R-02) with no time input in `PipelineInput` (PRD 00 section 10). The data layer stamps
  it when S4's `DerivedRepo` saves a result. Empty stats use `0` for sums and speeds and `null` for altitudes
  (no altitude is not "0 m", product quality 4).
- **Rejected:** adding a `now` field to `PipelineInput` (changes the PRD 00 contract).

### DEC-S3-05 UUIDv7: own implementation (Proposed; PRD 01 section 4 choice)

- **Chosen:** our own `src/domain/ids/uuidv7.ts` (about 110 lines). `formatUuidV7(ms, randA, randB)` is
  pure; `createUuidV7Generator(clock, random)` returns a generator that is monotonic within a millisecond
  and when the clock goes backwards (RFC 9562 section 6.2, method 1: rand_a is a counter). Tested against
  the RFC 9562 appendix A.6 example value, plus version, variant, ordering and overflow.
- **Rejected:** `uuid` 14.0.3 (10 Oct 2026, maintained, `v7({ msecs, random })` accepts injected inputs).
  Against it: it is ESM-only, so the Jest 29 CommonJS setup needs a `transformIgnorePatterns` exception; its
  default random source is the global `crypto`, which Hermes does not provide without a polyfill, so a
  forgotten option fails only on the phone; and its monotonic state is module-level, outside the caller's
  control. The algorithm is short and the RFC gives a test vector, so owning it is the simpler option.
- **For S4/S6:** the app builds one generator from `Date.now` and a secure random source (for example
  `crypto.getRandomValues` once a polyfill or native source is chosen) and injects it.

### DEC-S3-06 Fixture format and generator (Proposed)

- **Format:** one JSON object per file, `fixtures/<name>.json`: `name`, `description`, optional
  `expectedStats` (a partial `TripStats`) and `points` (an array of `RawFix`, sorted by `ts`). One point per
  line for readable diffs. `fixtures/*.json` is excluded from Prettier because it is generated.
- **Tracks** (start near Kaza, UTC+05:30, 14 Oct 2026 09:30 local, a fix every 5 s):
  `straight-line` (10 km at 20 m/s, 101 points), `loop-with-stop` (1 km-radius loop at 7.85 m/s with a
  600 s stop halfway, 281 points), `noisy-with-gap` (18 km east at 15 m/s with seeded Gaussian noise and no
  fixes from 500 s to 800 s, 182 points).
- **Expected stats** are ground truth from the generator's parameters, not measured from the points. For
  the noisy track only `elapsedS`, `gapCount` and `estimatedDistanceM` are given, because whether
  `distanceM` and `movingS` include the gap is for PRD 05 to define. Tolerances are set by PRD 05.
- **Determinism:** a fixed start time and seed; noise comes from mulberry32 (public domain) in
  `tools/fixtures/random.ts`. A test regenerates the fixtures and compares them byte for byte with the files.
- **Loader:** `tools/fixtures/load.ts` (`loadFixture`, `loadAllFixtures`, `toRawPoints`), used by
  `__tests__/`. It is Node code, outside `src`.
- **Rejected:** a bare array of points (no room for expected stats); `JSON.stringify` with indentation
  (about 7,000 lines per file).

### DEC-S3-07 Jest: two projects and the coverage threshold (Proposed; F-06)

- **Chosen:** `jest.config.js` has a `node` project (`testEnvironment: node`, no React Native preset,
  Babel strips types) for `__tests__/{domain,data,usecases,tools}` and the same folders under `src`, and a
  `react-native` project (the preset) for everything else. `npm test` and `npm run test:domain` pass
  `--coverage`; `coverageThreshold` on `./src/domain/` requires 90 percent of lines for the directory as a
  whole (AC-14). `test:domain` runs the `node` project only and no longer has `--passWithNoTests`.
- **Rejected:** `collectCoverage: true` in the config (every single-file run would then fail the
  threshold, because unrun domain files count as 0 percent); a glob threshold (checks each file separately,
  stricter than the PRD asks).

### DEC-S3-08 Running the TypeScript generator: `@babel/register` (Proposed)

- **Chosen:** `npm run fixtures:generate` runs `scripts/generate-fixtures.js`, which loads
  `tools/fixtures/generate.ts` through `@babel/register` with the project's `babel.config.js`, the same
  transform Jest and Metro use. The generator can then reuse the domain geo helpers. S4's `replay` script
  can use the same approach.
- **Rejected:** `tsx` 4.23.15 (a second transform, with a native esbuild binary); Node's built-in type
  stripping (needs `.ts` extensions in every import, unlike the rest of the code base); a plain JavaScript
  generator (would duplicate the geo maths).

### DEC-S3-09 Domain purity lint rules (Proposed)

- **Chosen:** `eslint.config.js` adds rules for `src/domain` only: no `Date.now`, `Math.random`, `Date()` or
  `new Date()` without arguments, and no host globals (`process`, `Buffer`, `require`, `setTimeout`,
  `fetch`, `crypto`, `performance` and others). `scripts/check-domain-purity.js` runs in `npm run lint` and
  checks 18 cases, so loosening the rules fails lint (tested by removing them).
- **Why now:** `tsconfig.json` now lists `"types": ["jest", "node"]` so tools and tests can use `node:fs`.
  That also makes Node globals type-check inside `src/domain`, so lint has to catch them instead (R-02, R-16).
- **Rejected:** a separate `tsconfig` for tools (a second typecheck to keep in step).

### DEC-S3-10 Pipeline stage contract (Proposed; D-03)

- **Chosen:** a stage is `{ name, run(state, input) }` returning a partial output. Keys matching a known
  field (`points`, `segments`, `days`, `stats`, `simplifiedRoutes`) replace it; `warnings` are appended;
  any other key goes into `extras` under that key. If two stages write the same extras key, the later one
  wins and a warning is added. Duplicate stage names throw (a programming error). `PIPELINE_STAGES` holds
  the eight stages of PRD 00 section 10 in order, all identity stages; `runPipeline(input, stages?)` takes
  another list for tests. The result is stamped `0.0.0-stub`.
- **Config:** `pipelineConfig` in `src/domain/config.ts` is deep-frozen; every value is marked
  `PLACEHOLDER (PRD 05)`. Recorder sampling intervals are not pipeline thresholds and are left to PRD 02/04.

### DEC-S3-11 `no-bitwise` is turned off in four files (Proposed)

React Native's ESLint config warns on bitwise operators, and lint allows no warnings. The polyline format,
UUID layout, `points.flags` bitfield and mulberry32 are defined in terms of bit operations, so those files
(and their two tests) start with `/* eslint-disable no-bitwise -- <reason> */`. The rule stays on elsewhere.

### Open questions for the owner (found in S3, not blocking it)

- **OQ-S3-1** PRD 00 section 8: `days` has no `pipeline_version` column, though R-05 says every derived row
  records it. S4 (DB-03) needs an answer; the S3 `DayStat` type follows the column list as it is.
- **OQ-S3-2** `routes_simplified` with `scope = day` has no column saying which day. Proposal for S4:
  add `local_date` (null for trip scope).
- **OQ-S3-3** Does `trip_stats.distance_m` include the estimated distance across gaps, or only verified
  distance (with `estimated_distance_m` separate)? PRD 05 should state it; the noisy fixture leaves it open.
- **OQ-S3-4** `trips.visibility` lists only `private`. The type allows only that value until a sharing PRD adds more.

---

## Owner decisions on PRD 01 open questions

### OD-1 Language: English only (Owner decision, 19 Nov 2026)

- **Decided:** English is the app's only language. No second language is planned.
- **Kept:** the i18n layer (R-15, D-019) stays. All user-facing text goes through `src/i18n` / `src/locales`
  with a single English locale file. Units and date formats still follow the device locale and the unit
  setting. This keeps text in one place and lets a language be added later without touching screens.
- **PRD 01 changes this implies** (PRD files are owner exports, so they are not edited here):
  - §1 and §2: "two languages" / "English and Hindi" becomes English only.
  - A-01: the `app` slice has no language field. A-02: Settings has no language option.
  - DB-03: `app_settings` stores theme and units only (no language key).
  - A-04: English only. The "no user-facing string outside locale files" check and plural forms stay.
  - AC-10: theme set to dark persists after restart; the Hindi part is dropped.
  - Test sheet step 5: switch units to imperial only.
