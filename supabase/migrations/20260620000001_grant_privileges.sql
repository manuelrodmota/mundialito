-- Grant table privileges to the API roles.
--
-- The Supabase CLI >= ~2.50 no longer auto-applies default privileges to the
-- anon / authenticated / service_role roles for tables created by migrations,
-- so without these grants every REST request 42501s ("permission denied for
-- table ...") even though the read-only RLS policies exist. RLS is only
-- evaluated *after* the role already holds the table-level GRANT.
--
--   * anon / authenticated -> SELECT only (writes still blocked: no write
--     policies exist on these tables, and they lack INSERT/UPDATE/DELETE).
--   * service_role          -> full DML so the seed import (import.ts) can load.

grant usage on schema public to anon, authenticated, service_role;

-- Existing tables
grant select on all tables in schema public to anon, authenticated;
grant all    on all tables in schema public to service_role;
grant all    on all sequences in schema public to service_role;

-- Future tables created by the postgres role inherit the same grants,
-- so later migrations don't have to repeat this.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
