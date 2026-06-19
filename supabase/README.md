# World Cup Clash — Supabase Data Backend

Local-first Supabase setup for the World Cup Clash game data. This covers
players, ratings, squads, and campaign opponents sourced from the 3 CSVs
in `supabase/seed/`.

## Prerequisites

- Supabase CLI 2.98+: `brew install supabase/tap/supabase`
- Docker Desktop running

## Workflow

### Start the local stack

```sh
pnpm supabase:start
```

The first boot pulls Docker images (~2 min). Subsequent starts are fast.
Studio is at http://127.0.0.1:54423.

### Apply migrations

```sh
pnpm db:reset
```

Truncates and re-applies all migrations from `supabase/migrations/`. Safe
to run repeatedly.

### Seed the database

Copy `.env.example` to `.env.local` and fill in the service-role key
(printed by `supabase start`):

```sh
cp .env.example .env.local
# edit .env.local — set SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL=http://127.0.0.1:54421 \
  SUPABASE_SERVICE_ROLE_KEY=<key> \
  pnpm seed
```

The seed script reads the 3 CSVs, inserts all rows idempotently, and
runs the squads↔ratings normalization. A coverage report lands in
`supabase/out/coverage.json` (gitignored).

Spot-check output to verify:
- Schiaffino 1950: overall=96
- 2026 rated rows: 1248

### Re-generate TypeScript types

After any migration change:

```sh
pnpm db:types
```

Commits the updated `src/data/remote/database.types.ts`.

### Stop the local stack

```sh
pnpm supabase:stop
```

## Ports (mundialito project)

| Service  | Port  |
|----------|-------|
| API/REST | 54421 |
| DB       | 54422 |
| Studio   | 54423 |
| Email    | 54424 |

## API shape (PostgREST examples)

```
# 2026 players sorted by overall
GET /rest/v1/player_ratings?season=eq.2026&order=overall.desc

# Brazil 2022 squad
GET /rest/v1/player_ratings?season=eq.2022&team=eq.Brazil

# Difficulty-5 arcade opponents
GET /rest/v1/campaign_teams?difficulty=eq.4

# Squad members for a tournament/team
GET /rest/v1/squad_members?tournament_id=eq.WC-2022&team_id=eq.T-01
```

All tables are read-only for the anon key. The browser client uses only
the anon key (`VITE_SUPABASE_ANON_KEY`). Write attempts are denied by
RLS on all 6 tables.

## Data model

| Table           | Source CSV                        | Notes                               |
|-----------------|-----------------------------------|-------------------------------------|
| `teams`         | squads.csv                        | Deduplicated team_id/name/code      |
| `tournaments`   | squads.csv                        | WC-1930…2026; is_womens from year   |
| `players`       | squads.csv                        | Canonical player_id/given/family    |
| `player_ratings`| world_cup_overall_ratings.csv     | Card pool: men's 1950–2026          |
| `squad_members` | squads.csv                        | Positional + shirt data             |
| `campaign_teams`| wc_campaign_teams.csv             | Arcade opponents 1930–2022          |

Card rarity/cost/slots are derived at query time from `overall` per GDD §4 —
not stored in the DB.

## WCC-050 — Cloud publish handoff

This story is **out of scope** for the local-first build; it requires the
user to provision a hosted Supabase project.

### Steps (user action required)

1. Create a project at https://supabase.com (free tier is sufficient for
   ~22K rows).
2. Link: `supabase link --project-ref <ref>`
3. Push schema: `supabase db push`
4. Seed: run `pnpm seed` pointed at the hosted URL + service-role key.
5. Update `.env.local` (or your CI env) with the hosted URL and anon key.

### 7-day inactivity auto-pause (free tier)

The free Supabase plan pauses projects after 7 days of inactivity. Options:
- **Keep-alive ping**: schedule a daily `cron` or Vercel cron that calls
  `GET /rest/v1/player_ratings?limit=1` with the anon key.
- **Upgrade to Pro**: eliminates the pause limit at $25/mo.

### Egress note

Supabase free tier includes 5 GB/mo egress. At ~22K rows the player pool
query is tiny. Monitor in the Supabase dashboard if traffic grows.
