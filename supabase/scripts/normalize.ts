/**
 * Name normalization utilities shared by the import script and tests.
 * Converts player names to a canonical comparison key by stripping accents,
 * lowercasing, and collapsing whitespace/punctuation — matching the slugify
 * logic in src/data/players.ts.
 */

/** NFD-decompose + strip combining diacritical marks + lowercase + collapse punctuation. */
export function normalizeNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Build a squad lookup key used to join ratings rows to squad_members rows.
 * Ratings carry "Given Family" full names; squads split given_name/family_name.
 * We reconstruct "given family" from squads and normalize both sides.
 */
export function buildSquadKey(givenName: string, familyName: string): string {
  return normalizeNameKey(`${givenName} ${familyName}`);
}
