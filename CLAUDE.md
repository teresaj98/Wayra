# Wayra: agent entry point (temporary)

This file stands in until `AGENTS.md` is written in PRD 01 slice S2. It will then just point to `AGENTS.md`.

## Read first, in this order

1. `docs/prd/PRD-01.md`: the current PRD, its work slices (section 3) and its requirements.
2. `docs/prd/PRD-00.md`: master architecture. Read it fully before writing code.
3. `docs/decisions.md`: choices already made per slice. Do not reopen them without the owner.

## Rules that never change without an owner-approved decision-log entry

Architecture rules **R-01 to R-16 in PRD 00 section 5** are hard rules. In short: layers depend
downward only and `src/domain` is pure, deterministic TypeScript with no React, React Native, SQLite,
network or clock access (R-01, R-02, R-16). Adapters sit behind interfaces (R-03). Raw `points` are
append-only (R-04), and derived data is disposable and versioned (R-05). Recording never depends on the JS
runtime (R-06). Everything works offline (R-07). Values are SI units and UTC epoch ms (R-08). Every schema
change is a migration (R-09). Recording never fails silently (R-10). Records are sync-ready (R-11). Config
lives in one typed module (R-12). Files stay under about 300 lines and functions under about 60 (R-13).
Privacy is applied at publish time (R-14). All text goes through i18n, with theme tokens for light and dark (R-15).

Follow the working agreement in **PRD 00 section 16**. Build one slice per session. If a PRD is unclear,
stop and ask; never improvise. Look up and pin versions instead of trusting memory. Never weaken a test.
Update `docs/CHANGELOG.md` and `docs/decisions.md`. Finish with an owner test sheet.

## Commands

```bash
npm run lint        # ESLint (no warnings) + import-boundary self-check + app identity check
npm run typecheck   # tsc --noEmit
npm test            # Jest
npm run android     # .env.staging; also android:uat, android:prod
npm run ios         # .env.staging; also ios:uat, ios:prod
```

Anything involving background behaviour, battery, GPS, OS permissions or store review is tagged
**NEEDS DEVICE VALIDATION**. A passing test suite is never proof that it works.
