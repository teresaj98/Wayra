# Database

> **Placeholder (S2).** Slice S4 completes this file when the data layer exists (PRD 01 F-08, DB-01 to DB-07).
> Until then, only the facts below are fixed. Nothing here is implemented yet.

This file is for anyone who has to reach the app database from outside the TypeScript code, such as a
future native recorder (PRD 00 D-004, R-06) that writes points while the JS runtime is not running.

## Fixed so far

| Item                | Value                                                                                             | Source                    |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------- |
| Engine              | SQLite, write-ahead logging (WAL) mode                                                            | PRD 00 D-009, section 8   |
| File name           | `wayra.db`                                                                                        | PRD 01 DB-01              |
| Location            | App-private storage (exact path per platform: S4)                                                 | PRD 01 DB-01              |
| Connection settings | WAL on, foreign keys on, a busy timeout set                                                       | PRD 01 DB-01              |
| Schema owner        | One forward-only, numbered migration set; applied migrations and checksums in `schema_migrations` | PRD 00 R-09, PRD 01 DB-02 |
| Schema version 1    | Tables from PRD 00 section 8 plus `app_settings`                                                  | PRD 01 DB-03              |

## S4 fills in

- The exact file path on Android and on iOS, and how native code opens it.
- The SQLite library chosen and why (PRD 01 section 4; recorded in `docs/decisions.md`).
- The full schema version 1: every table, column, type, index and trigger.
- How raw `points` are protected (DB-04): updates rejected, deletes only with their trip.
- `recording_log` event names (DB-07), shared with native code.
- Rules for native code writing to the database: transactions, `seq` assignment, deduplication (DB-06).
- What OS backup does with the file (PRD 01 OD-2).
