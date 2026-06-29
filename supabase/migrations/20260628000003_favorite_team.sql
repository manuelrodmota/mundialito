-- World Cup Clash — profile favorite team (nation crest shown on the account).
-- Nullable; updated by the owner via the existing profiles RLS update policy.
alter table public.profiles add column if not exists favorite_team text;
