import { describe, it, expect } from "vitest";
import type { TacticalEffect } from "../engine/types.ts";
import { tacticals } from "./tacticals.ts";

const ALL_KINDS: TacticalEffect["kind"][] = [
  "var",
  "offsideTrap",
  "referee",
  "injury",
  "waterBreak",
  "substitution",
  "tikiTaka",
  "catenaccio",
  "counterAttack",
  "highPress",
  "longBall",
  "nutmeg",
  "penalty",
  "teamTalk",
  "timeWasting",
  "handOfGod",
  "fortress",
  "talisman",
  "totalFootball",
];

describe("tacticals catalog", () => {
  it("contains exactly 19 cards covering all effect kinds", () => {
    expect(tacticals).toHaveLength(ALL_KINDS.length);

    const presentKinds = new Set(tacticals.map((t) => t.effect.kind));
    for (const kind of ALL_KINDS) {
      expect(presentKinds, `missing kind: ${kind}`).toContain(kind);
    }
  });

  it("all ids are unique", () => {
    const ids = tacticals.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all cards carry type: 'tactical'", () => {
    for (const card of tacticals) {
      expect(card.type).toBe("tactical");
    }
  });

  describe("category and stamina cost per §12", () => {
    const byCost = (kind: TacticalEffect["kind"]) =>
      tacticals.find((t) => t.effect.kind === kind)!;

    it.each([
      ["var", "instant", 2],
      ["offsideTrap", "instant", 2],
      ["referee", "instant", 1],
      ["injury", "instant", 2],
    ] as const)("%s — category=%s cost=%d", (kind, cat, cost) => {
      const card = byCost(kind);
      expect(card.category).toBe(cat);
      expect(card.cost).toBe(cost);
    });

    it.each([
      ["waterBreak", "skill", 0],
      ["substitution", "skill", 1],
      ["tikiTaka", "skill", 1],
      ["catenaccio", "skill", 2],
      ["counterAttack", "skill", 1],
      ["highPress", "skill", 1],
      ["longBall", "skill", 1],
      ["nutmeg", "skill", 1],
      ["penalty", "skill", 2],
      ["teamTalk", "skill", 1],
      ["timeWasting", "skill", 1],
    ] as const)("%s — category=%s cost=%d", (kind, cat, cost) => {
      const card = byCost(kind);
      expect(card.category).toBe(cat);
      expect(card.cost).toBe(cost);
    });

    it.each([
      ["handOfGod", "power", 3],
      ["fortress", "power", 3],
      ["talisman", "power", 2],
      ["totalFootball", "power", 3],
    ] as const)("%s — category=%s cost=%d", (kind, cat, cost) => {
      const card = byCost(kind);
      expect(card.category).toBe(cat);
      expect(card.cost).toBe(cost);
    });
  });

  describe("player-gated cards carry correct requiresPosition / requiresCount per §12", () => {
    it("offsideTrap requires ≥1 DEF", () => {
      const card = tacticals.find((t) => t.effect.kind === "offsideTrap")!;
      expect(card.effect.requiresPosition).toBe("DEF");
      expect(card.effect.requiresCount).toBe(1);
    });

    it("tikiTaka requires ≥2 MID", () => {
      const card = tacticals.find((t) => t.effect.kind === "tikiTaka")!;
      expect(card.effect.requiresPosition).toBe("MID");
      expect(card.effect.requiresCount).toBe(2);
    });

    it("catenaccio requires ≥2 DEF", () => {
      const card = tacticals.find((t) => t.effect.kind === "catenaccio")!;
      expect(card.effect.requiresPosition).toBe("DEF");
      expect(card.effect.requiresCount).toBe(2);
    });

    it("counterAttack requires a FWD", () => {
      const card = tacticals.find((t) => t.effect.kind === "counterAttack")!;
      expect(card.effect.requiresPosition).toBe("FWD");
      expect(card.effect.requiresCount).toBe(1);
    });

    it("highPress requires ≥2 FWD-or-MID (requiresCount only — no single requiresPosition)", () => {
      const card = tacticals.find((t) => t.effect.kind === "highPress")!;
      expect(card.effect.requiresCount).toBe(2);
      expect(card.effect.requiresPosition).toBeUndefined();
    });

    it("longBall requires a FWD", () => {
      const card = tacticals.find((t) => t.effect.kind === "longBall")!;
      expect(card.effect.requiresPosition).toBe("FWD");
      expect(card.effect.requiresCount).toBe(1);
    });

    it("nutmeg requires a FWD", () => {
      const card = tacticals.find((t) => t.effect.kind === "nutmeg")!;
      expect(card.effect.requiresPosition).toBe("FWD");
      expect(card.effect.requiresCount).toBe(1);
    });

    it("penalty requires a FWD", () => {
      const card = tacticals.find((t) => t.effect.kind === "penalty")!;
      expect(card.effect.requiresPosition).toBe("FWD");
      expect(card.effect.requiresCount).toBe(1);
    });

    it("handOfGod requires a FWD", () => {
      const card = tacticals.find((t) => t.effect.kind === "handOfGod")!;
      expect(card.effect.requiresPosition).toBe("FWD");
      expect(card.effect.requiresCount).toBe(1);
    });
  });

  describe("amount values per §12", () => {
    it("tikiTaka amount is 0.20", () => {
      expect(tacticals.find((t) => t.effect.kind === "tikiTaka")!.effect.amount).toBe(0.20);
    });

    it("counterAttack amount is 0.40", () => {
      expect(tacticals.find((t) => t.effect.kind === "counterAttack")!.effect.amount).toBe(0.40);
    });

    it("longBall amount is 0.45", () => {
      expect(tacticals.find((t) => t.effect.kind === "longBall")!.effect.amount).toBe(0.45);
    });

    it("penalty amount is 0.78 (v11 forced-shot conversion)", () => {
      expect(tacticals.find((t) => t.effect.kind === "penalty")!.effect.amount).toBe(0.78);
    });

    it("handOfGod amount is 0.95 (v11 forced-shot conversion)", () => {
      expect(tacticals.find((t) => t.effect.kind === "handOfGod")!.effect.amount).toBe(0.95);
    });

    it("fortress amount is 8", () => {
      expect(tacticals.find((t) => t.effect.kind === "fortress")!.effect.amount).toBe(8);
    });

    it("talisman amount is 3", () => {
      expect(tacticals.find((t) => t.effect.kind === "talisman")!.effect.amount).toBe(3);
    });

    it("injury amount is 15", () => {
      expect(tacticals.find((t) => t.effect.kind === "injury")!.effect.amount).toBe(15);
    });
  });

  describe("officiating / unconditional cards carry no position gate", () => {
    it.each(["var", "referee", "injury", "waterBreak", "substitution", "teamTalk", "timeWasting", "fortress", "talisman", "totalFootball"] as const)(
      "%s has no requiresPosition",
      (kind) => {
        const card = tacticals.find((t) => t.effect.kind === kind)!;
        expect(card.effect.requiresPosition).toBeUndefined();
      },
    );
  });

  describe("legendary-tier Power cards have slots ≥ 2 per §15", () => {
    it("handOfGod slots = 2", () => {
      expect(tacticals.find((t) => t.effect.kind === "handOfGod")!.slots).toBe(2);
    });

    it("totalFootball slots = 2", () => {
      expect(tacticals.find((t) => t.effect.kind === "totalFootball")!.slots).toBe(2);
    });
  });
});
