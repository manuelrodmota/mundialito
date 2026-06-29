/**
 * In-place ratings updater (NON-destructive).
 *
 * Updates player_ratings rating columns from supabase/seed/world_cup_overall_ratings.csv
 * by matching (player, season, team) and updating BY ID — so player_ratings.id
 * (== the durable card_id collections reference) is never renumbered.
 *
 * Re-running `import.ts` would DELETE + re-insert and renumber ids (identity column),
 * orphaning every owned card. This script only UPDATEs the numeric rating columns of
 * rows that actually changed; it never inserts/deletes/renumbers.
 *
 * Run via tsx with explicit connection env:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... [DRY_RUN=1] \
 *     tsx --tsconfig supabase/scripts/tsconfig.scripts.json supabase/scripts/updateRatings.ts
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "../seed");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Columns we sync from the CSV (the source of truth). photo is intentionally ignored
// (not part of the player_ratings schema).
const RATING_COLS = ["overall", "attack", "defense", "base_overall"] as const;
type RatingCol = (typeof RATING_COLS)[number];

interface CsvRow {
  player: string;
  season: string;
  team: string;
  overall: string;
  attack: string;
  defense: string;
  base_overall: string;
}

interface DbRow {
  id: number;
  player: string;
  season: number;
  team: string;
  overall: number;
  attack: number;
  defense: number;
  base_overall: number;
}

const key = (player: string, season: number | string, team: string) =>
  `${player}|${season}|${team}`;

async function fetchAllRatings(): Promise<DbRow[]> {
  const PAGE = 1000;
  const rows: DbRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("player_ratings")
      .select("id,player,season,team,overall,attack,defense,base_overall")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch player_ratings failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as DbRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main(): Promise<void> {
  const host = new URL(SUPABASE_URL!).host;
  console.log(`🎯 updateRatings → ${host}  ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"}`);

  const csv = parse(readFileSync(resolve(SEED_DIR, "world_cup_overall_ratings.csv"), "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];

  const desired = new Map<string, Record<RatingCol, number>>();
  for (const r of csv) {
    desired.set(key(r.player, parseInt(r.season, 10), r.team), {
      overall: parseInt(r.overall, 10),
      attack: parseInt(r.attack, 10),
      defense: parseInt(r.defense, 10),
      base_overall: parseInt(r.base_overall, 10),
    });
  }
  console.log(`CSV rows: ${csv.length} (unique keys: ${desired.size})`);

  const dbRows = await fetchAllRatings();
  console.log(`DB rows : ${dbRows.length}`);

  const changes: Array<{ row: DbRow; patch: Partial<Record<RatingCol, number>>; before: Record<RatingCol, number> }> = [];
  let dbUnmatched = 0;
  for (const row of dbRows) {
    const want = desired.get(key(row.player, row.season, row.team));
    if (!want) {
      dbUnmatched++;
      continue;
    }
    const patch: Partial<Record<RatingCol, number>> = {};
    const before: Record<RatingCol, number> = {} as Record<RatingCol, number>;
    for (const c of RATING_COLS) {
      if (row[c] !== want[c]) {
        patch[c] = want[c];
        before[c] = row[c];
      }
    }
    if (Object.keys(patch).length > 0) changes.push({ row, patch, before });
  }

  // CSV keys with no DB row (informational only — we never insert)
  const dbKeys = new Set(dbRows.map((r) => key(r.player, r.season, r.team)));
  let csvUnmatched = 0;
  for (const k of desired.keys()) if (!dbKeys.has(k)) csvUnmatched++;

  console.log(`\nChanged rows: ${changes.length}`);
  console.log(`DB rows not in CSV (left untouched): ${dbUnmatched}`);
  console.log(`CSV rows not in DB (NOT inserted): ${csvUnmatched}`);

  const overallChanges = changes.filter((c) => c.patch.overall !== undefined);
  console.log(`Rows with an OVERALL change: ${overallChanges.length}`);
  console.log("\nSample changes (up to 30):");
  for (const c of changes.slice(0, 30)) {
    const parts = RATING_COLS.filter((col) => c.patch[col] !== undefined)
      .map((col) => `${col} ${c.before[col]}→${c.patch[col]}`)
      .join(", ");
    console.log(`  [id ${c.row.id}] ${c.row.player} ${c.row.season} (${c.row.team}): ${parts}`);
  }

  if (DRY_RUN) {
    console.log("\nDRY RUN — no writes performed.");
    return;
  }
  if (changes.length === 0) {
    console.log("\nNothing to update.");
    return;
  }

  console.log(`\nApplying ${changes.length} updates by id…`);
  const BATCH = 20;
  let done = 0;
  for (let i = 0; i < changes.length; i += BATCH) {
    const slice = changes.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async ({ row, patch }) => {
        const { error } = await client.from("player_ratings").update(patch).eq("id", row.id);
        if (error) throw new Error(`update id ${row.id} failed: ${error.message}`);
      }),
    );
    done += slice.length;
    if (done % 200 === 0 || done === changes.length) console.log(`  ${done}/${changes.length}`);
  }
  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
