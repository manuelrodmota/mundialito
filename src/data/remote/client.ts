/**
 * Typed Supabase client factory.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Vite's env
 * (inlined at build time). The anon key is safe to ship to the browser;
 * the service-role key must never appear in VITE_* variables.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

let _client: SupabaseClient<Database> | null = null;

/** Returns the singleton typed Supabase client for browser use. */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !key) {
    throw new Error(
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.local.",
    );
  }

  _client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
