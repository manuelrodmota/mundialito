/**
 * Idempotent CSV → Postgres import script.
 * Run via: npm run seed  (uses tsx under tsconfig.scripts.json)
 *
 * Reads the 3 CSVs from supabase/seed/, truncates + re-inserts all rows,
 * then runs the squads↔ratings normalization to populate player_ratings.player_id.
 *
 * Requires SUPABASE_DB_URL or the local defaults (postgres://postgres:postgres@localhost:54322/postgres).
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { normalizeNameKey, buildSquadKey } from "./normalize.ts";
import type { Database } from "../../src/data/remote/database.types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "../seed");
const OUT_DIR = resolve(__dirname, "../out");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY is required. Get it from `supabase start` output.",
  );
  process.exit(1);
}

const client = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── CSV parsers ───────────────────────────────────────────────────────────────

interface RawRatingRow {
  player: string;
  season: string;
  team: string;
  overall: string;
  attack: string;
  defense: string;
  base_overall: string;
  podium_finish: string;
  era_boost: string;
  rating_source: string;
}

interface RawSquadRow {
  key_id: string;
  tournament_id: string;
  tournament_name: string;
  team_id: string;
  team_name: string;
  team_code: string;
  player_id: string;
  family_name: string;
  given_name: string;
  shirt_number: string;
  position_name: string;
  position_code: string;
}

interface RawCampaignRow {
  year: string;
  host_country: string;
  team: string;
  finish: string;
  difficulty: string;
  description_en: string;
  description_es: string;
  description_pt: string;
}

function parseCsv<T>(filename: string): T[] {
  const content = readFileSync(resolve(SEED_DIR, filename), "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true }) as T[];
}

// ── Odd-year → Women's WC heuristic ──────────────────────────────────────────

function isWomens(tournamentId: string): boolean {
  const year = parseInt(tournamentId.replace("WC-", ""), 10);
  return year % 2 !== 0;
}

// ── Bulk-insert helpers ───────────────────────────────────────────────────────

const CHUNK = 500;

async function insertChunked<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await client.from(table).insert(chunk as never[]);
    if (error) throw new Error(`Insert into ${table} failed: ${error.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🌍 World Cup Clash — CSV import starting…");

  const ratings = parseCsv<RawRatingRow>("world_cup_overall_ratings.csv");
  const squads = parseCsv<RawSquadRow>("squads.csv");
  const campaigns = parseCsv<RawCampaignRow>("wc_campaign_teams.csv");

  console.log(
    `Parsed: ${ratings.length} ratings, ${squads.length} squads, ${campaigns.length} campaigns`,
  );

  // ── Truncate (idempotent) ───────────────────────────────────────────────────
  // Order matters: FK children first, then parents.
  for (const tbl of [
    "player_ratings",
    "squad_members",
    "campaign_teams",
    "players",
    "teams",
    "tournaments",
  ]) {
    const { error } = await client.rpc("truncate_table" as never, {
      table_name: tbl,
    });
    if (error) {
      // RPC not available on local anon — use raw SQL via the service role
      // The supabase-js client does not expose raw SQL for service role;
      // we work around by deleting all rows which achieves idempotency.
      const { error: delErr } = await client.from(tbl as never).delete().gte("id" as never, 0 as never);
      if (delErr) {
        // Tables without numeric id (teams, tournaments, players) use text PK
        const { error: delErr2 } = await client.from(tbl as never).delete().neq("team_id" as never, "__never__");
        if (delErr2) {
          const { error: delErr3 } = await client.from(tbl as never).delete().neq("tournament_id" as never, "__never__");
          if (delErr3) {
            const { error: delErr4 } = await client.from(tbl as never).delete().neq("player_id" as never, "__never__");
            if (delErr4) console.warn(`  Warning: could not clear ${tbl}: ${delErr4.message}`);
          }
        }
      }
    }
  }
  console.log("Tables cleared.");

  // ── Insert teams (deduplicated from squads) ─────────────────────────────────
  const teamsMap = new Map<string, { team_id: string; team_name: string; team_code: string }>();
  for (const row of squads) {
    if (!teamsMap.has(row.team_id)) {
      teamsMap.set(row.team_id, {
        team_id: row.team_id,
        team_name: row.team_name,
        team_code: row.team_code,
      });
    }
  }
  await insertChunked("teams", [...teamsMap.values()]);
  console.log(`Inserted ${teamsMap.size} teams.`);

  // ── Insert tournaments (deduplicated from squads) ───────────────────────────
  const tournsMap = new Map<
    string,
    { tournament_id: string; tournament_name: string; year: number; is_womens: boolean }
  >();
  for (const row of squads) {
    if (!tournsMap.has(row.tournament_id)) {
      const year = parseInt(row.tournament_id.replace("WC-", ""), 10);
      tournsMap.set(row.tournament_id, {
        tournament_id: row.tournament_id,
        tournament_name: row.tournament_name,
        year,
        is_womens: isWomens(row.tournament_id),
      });
    }
  }
  await insertChunked("tournaments", [...tournsMap.values()]);
  console.log(`Inserted ${tournsMap.size} tournaments.`);

  // ── Insert players (deduplicated from squads) ───────────────────────────────
  const playersMap = new Map<
    string,
    { player_id: string; family_name: string; given_name: string }
  >();
  for (const row of squads) {
    if (!playersMap.has(row.player_id)) {
      playersMap.set(row.player_id, {
        player_id: row.player_id,
        family_name: row.family_name,
        given_name: row.given_name,
      });
    }
  }
  await insertChunked("players", [...playersMap.values()]);
  console.log(`Inserted ${playersMap.size} players.`);

  // ── Insert squad_members ───────────────────────────────────────────────────
  const squadRows = squads.map((row) => ({
    tournament_id: row.tournament_id,
    team_id: row.team_id,
    player_id: row.player_id,
    shirt_number: row.shirt_number ? parseInt(row.shirt_number, 10) : null,
    position_code: row.position_code.toUpperCase(),
    position_name: row.position_name,
  }));
  await insertChunked("squad_members", squadRows);
  console.log(`Inserted ${squadRows.length} squad_members.`);

  // ── Insert campaign_teams ──────────────────────────────────────────────────
  const campaignRows = campaigns.map((row) => ({
    year: parseInt(row.year, 10),
    host_country: row.host_country,
    team: row.team,
    finish: row.finish,
    difficulty: parseInt(row.difficulty, 10),
    description_en: row.description_en || null,
    description_es: row.description_es || null,
    description_pt: row.description_pt || null,
  }));
  await insertChunked("campaign_teams", campaignRows);
  console.log(`Inserted ${campaignRows.length} campaign_teams.`);

  // ── Build squad lookup for normalization ───────────────────────────────────
  // key: "normalizedName|year|normalizedTeamName" → player_id
  type SquadLookupEntry = { player_id: string; tournament_year: number; team_name: string };
  const squadLookup = new Map<string, SquadLookupEntry>();
  for (const row of squads) {
    const year = parseInt(row.tournament_id.replace("WC-", ""), 10);
    const nameKey = buildSquadKey(row.given_name, row.family_name);
    const teamKey = normalizeNameKey(row.team_name);
    const lookupKey = `${nameKey}|${year}|${teamKey}`;
    if (!squadLookup.has(lookupKey)) {
      squadLookup.set(lookupKey, {
        player_id: row.player_id,
        tournament_year: year,
        team_name: row.team_name,
      });
    }
  }

  // ── Insert player_ratings + resolve player_id via normalization ────────────
  let matched = 0;
  let unmatched = 0;
  const unmatchedRows: Array<{ player: string; season: number; team: string }> = [];

  const ratingRows = ratings.map((row) => {
    const season = parseInt(row.season, 10);
    const nameKey = normalizeNameKey(row.player);
    const teamKey = normalizeNameKey(row.team);
    const lookupKey = `${nameKey}|${season}|${teamKey}`;

    let resolvedPlayerId: string | null = null;
    if (squadLookup.has(lookupKey)) {
      resolvedPlayerId = squadLookup.get(lookupKey)!.player_id;
      matched++;
    } else {
      unmatched++;
      unmatchedRows.push({ player: row.player, season, team: row.team });
    }

    return {
      player: row.player,
      season,
      team: row.team,
      overall: parseInt(row.overall, 10),
      attack: parseInt(row.attack, 10),
      defense: parseInt(row.defense, 10),
      base_overall: parseInt(row.base_overall, 10),
      podium_finish: row.podium_finish || null,
      era_boost: row.era_boost ? parseFloat(row.era_boost) : null,
      rating_source: row.rating_source || null,
      player_id: resolvedPlayerId,
    };
  });

  await insertChunked("player_ratings", ratingRows);
  console.log(`Inserted ${ratingRows.length} player_ratings.`);

  // ── Coverage report ────────────────────────────────────────────────────────
  const total = matched + unmatched;
  const pct = total > 0 ? ((matched / total) * 100).toFixed(1) : "0.0";
  console.log(`\nJoin coverage: ${matched}/${total} (${pct}%) matched to a squad player_id.`);
  console.log(`Unmatched: ${unmatched}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const report = { matched, unmatched, total, coveragePct: parseFloat(pct), unmatched_rows: unmatchedRows };
  writeFileSync(resolve(OUT_DIR, "coverage.json"), JSON.stringify(report, null, 2));
  console.log(`Coverage report → supabase/out/coverage.json`);

  // ── Spot checks ───────────────────────────────────────────────────────────
  const schiaffino = ratingRows.find(
    (r) => normalizeNameKey(r.player) === normalizeNameKey("Juan Alberto Schiaffino") && r.season === 1950,
  );
  if (schiaffino) {
    console.log(
      `\nSpot check — Schiaffino 1950: overall=${schiaffino.overall} (expected 96), player_id=${schiaffino.player_id ?? "no match"}`,
    );
  } else {
    console.warn("Spot check — Schiaffino 1950: NOT FOUND in ratings");
  }

  const rows2026 = ratingRows.filter((r) => r.season === 2026);
  console.log(`Spot check — 2026 rated rows: ${rows2026.length} (expected 1248)`);

  console.log("\nImport complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
