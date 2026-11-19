# PRD 00: Wayra, Master & Architecture

Nov 19, 2026 · @Teresa

Working name: Wayra (availability not yet checked; the name can change later). Status: Draft v0.2 (long-term review), 14 Oct 2026. Readers: the owner (reads, approves, tests) and the AI coding agent (implements).

## 1. How to read this document

**Owner:** read sections 2 to 4 fully (product, decisions, rules). Skim the rest. Section 16 lists what you need to check and approve.

**AI agent:** read everything before writing code. Where this document and a later PRD conflict, the later PRD wins for its own module only; the rules in section 5 never change without a new entry in the decision log.

**Convention:** requirement IDs look like R-05 (architecture rule), D-003 (decision), OQ-2 (open question). Refer to them in commit messages and PR descriptions.

## 2. Product summary

Wayra is a mobile app (iOS and Android, one React Native codebase) for road trips and treks. The user starts a trip, the app records their location in the background for hours or days, and afterwards turns the raw recording into a trip story: route, distance, days, walking vs vehicle segments, altitude, and later famous places passed and a shareable card.

The motivating example is a 1,000 km Spiti circuit ride that left nothing to show afterwards. The product is "Strava for journeys": the trip is the unit, not the workout.

### Non-negotiable product qualities

1. **Trustworthy recording.** A lost or wrong trip destroys trust faster than any missing feature.
2. **Explicit start and stop.** Nothing is recorded unless the user starts a trip.
3. **Works with no network** for the whole recording and viewing flow.
4. **Honest numbers.** Estimated or low-confidence data is labelled, never silently presented as exact.

## 3. Scope of MVP Part 1

### In scope

- Create a trip (name, vehicle: bike or car), start, pause, resume, end.
- Background recording that survives screen-off, app kill and phone restart as far as the OS allows, with gaps detected and shown.
- Adaptive sampling and a low-power mode.
- Walk vs vehicle segmentation, stop detection, automatic day splitting.
- Cleaned route, distance, moving time, elapsed time, altitude stats.
- Trips list, live screen, trip detail with map, edit tools (trim start/end, relabel a segment, rename, delete).
- Permission onboarding and a battery-optimisation guide for Android.
- A debug screen showing recorder health.

### Out of scope for Part 1 (designed for, not built)

GPX export and import, accounts, cloud sync, famous-place detection, offline map packs, photos and moments, share cards and pages, social features, groups, leaderboards, notifications beyond the recording notification.

### Where each later feature plugs in

Part 1 is the foundation for the whole product, so each later capability needs a hook in it now. A hook is cheap today and costly to retrofit once real trips exist on real phones. This table lists the hooks this PRD builds in.

| Later capability | Expected phase | Hook built in Part 1 |
| --- | --- | --- |
| Import past trips (GPX first), such as a trip made before the app existed | Part 2 or later (owner decision: not in Part 1) | Tracks have a `source`; imports use the same ingestion and pipeline |
| Famous places and offline region packs | Part 2 | Pluggable pipeline stages, a `PlacesProvider` interface, reserved `trip_places` table |
| Moments: photos, notes, voice | Part 2 | Reserved `moments` table; the live screen keeps a slot for an Add moment button |
| Share cards, replay video, public pages | Part 2 to 3 | Several route detail levels (`lod`), privacy applied at publish time (R-14), pipeline portable to a server (R-16) |
| Accounts and cloud sync | Part 3 | `owner_id`, sync columns, per-track `seq` for chunked upload, a flow to claim local trips on first sign-in |
| Group trips | Part 3 | Several tracks per trip, reserved `trip_participants` table |
| More vehicles and multi-vehicle trips | Part 2 | Vehicle stored on segments with a trip default, extensible vehicle type |
| Trips across time zones | Any time | `tz_offset_min` on every point |
| Other languages, miles or kilometres, dark mode | From the first screen | R-15 |

## 4. Decision log

Every decision made so far. A new agent session must not reopen these without owner approval.

| ID | Decision | Notes |
| --- | --- | --- |
| D001 | One React Native codebase using the New Architecture, iOS and Android built in parallel | Owner decision |
| D002 | Solo hobby project, implementation largely by AI agents, owner reviews PRDs and tests | Shapes how PRDs are written (section 15) |
| D003 | Local-first: the phone is the source of truth in Part 1, no backend | Backend designed now (section 14), built later |
| D004 | Background capture goes through a `TripRecorder` interface; the first implementation wraps a free open-source background-location library, or our own thin Kotlin and Swift module if none survives the spike; no paid SDK unless both fail | Choice made in spike PRD 02. OQ-1 answered: no paid licence |
| D005 | Raw location points are append-only and never modified or deleted except when the user deletes the trip | Enables recomputation |
| D006 | All interpretation (cleaning, segmentation, stops, days, stats) lives in a pure TypeScript domain layer shared by both platforms | One implementation, one test suite |
| D007 | User corrections are stored as separate edit records, not by modifying derived data | Recomputing the pipeline never loses a user edit |
| D008 | IDs are client-generated UUIDv7 | Offline creation, future sync without conflicts |
| D009 | SQLite for local storage, WAL mode | Single schema owned by one migration set |
| D010 | Maps use MapLibre; offline map approach is decided by spike PRD 03 | Do not use OpenStreetMap's public tile servers for bulk or offline use |
| D-011 | Future backend: Supabase (Postgres with PostGIS, auth, storage) | Not built in Part 1 |
| D012 | UI and session state with Redux Toolkit (RTK Query reserved for server data in Part 2); persistent data is read from SQLite through repositories | No second copy of persistent data in the store; high-frequency recorder updates are throttled before they reach it. Chosen so state management does not have to change as features and the backend arrive |
| D013 | Location data never leaves the device without a user action (export or, later, opt-in sync); opt-in, location-free crash reporting may be added later | Privacy-first |
| D014 | Working name is Wayra (replaced Rovel, because many apps already use the name Rove) | Owner choice. Availability of stores, domains and handles still to be verified (OQ-3) |
| D015 | Points belong to a track, and a trip has one or more tracks (Part 1: exactly one live track per trip) | Imports and group trips later, without rewriting the largest table |
| D016 | Vehicle is stored on segments with a trip-level default; the vehicle type is extensible (bike, car, cycle, foot, other) though the Part 1 UI offers bike and car | Multi-vehicle trips were already in the product plan |
| D017 | Every point stores the device's UTC offset at capture; days are split by local time per point, not by one trip time zone | International and cross-border road trips |
| D018 | Imported tracks (GPX first) are first-class: same schema and pipeline, marked by the track source | Lets people bring in past trips and gives us real test fixtures. Import is out of Part 1 by owner decision and ships in Part 2 or later |
| D019 | All user-facing text goes through an i18n layer from the first screen; units and formats follow locale and a user setting; UI uses theme tokens with light and dark modes | Expensive to retrofit; riders also use the app at night and outdoors |
| D020 | Application ID and display name are fixed before the first licensed build | Commercial recorder licences are usually tied to the app identifier (verify in PRD 02), so a later rename could cost a new licence |
| D021 | Bare React Native CLI project (no Expo, owner decision) laid out like the owner's existing app template (root folders, per-environment env files, husky hooks, AGENTS.md as the agent entry point); our layers live under `src` | Matches the owner's habits and suits native modules such as background location. Our layers are mapped onto the owner's usual `src` folders (section 6) |
| D022 | Toolchain follows the stores: Xcode 26 or later (iOS 26 SDK) and Android targetSdk 36. Minimum OS versions stay at the React Native template defaults, raised only when a dependency needs it, and reviewed once a year | Apple requires Xcode 26 or later for uploads since 28 Apr 2026; Google Play requires API 36 for new apps and updates from 31 Aug 2026 |
| D023 | GPX export moves to Part 2; Part 1 has no export or backup | Owner decision. Known risk recorded in section 17 |

## 5. Architecture rules

These are hard rules. Breaking one requires a new decision-log entry approved by the owner.

- **R-01 Layering.** Dependencies point downward only: ui → app (use-cases) → domain and data and platform. `domain` imports nothing from React, React Native, native modules, SQLite or the network.
- **R-02 Pure domain.** Domain functions are deterministic and side-effect free. Same input, same output, no clock reads, no randomness (inject time and IDs).
- **R-03 Adapters at the edge.** The recorder, map, file export, permissions and (later) places and sync sit behind interfaces defined in `platform` or `domain`. UI and use-cases depend on the interface, never on a library.
- **R-04 Raw data is sacred.** Only the ingestion path writes to `points`, append-only. No code updates or deletes rows in `points` except the explicit delete-trip use-case.
- **R-05 Derived data is disposable.** `segments`, `days`, `trip_stats` and simplified routes can always be dropped and rebuilt from `points` plus `user_edits`. Each derived row records the `pipeline_version` that produced it.
- **R-06 Recording must not depend on the JS runtime.** If the JS runtime is dead, the background recorder keeps capturing and persisting. JS reconciles when it next runs.
- **R-07 Offline by default.** No feature in Part 1 may require network access to record, view or edit a trip.
- **R-08 Time and units.** Timestamps are UTC epoch milliseconds (integers). Coordinates are WGS84 decimal degrees. Distances in metres, speeds in metres per second, altitude in metres. Convert only in the UI layer.
- **R-09 Every schema change is a migration.** Forward-only, numbered, tested against a database created by the previous version.
- **R-10 No silent failure in recording.** Any condition that may cause lost data (permission revoked, location services off, low storage, library error) must be written to `recording_log` and surfaced in recorder health.
- **R-11 Sync-ready records.** Every user-owned table has `id` (UUIDv7), `created_at`, `updated_at`, `deleted_at` (nullable, soft delete) and `synced_at` (nullable), even though sync does not exist yet.
- **R-12 One source of truth for config.** All thresholds (accuracy limits, sampling intervals, segmentation timings) live in one typed config module with documented defaults, never inline in logic.
- **R-13 Small modules.** No file over about 300 lines and no function over about 60 lines without a written reason in the PR.
- **R-14 Privacy at publish time.** Privacy zones, trimming and restricted-area handling are applied to derived output when something is shared, never by altering raw points.
- **R-15 Localisation and theming.** All user-facing text goes through the i18n layer (`src/i18n`) from the first screen; units and date formats follow locale and a user setting; UI colours and spacing come from theme tokens with light and dark modes.
- **R-16 Portable pipeline.** The domain layer runs unchanged in plain Node, so the same code can later process trips on a server for share pages and re-processing.

## 6. System overview

```text
+------------------- React Native app (TypeScript) --------------------+
| ui/        screens, components, navigation (React Navigation)      |
| app/       use-cases: StartTrip, EndTrip, RecomputeTrip,            |
|            EditSegment, ExportGpx ...                              |
| domain/    PURE: types, pipeline (clean > segment > stops >         |
|            days > stats), config                                   |
| data/      repositories over SQLite, migrations, ingestion of raw   |
|            points                                                  |
| platform/  adapters: TripRecorder, PermissionsService,              |
|            MapProvider, FileExporter                               |
+---------------------------------+-----------------------------------+
                                  |
  native layer (library-provided at first, replaceable per D-004)
  Android: foreground service + location + activity recognition
  iOS: background location mode + significant-change relaunch + motion
                                  |
                    +-------------+-------------+
                    |  SQLite (app database)    |
                    +---------------------------+
```

### Proposed repository layout

```text
wayra/
  __tests__/     Jest tests: unit, integration, replay harness
  android/ ios/  native projects (bare React Native, no Expo)
  docs/          PRDs, decision log, conventions
  fixtures/      recorded tracks (GPX/JSON) used by tests
  patches/ scripts/ tools/
  src/
    __mocks__/
    api/         backend client (Supabase), empty until sync in Part 3
    assets/
    components/  shared UI components
    constants/   app constants and theme tokens (colours, spacing, type)
    domain/      NEW: pure logic: types, pipeline stages, config, geo math
    data/        NEW: SQLite client, migrations, repositories, ingestion
    hooks/       React hooks
    locales/     translation files
    navigation/
    screens/     includes the Debug screen (recorder health, log viewer)
    services/    adapters behind interfaces: recorder, permissions, maps, file export
    store/       Redux Toolkit slices (UI and session state)
    types/       global and UI-only types
    usecases/    NEW: orchestration (StartTrip, EndTrip, RecomputeTrip, ...)
    utils/       generic helpers, i18n setup, unit and date formatting
  .github/ .husky/ .claude/ .cursor/
  AGENTS.md      entry point for AI agents: read order, rules R-01 to R-16, definition of done
  .env.example .env.staging .env.uat .env.production
  App.tsx index.js app.json   babel, metro, jest, eslint, prettier configs
  Gemfile
```

The folders marked NEW are the only additions to the owner's usual `src`. The layer names used in the architecture rules map to folders like this:

| Layer in the rules | Folders |
| --- | --- |
| ui | screens, components, navigation, hooks, constants (theme) |
| app | usecases, store |
| domain | domain |
| data | data, api (Part 3) |
| platform | services |

Import rules, enforced by lint (R-01): `domain` imports nothing from the other layers, React or React Native; `data` and `services` import `domain` only; `usecases` import `domain`, `data` and `services`; `store` and `hooks` import `usecases`; `screens` and `components` import `hooks`, `store` and other components.

## 7. Technology baseline

The agent must look up and pin the current stable versions at setup time rather than relying on memory, record them in the repo, and note them in the decision log.

| Area | Choice |
| --- | --- |
| Framework | Bare React Native CLI (no Expo), New Architecture enabled, TypeScript in strict mode |
| Navigation | React Navigation |
| UI state | Redux Toolkit (RTK Query added in Part 2 for server data) |
| Local DB | SQLite via a maintained React Native SQLite library that supports WAL and synchronous or fast batched writes (agent proposes, owner approves) |
| Recorder | Free open-source background-location library (or our own native module) behind `TripRecorder` (see OQ-1) |
| Maps | MapLibre React Native (offline approach per PRD 03) |
| Tests | Jest for unit and integration; fixtures for tracks |
| Quality | ESLint, Prettier, TypeScript checks in CI |
| CI | Build and test on every push for both platforms |

## 8. Data architecture

PRD 01 contains the exact migrations. This section fixes the shape.

### Raw (append-only, R-04)

- **`tracks`**: `id`, `trip_id`, `source` (live, import-gpx, import-other), `device_id` (nullable), `created_at`. Part 1 creates exactly one live track per trip.
- **`points`**: `id`, `trip_id`, `track_id`, `seq` (increasing per track; fixes ordering and defines upload chunks later), `ts`, `tz_offset_min` (device UTC offset at capture), `lat`, `lng`, `accuracy_m`, `speed_mps` (nullable), `bearing_deg` (nullable), `alt_gps_m` (nullable), `alt_baro_m` (nullable), `activity_hint` (nullable: still, walking, vehicle, unknown, as reported by the OS), `flags` (bitfield: rejected-by-filter, low-power-sample, estimated), `ingested_at`.
- **`recording_log`**: `id`, `trip_id` (nullable), `ts`, `event`, `detail` (JSON text). Events include start, pause, resume, end, permission-changed, gps-lost, gps-restored, process-killed-detected, recovered, low-power-on, ingest-error.

### User-owned (sync-ready, R-11)

- **`trips`**: `id`, `owner_id` (nullable until accounts exist), `name`, `status` (active, paused, ended), `default_vehicle`, `visibility` (default private), `started_at`, `ended_at`, `notes`, plus sync columns.
- **`user_edits`**: `id`, `trip_id`, `kind` (trim-start, trim-end, relabel-segment, set-vehicle, exclude-range), `payload` (JSON), `created_at`, plus sync columns. Append-only; the latest edit for the same target wins.
- Reserved names, created only by the PRD that needs them: `moments`, `trip_places`, `trip_participants`.

### Derived (disposable, R-05)

- **`segments`**: `trip_id`, `track_id`, `start_ts`, `end_ts`, `mode` (vehicle, walk, stationary, excluded), `vehicle` (bike, car, cycle, foot, other; defaults to the trip's default), `confidence`, `distance_m`, `pipeline_version`.
- **`days`**: `trip_id`, `local_date` (from each point's own UTC offset), `start_ts`, `end_ts`, `distance_m`, `moving_s`, `max_alt_m`.
- **`trip_stats`**: `trip_id`, `distance_m`, `moving_s`, `elapsed_s`, `max_alt_m`, `min_alt_m`, `elev_gain_m`, `max_speed_mps`, `avg_moving_speed_mps`, `gap_count`, `estimated_distance_m`, `extra` (JSON for stats added later without a migration), `pipeline_version`, `processed_at`.
- **`routes_simplified`**: `trip_id`, `scope` (trip or day), `lod` (thumbnail, map, replay), `polyline` (encoded), `tolerance_m`, `pipeline_version`.

**Performance rules.** A 7-day trip can exceed 100,000 points. List screens and thumbnails read only `routes_simplified` and `trip_stats`, never raw points. Writes from the recorder are batched in short transactions. WAL mode is mandatory because the recorder and the UI access the database concurrently.

**Retention.** Raw points are kept until the user deletes the trip. Deleting a trip is a hard delete of its points, with a confirmation dialog.

## 9. Recorder architecture

The recorder is the highest-risk component (R-06, R-10), so its contract is strict.

```ts
export type Vehicle = 'bike' | 'car' | 'cycle' | 'foot' | 'other'; // Part 1 UI offers bike and car
export type PowerMode = 'normal' | 'low';
export type RecorderState = 'idle' | 'recording' | 'paused' | 'recovering';

export interface RecorderHealth {
  state: RecorderState;
  activeTripId: string | null;
  lastPointAt: number | null;      // epoch ms
  pointsLastMinute: number;
  powerMode: PowerMode;
  batteryPct: number | null;
  permissions: { location: 'none' | 'foreground' | 'always'; motion: boolean; notifications: boolean };
  issues: string[];                // human-readable, e.g. 'Location permission downgraded'
}

export interface TripRecorder {
  start(tripId: string, opts: { vehicle: Vehicle; powerMode?: PowerMode }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  end(): Promise<void>;
  setPowerMode(mode: PowerMode): Promise<void>;
  getHealth(): Promise<RecorderHealth>;
  onHealthChange(cb: (h: RecorderHealth) => void): () => void;
  ingestPending(): Promise<number>; // copies library-held points into the app DB, returns count
}
```

**State machine.** idle → recording (start) ↔ paused (pause, resume) → idle (end). `recovering` is entered when the app starts and finds an active trip with no live recorder, or finds a gap; it resolves to recording with a logged gap, or to paused if permission is missing.

**Ingestion rule (important).** Background libraries usually keep their own point store. The app database is the source of truth (R-04), so the adapter must copy points into `points` through an ingestion routine that is:

- idempotent (dedupe on trip id, timestamp and coordinates, so re-running never duplicates),
- triggered on app foreground, on trip end, periodically while the app runs, and from the library's headless or background callback if available,
- logged (count, duration, errors) into `recording_log`.

Whether headless ingestion is dependable is one of the things spike PRD 02 must prove. If it is not, ingestion falls back to foreground and trip-end triggers, and the library's own store acts as a durable buffer in between.

**Recovery behaviour.** On launch the app checks for an active trip. If the recorder is not running, it restarts it, logs `process-killed-detected` and `recovered`, and the pipeline later renders the gap as an estimated dotted segment.

## 10. Pipeline architecture

A single pure function turns raw data into everything the UI shows.

```ts
export interface PipelineInput {
  trip: TripMeta;
  points: RawPoint[];        // sorted by ts, may contain flagged points
  edits: UserEdit[];         // applied after automatic stages
  config: PipelineConfig;    // from the single config module (R-12)
  timezone: string;          // fallback IANA zone, used only for points without tz_offset_min
}

export interface PipelineResult {
  segments: Segment[];
  days: DayStat[];
  stats: TripStats;
  simplifiedRoutes: SimplifiedRoute[];
  pipelineVersion: string;
  warnings: string[];
}

export function runPipeline(input: PipelineInput): PipelineResult;
```

Stages, in order (each is its own pure function with its own tests):

1. **Clean:** drop or flag points with poor accuracy and physically impossible jumps; never delete from the input array.
2. **Smooth:** reduce GPS jitter before measuring distance.
3. **Gap detection:** find time or distance gaps and mark the bridging span as estimated.
4. **Classify motion:** walk, vehicle or stationary, using speed, OS activity hints and hysteresis so labels do not flicker.
5. **Stops and days:** detect stops, then split into days using long stops and local time rather than midnight alone.
6. **Stats:** distance, moving time, altitude gain and extremes, with estimated portions reported separately.
7. **Apply user edits:** trims, relabels and exclusions.
8. **Simplify:** produce simplified polylines per trip and per day.

The pipeline runs on trip end, after a user edit, on version upgrade, and on demand. It runs on a background thread or in chunks if it would block the UI. Output must be identical on iOS and Android for the same fixture; this is an acceptance criterion.

**Extensibility.** Stages are registered in one ordered list, so later stages (matching places, detecting mountain passes, scoring a trip) are added without editing existing ones. Their output goes into an `extras` map on the result until its own PRD gives it a typed field.

Days are split using each point's own UTC offset, so a trip that crosses time zones still divides correctly.

## 11. Platform behaviour

Summary here; detailed in PRD 04.

- **Android:** the recorder runs as a foreground service with a persistent notification. Manufacturer battery optimisation is the main threat, so onboarding includes a per-brand guide and recorder health shows a warning if updates stop.
- **iOS:** background location mode with the "Always" permission, relaunch after termination through the OS's significant-location-change mechanism, and automatic pausing of location updates disabled. The permission upgrade flow has to be explained in-app because iOS makes it a two-step process.
- **Both:** permission states are modelled explicitly (none, foreground only, always). If a user downgrades permission mid-trip, recorder health shows a persistent warning and the event is logged.

## 12. Failure modes the architecture must handle

| Situation | Required behaviour |
| --- | --- |
| App process killed during a trip | Recorder continues or relaunches; gap logged; shown as estimated |
| Phone battery dies | On next launch, trip is recovered; the gap is visible |
| No GPS (tunnel, canyon) | Gap marked estimated; excluded from verified stats |
| Permission revoked mid-trip | Warning in health and notification; logged |
| Storage nearly full | Warn the user; stop gracefully rather than corrupt the database |
| Database locked by concurrent access | Writes retry with backoff; never block the recorder |
| Clock changes (timezone, manual) | Timestamps stay UTC; each point stores its UTC offset, so day splitting stays correct when crossing time zones |
| User forgets to end the trip | Prompt after long inactivity; allow trimming the end |
| User starts a second trip while one is active | Not allowed; prompt to end or resume the active trip |

## 13. Privacy and security principles

- Location is recorded only between Start and End (or Pause), and the OS-visible recording indicator is always honoured.
- All data stays on the device in Part 1. No analytics SDKs that transmit location.
- Exports (arriving in Part 2) are always user-initiated, never automatic.
- Designed for later: privacy zones that hide trip start and end near home on anything shared, and no exact tracks published near restricted areas by default.
- Store review requires a clear explanation of background location use; draft the justification text early (tracked in the roadmap).

## 14. Future backend (design constraints only, not built in Part 1)

These constraints exist so that Part 1 does not need a rewrite later.

- Supabase with PostGIS is the target (D-011). Server tables mirror the user-owned and derived tables.
- Sync is local-first and upload-first: finished trips upload in idempotent chunks keyed by `(trip_id, chunk_index)`; raw points are stored compressed in chunks, not as one row per point.
- Edits sync as small last-write-wins records. Raw points are immutable, so real conflicts are rare.
- Places detection will use downloadable region packs queried locally, with results uploadable; the server can re-run detection against better data later.
- Public share pages render server-side with privacy zones applied.

## 15. Testing strategy and definition of done

### Test pyramid

1. **Unit tests** for every pipeline stage using fixtures. Fixtures are real recorded tracks (a commute, a hilly ride, a walk, a track with a gap) plus synthetic edge cases (jitter, jumps, long stop).
2. **Integration tests** for repositories and migrations against a real SQLite database.
3. **Replay harness:** feeds a fixture through ingestion and the pipeline, and checks stats against expected values with tolerances.
4. **Manual device protocols** for anything involving background behaviour, battery, GPS accuracy or permissions. Each PRD includes one.

**What the agent cannot verify:** background reliability, battery use, real GPS quality, OS permission dialogs and store review. These must be tagged NEEDS DEVICE VALIDATION in the PRD and the PR, and a passing test suite must never be reported as proof that they work.

### Definition of done for any slice

- Typecheck, lint and tests pass in CI on both platforms.
- New or changed behaviour has tests, or a stated reason why not.
- Architecture rules R-01 to R-13 are respected (the agent states this explicitly in the PR).
- The PRD's manual test protocol is updated and ready for the owner to run.
- The decision log is updated if a decision was made.

## 16. Working agreement for AI coding agents

1. Read this document and the PRD for the current slice before changing anything.
2. Build one slice per session. Do not start the next PRD's work.
3. Propose before deviating: if the PRD seems wrong or incomplete, stop and write the question in the PR instead of improvising.
4. Never invent library versions or APIs from memory. Look them up and pin them.
5. Never weaken a test to make it pass. If a test is wrong, explain why.
6. Prefer boring, well-documented approaches over clever ones.
7. Keep a short CHANGELOG and update the decision log.
8. For every slice, produce a one-page owner test sheet: exact steps, expected result, and a pass/fail box.

**What the owner approves in this PRD:** the decision log (section 4), the architecture rules (section 5), the data shape (section 8), and the recorder contract (section 9). Everything else can be adjusted by later PRDs.

## 17. Risks and open questions

### Risks

1. Background recording reliability on aggressive Android manufacturers and on iOS after termination. Mitigated by the recorder spike, health reporting, recovery logic and field testing.
2. Recorder dependence: a young free library may be buggy or abandoned. Mitigated by the `TripRecorder` interface, MIT licences that allow forking, and the fallback of our own native module.
3. Offline maps in React Native are unproven for our needs. Mitigated by spike PRD 03 before any map-dependent work.
4. AI-generated code drifting from the architecture. Mitigated by the rules, small slices and CI checks.
5. Owner time for real-device testing is the true schedule limiter.
6. No export or backup in Part 1, so a lost phone or an uninstall loses every trip. Only OS-level backup may help; PRD 01 checks what it does with the database. GPX export and cloud sync come later.

### Open questions

- **OQ-1** Answered: the owner does not want to buy a paid licence. PRD 02 compares free MIT-licensed libraries on real phones and, if none is reliable enough, we write a thin native recorder ourselves. The paid Transistor SDK stays a last-resort fallback only.
- **OQ-2** Do any recorded tracks exist from the Spiti trip (maps timeline export, fitness app, GPX)? If yes, they become the first real fixture.
- **OQ-3** Availability of the name Wayra (app stores, domains, social handles) and brand direction (affects onboarding copy and visual design in PRD 06 and 07).
- **OQ-4** Answered: no hand-picked floor. Build with the toolchains the stores require (Xcode 26 or later for iOS, target API 36 for Android) and keep the minimum OS at the React Native template default, raised only if the chosen recorder needs more and reviewed once a year (D-022).
- **OQ-5** Answered: GPX export moves to Part 2 (D-023).

## 18. Acceptance criteria for PRD 00

This PRD is accepted when the owner confirms:

1. The decision log reflects what they want (or edits are made).
2. Open questions OQ-1 to OQ-5 have answers or accepted defaults.
3. The recorder contract and data shape are agreed.

**PRD 01 (Foundations) is complete when:**

- Given a fresh clone, when the agent runs the setup and test commands, then the app builds and launches on an iOS simulator and an Android emulator and the test suite passes in CI.
- Given the repository, when lint rules run, then domain code cannot import from React, React Native, SQLite or platform modules (R-01, R-02 enforced automatically).
- Given an empty database, when migrations run, then all tables from section 8 exist; given a database from the previous version, then migrations upgrade it without data loss.
- Given a stub recorder, when the debug screen opens, then recorder health is displayed.
- Given any user-facing string, when the language or unit setting is changed, then the text and units update through the i18n layer, and the theme tokens render both light and dark modes.

## 19. PRD roadmap

| PRD | Title | Owner involvement |
| --- | --- | --- |
| 00 | Master and architecture (this document) | Review and approve |
| 01 | Foundations: repo, CI, schema, config, debug screen | Review, run the owner test sheet |
| 02 | Recording spike: a full day of background recording on real phones | Carry phones, record, report |
| 03 | Offline map spike | Run the airplane-mode test |
| 04 | Recording: lifecycle, recovery, permissions, onboarding, battery guide | Device testing |
| 05 | Pipeline: clean, segment, stops, days, stats | Compare against known routes |
| 06 | Trips list, new trip, live screen | Usability review |
| 07 | Trip detail and edit tools | Usability review |
| 08 | Field test plan: multi-day trip on both platforms | Take a real trip |
| 09 | Export and import: GPX export, GPX import, backup and restore | Import your own past trips and compare |
| 10 | Places: region packs, detection, offline maps | Ride a known route and check the places |
| 11 | Moments: photos and notes | Usability review |
| 12 | Sharing: cards, replay, public pages | Review designs and share with friends |
| 13 | Accounts and sync | Test on two phones |
| 14 | Group trips | Test with a friend on a ride |

**Next step:** after approval of this document, the mobile part begins with PRD 01 (Foundations) and PRD 02 (Recording spike).
