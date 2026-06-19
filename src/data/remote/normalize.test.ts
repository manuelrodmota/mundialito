import { describe, it, expect } from "vitest";
import { normalizeNameKey, buildSquadKey } from "../../../supabase/scripts/normalize.ts";

describe("normalizeNameKey", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeNameKey("Ángel Di María")).toBe("angel di maria");
  });

  it("collapses punctuation to spaces", () => {
    expect(normalizeNameKey("Stéphane Guivarc'h")).toBe("stephane guivarc h");
  });

  it("handles plain ASCII names", () => {
    expect(normalizeNameKey("Ronaldo")).toBe("ronaldo");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeNameKey("  Pelé  ")).toBe("pele");
  });
});

describe("buildSquadKey — given + family reconstruction", () => {
  it("produces the same key as normalizeNameKey on the full name", () => {
    const givenKey = buildSquadKey("Juan Alberto", "Schiaffino");
    const fullKey = normalizeNameKey("Juan Alberto Schiaffino");
    expect(givenKey).toBe(fullKey);
  });

  it("handles accented names in both parts", () => {
    const key = buildSquadKey("Ángel", "Bossio");
    expect(key).toBe("angel bossio");
  });
});
