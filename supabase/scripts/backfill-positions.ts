/**
 * Non-destructive position_code backfill for player_ratings.
 *
 * Unlike import.ts (which truncates + reseeds every table), this ONLY issues
 * UPDATEs on the existing player_ratings rows — safe to run against the hosted
 * production DB without clearing any data. Each rating is matched to its squad
 * row using the exact same normalized name+season+team key the import uses, and
 * that squad row's position_code (GK/DF/MF/FW) is written back.
 *
 * Prereq: the position_code column must already exist
 *   (migration 20260621000001_add_position_to_player_ratings.sql applied).
 *
 * Run (hosted):
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   npx tsx --tsconfig supabase/scripts/tsconfig.scripts.json \
 *     supabase/scripts/backfill-positions.ts
 *
 * Service role bypasses the read-only RLS, so the UPDATEs apply. Idempotent.
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { normalizeNameKey, buildSquadKey } from "./normalize.ts";
import type { Database } from "../../src/data/remote/database.types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "../seed");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

const client = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

interface RawSquadRow {
  team_name: string;
  given_name: string;
  family_name: string;
  tournament_id: string;
  position_code: string;
}

function parseCsv<T>(filename: string): T[] {
  const content = readFileSync(resolve(SEED_DIR, filename), "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true }) as T[];
}

const PAGE = 1000;
const UPDATE_CHUNK = 200;

async function main(): Promise<void> {
  console.log(`🧤 position_code backfill → ${SUPABASE_URL}${DRY_RUN ? " (DRY RUN)" : ""}`);

  // ── squad lookup: normalizedName|year|normalizedTeam → position_code ──────────
  // Mirrors import.ts exactly (buildSquadKey on the squad side, normalizeNameKey
  // on the rating side, which are designed to produce the same key).
  const squads = parseCsv<RawSquadRow>("squads.csv");
  const squadLookup = new Map<string, string>();
  for (const row of squads) {
    if (!row.position_code) continue;
    const year = parseInt(row.tournament_id.replace("WC-", ""), 10);
    const key = `${buildSquadKey(row.given_name, row.family_name)}|${year}|${normalizeNameKey(row.team_name)}`;
    if (!squadLookup.has(key)) squadLookup.set(key, row.position_code.toUpperCase());
  }
  console.log(`Squad lookup: ${squadLookup.size} entries`);

  // ── page through all player_ratings rows ─────────────────────────────────────
  type Row = { id: number; player: string; season: number; team: string };
  const rows: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from("player_ratings")
      .select("id,player,season,team")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`fetch player_ratings failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    offset += data.length;
    if (data.length < PAGE) break;
  }
  console.log(`Fetched ${rows.length} player_ratings rows`);

  // ── resolve a position per row, grouped by code for batched UPDATEs ──────────
  const byPosition = new Map<string, number[]>();
  let matched = 0;
  for (const r of rows) {
    const key = `${normalizeNameKey(r.player)}|${r.season}|${normalizeNameKey(r.team)}`;
    const pos = squadLookup.get(key);
    if (!pos) continue;
    matched++;
    const bucket = byPosition.get(pos) ?? [];
    bucket.push(r.id);
    byPosition.set(pos, bucket);
  }
  const pct = rows.length ? ((matched / rows.length) * 100).toFixed(1) : "0.0";
  console.log(`Matched ${matched}/${rows.length} (${pct}%) to a squad position:`);
  for (const [pos, ids] of [...byPosition].sort()) console.log(`  ${pos}: ${ids.length}`);

  if (DRY_RUN) {
    console.log("Dry run — no writes performed.");
    return;
  }

  // ── batched UPDATE per position via .in('id', chunk) ─────────────────────────
  let written = 0;
  for (const [pos, ids] of byPosition) {
    for (let i = 0; i < ids.length; i += UPDATE_CHUNK) {
      const chunk = ids.slice(i, i + UPDATE_CHUNK);
      const { error } = await client
        .from("player_ratings")
        .update({ position_code: pos } as never)
        .in("id", chunk);
      if (error) throw new Error(`update ${pos} failed: ${error.message}`);
      written += chunk.length;
    }
    console.log(`Updated ${ids.length} → ${pos}`);
  }
  console.log(`\nBackfill complete: ${written} rows updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
