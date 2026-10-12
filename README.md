# Population Tracker

Next.js, React, Prisma, and SQLite for managing nations, empires, eras, and population history.

## Run locally

Use a recent Node.js release (Node 24 LTS recommended) and pnpm:

```sh
pnpm install
pnpm exec prisma generate
pnpm dev
```

The default database remains `prisma/dev.db`. `DATABASE_URL=file:/absolute/path/to/another.db` selects an alternate database without changing the Prisma schema. Never run database resets, seed scripts, or migrations against an existing database as part of routine setup.

## Server

The live tracker runs on the bot server as `wrp-pops.service`, listening only on `127.0.0.1:3000`. The database lives outside the repo at `/var/lib/wrp-pops/tracker.db` and is never committed; `/etc/wrp-pops.env` holds `DATABASE_URL` and `DISCORD_INTEGRATION_TOKEN`.

- Open the UI: `ssh -L 3000:localhost:3000 root@<server>`, then browse to `http://localhost:3000`.
- Deploy new code: push, then run `deploy/update.sh` on the server (stops the tracker, backs up the database, pulls, installs, applies pending migrations, builds, restarts).
- Backups: `wrp-pops-backup.timer` writes a verified copy to `/var/lib/wrp-pops/backups` nightly and keeps 14 days. Run `deploy/backup.sh manual` for an extra one.
- Pull a copy home: `scp root@<server>:/var/lib/wrp-pops/tracker.db prisma/dev.db` while nothing is running locally. Local edits are not synced back.

## Population rules

- Growth rates are annual fractions: `0.01` means 1%; `-1` means zero final population.
- Final population is rounded from `(startPopulation + totalAdditions) * (1 + growthRate) ^ (endYear - startYear)`.
- Stored starting populations exclude additions. Every addition belonging to the same nation and era participates in the calculation.
- Timeline saves and the detailed record editor use the same server calculation and transaction. A batch either saves completely or rolls back completely.
- Editing an existing era record preserves its starting population unless explicitly edited. New records start from the latest earlier record, or the nation's founding population when no earlier record exists. Older founding-addition records remain supported.
- Editing a historical population does **not** silently cascade through later saved history. Use **Use [year] Pop** in a later record to explicitly carry forward a revised population.
- Multiple additions are displayed as a total. Editing that total adjusts the last addition and preserves the other entries, dates, IDs, and notes. Duplicate growth records are rejected for editing instead of silently merged or deleted.
- Nation metadata edits preserve omitted fields and historical records. New nations receive an initial growth record in the first eligible era, if one exists.
- Empire names and vassal selections save together. Existing archived members remain selected. Nations assigned to another empire cannot silently be taken over.
- Era year changes recalculate that era's records in a transaction and reject boundaries that exclude existing additions. Era deletion removes only that era and its population records, in one transaction.
- CSV imports run as one transaction. An invalid row rolls back the import; existing nation names are rejected to prevent accidental duplicate imports. The supported header is `Region,Name,Start Year,Start Pop,ADD 110,RATE 110,110,...`.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

`pnpm test` exercises actual Prisma transactions against fresh databases under `.test-data`, including rollback, missing additions, repeated saves, validation, empire membership, and era changes. The compatibility test uses a disposable SQLite backup of the existing database and verifies its source checksum remains unchanged.

`pnpm test:e2e` starts its own Next.js server on **port 3100**, using a fresh `.test-data` database and `.next-test` build directory. It refuses to reuse another server. The browser tests use installed Microsoft Edge. To use another installed browser, update `channel` in `playwright.config.ts`. Traces from failed tests are kept under `test-results`.

Tests never reset or seed `prisma/dev.db`. Do not point the test server at the working database. Next.js's existing Google font needs network access on a fresh build.

## Discord registration integration

The WRP bot creates tracker nations after population approval through bearer-token endpoints under `/api/integrations/discord`. Set the same secret in both apps:

```sh
DISCORD_INTEGRATION_TOKEN=<long random string>
```

The endpoints return `503` until the token is set and `401` for a missing or wrong token.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/regions` | Distinct existing regions for the staff review form |
| `GET` | `/nations?query=` | Search nations, including their linked member |
| `GET` | `/members?guildId=&memberId=` | A member's linked nations |
| `POST` | `/registrations` | Create the nation, initial growth record, and link in one transaction |
| `POST` | `/links` | Link an existing nation to a member without changing its history |
| `POST` | `/releases` | Release a member whose linked nations are all archived |

Registrations are idempotent per `applicationId`: an identical retry returns the original nation with `created: false`; different details return `409`. An existing nation name (case-insensitive) also returns `409` and must be resolved by staff with an explicit link.

The `DiscordRegistration` table is added by an additive migration. Apply it to a copy of the database first, then to the live database:

```sh
pnpm exec prisma migrate deploy
```

## Code organization

- `src/app/api/_lib/records.ts`: validated, transactional writes shared by API routes and server actions.
- `src/app/api/_lib/queries.ts`: typed read queries and chronological population ordering.
- `src/app/api/_lib/import.ts`: atomic CSV import service.
- `src/lib/population.ts` and `src/lib/validation.ts`: shared calculation, input validation, and preview rules.
- `src/app/api/**/route.ts`: thin HTTP handlers with consistent error responses.
- `src/actions`: server actions and page revalidation.
- `tests`: database regression tests and browser workflows.

`pnpm format` formats source and tests with Prettier. `pnpm typecheck` replaces the old, unsupported `next lint` command.

A pre-cleanup SQLite backup is stored locally at `.local-backups/before-cleanup.db`. Backups and test databases are ignored by Git. The cleanup requires no schema migration or historical data rewrite.
