# Decisions and choice records

Project decisions D-001 to D-023 live in PRD 00 section 4 (`docs/prd/PRD-00.md`). This file records
the choices the agent proposes per slice (PRD 01 section 4): what was chosen, what was rejected and why.
The owner approves them in the pull request. Slice S2 merges this into the full decision log (F-08).

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
- **Android:** JDK 17 (Azul Zulu), per React Native's docs ("higher JDK versions" may cause problems).
  Android SDK levels are the template's own: compileSdk 37, build-tools 37.0.0, targetSdk 36 (D-022),
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
