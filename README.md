# Wayra

Road-trip and trek recorder for iOS and Android (bare React Native, New Architecture, TypeScript).
Product and architecture: `docs/prd/PRD-00.md`. Current work: `docs/prd/PRD-01.md`.
Choices and pinned versions: `docs/decisions.md`. Database: `docs/db.md`. Agents start at `AGENTS.md`.

## Setup on a Mac

Do these once per machine. Versions come from `docs/decisions.md` (DEC-S1-02, -03, -13).

### 1. System tools

1. **macOS:** Xcode 26 needs at least macOS Sequoia 15.6, and Xcode 26.4.1 and later need macOS Tahoe 26.2.
   Update macOS first (System Settings → General → Software Update).
2. **Xcode** (26 or later, from the Mac App Store). Open it once and accept the licence. In
   Xcode → Settings → Locations, choose it under Command Line Tools. In Settings → Components (or
   Platforms), install an iOS simulator.
3. **Homebrew:** follow the install instructions on <https://brew.sh>.
4. **Node 26 LTS** (Node 24.3 or later also works) and Watchman:
   ```bash
   brew install node@26 watchman
   ```
5. **A JDK, 17 or newer**, to start Gradle. Gradle then downloads and uses its own Java 25 for the Android
   build (DEC-S1-17), so the exact version installed does not matter. Azul Zulu 17, with `JAVA_HOME` in `~/.zshrc`:
   ```bash
   brew install --cask zulu@17
   ```
   ```bash
   echo 'export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home' >> ~/.zshrc
   ```
6. **Android Studio** from <https://developer.android.com/studio>. In its SDK Manager install
   _Android SDK Platform 37_, _Android SDK Build-Tools 37.0.0_, _Android SDK Command-line Tools_ and an
   emulator image (_Google APIs ARM 64 v8a_, API 36). Then add to `~/.zshrc`:
   ```bash
   echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
   ```
   ```bash
   echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools' >> ~/.zshrc
   ```
   Open a new terminal so the variables apply.

### 2. Project

From the project folder:

```bash
npm install
```

```bash
npm run env:init
```

```bash
bundle install
```

```bash
cd ios && LANG=en_US.UTF-8 bundle exec pod install && cd ..
```

- `npm install` also installs the git pre-commit hook.
- `npm run env:init` creates `.env.staging`, `.env.uat` and `.env.production` from `.env.example`. These
  files stay on your machine and are never committed.
- `bundle install` installs CocoaPods 1.15.2 into `vendor/bundle` using the Mac's built-in Ruby.
- `pod install` needs the `LANG` setting, otherwise CocoaPods stops with an encoding error. Re-run it
  after installing Xcode, and whenever a native dependency changes.

Check the install:

```bash
npm run lint && npm run typecheck && npm test
```

### 3. Run

Start an Android emulator from Android Studio (Device Manager), or plug in a phone with USB debugging, then:

```bash
npm run android
```

For iOS:

```bash
npm run ios
```

Both use `.env.staging`. Use `android:uat`, `android:prod`, `ios:uat` or `ios:prod` for the other
environments. Always start the app through these scripts: they choose the env file. A build started from
Xcode directly has no env file and stops with an `Invalid APP_ENV` message (open item, DEC-S1-11).

### Troubleshooting

- **"A problem occurred starting process 'command 'node''"** on `npm run android`: a Gradle process started by
  Android Studio is being reused and cannot find Node. Run `cd android && ./gradlew --stop && cd ..`, then
  `npm run android` again.
- **"Unsupported class file major version …"**: Gradle is running on an unsupported Java. Check that
  `android/gradle/gradle-daemon-jvm.properties` exists, then run `cd android && ./gradlew --stop && cd ..`.

## Scripts

| Script                      | What it does                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`              | ESLint (no warnings), the import-boundary self-check (240 cases), the domain purity self-check and the app identity check |
| `npm run typecheck`         | TypeScript check, no output files                                                                                         |
| `npm test`                  | All Jest tests (Node and React Native projects) with coverage; fails under 90% domain lines                               |
| `npm run test:domain`       | Domain tests only, with the same coverage threshold                                                                       |
| `npm run fixtures:generate` | Rewrite the synthetic tracks in `fixtures/` from `tools/fixtures/generate.ts`                                             |
| `npm run db:check`          | Stub until S4: run migrations on an empty database and print the schema                                                   |
| `npm run replay`            | Stub until S4: feed a fixture through ingestion                                                                           |
| `npm run format`            | Prettier on the whole repository                                                                                          |
| `npm run env:init`          | Create the local env files from `.env.example`                                                                            |
| `npm run identity:apply`    | Copy the name and IDs from `app.json` into the native projects                                                            |

## CI

GitHub Actions (`.github/workflows/`, choices in `docs/decisions.md` DEC-S2-01 to -07):

- **CI** (`ci.yml`) runs on every push and pull request: lint, typecheck, tests, `db:check`, and an Android
  debug build. The APK is attached to the run as the artifact `wayra-staging-debug-apk-<run number>` (kept
  14 days). Open the run in the repository's **Actions** tab and download it under **Artifacts**. It is a zip
  holding `app-debug.apk`, which uses `.env.staging` and opens without Metro.
- **iOS simulator build** (`ios.yml`) runs nightly at 21:30 UTC, or by hand: Actions tab → _iOS simulator
  build_ → _Run workflow_.

## App name and IDs

`app.json` is the single place for `displayName`, `applicationId` (Android) and `bundleIdentifier` (iOS).
They are placeholders (`com.wayra.placeholder`) until the owner decides before the first store build
(PRD 01 OD-3). To change them, edit `app.json` and run `npm run identity:apply`. `npm run lint` fails if the
native projects drift from `app.json`.
