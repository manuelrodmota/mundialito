import { describe, expect, it } from "vitest";
import type { Card } from "../engine";
import {
  advanceRun,
  isRunOver,
  isRunWon,
  newRun,
  stageForIndex,
} from "./runState";

const DUMMY_DECK: Card[] = [];
const CAPTAIN_ID = "player-001";

describe("stageForIndex", () => {
  it("maps indices 0–2 to group", () => {
    expect(stageForIndex(0)).toBe("group");
    expect(stageForIndex(1)).toBe("group");
    expect(stageForIndex(2)).toBe("group");
  });

  it("maps index 3 to r16", () => {
    expect(stageForIndex(3)).toBe("r16");
  });

  it("maps index 4 to qf", () => {
    expect(stageForIndex(4)).toBe("qf");
  });

  it("maps index 5 to sf", () => {
    expect(stageForIndex(5)).toBe("sf");
  });

  it("maps index 6 to final", () => {
    expect(stageForIndex(6)).toBe("final");
  });

  it("maps indices beyond 6 to final", () => {
    expect(stageForIndex(7)).toBe("final");
    expect(stageForIndex(99)).toBe("final");
  });
});

describe("newRun", () => {
  it("starts at matchIndex 0 in the group stage", () => {
    const run = newRun(DUMMY_DECK, CAPTAIN_ID);
    expect(run.matchIndex).toBe(0);
    expect(run.stage).toBe("group");
  });

  it("starts with empty defeated list and alive=true", () => {
    const run = newRun(DUMMY_DECK, CAPTAIN_ID);
    expect(run.defeated).toEqual([]);
    expect(run.alive).toBe(true);
  });

  it("stores deck and captainId", () => {
    const run = newRun(DUMMY_DECK, CAPTAIN_ID);
    expect(run.deck).toBe(DUMMY_DECK);
    expect(run.captainId).toBe(CAPTAIN_ID);
  });
});

describe("advanceRun", () => {
  it("records the beaten opponent and increments matchIndex on a win", () => {
    const run = newRun(DUMMY_DECK, CAPTAIN_ID);
    const next = advanceRun(run, true, "opp-a");
    expect(next.defeated).toEqual(["opp-a"]);
    expect(next.matchIndex).toBe(1);
  });

  it("sets alive=false on a loss", () => {
    const run = newRun(DUMMY_DECK, CAPTAIN_ID);
    const next = advanceRun(run, false, "opp-a");
    expect(next.alive).toBe(false);
  });

  it("does not mutate the input run", () => {
    const run = newRun(DUMMY_DECK, CAPTAIN_ID);
    advanceRun(run, true, "opp-a");
    expect(run.matchIndex).toBe(0);
    expect(run.defeated).toEqual([]);
  });

  it("accumulates multiple beaten opponents across advances", () => {
    let run = newRun(DUMMY_DECK, CAPTAIN_ID);
    run = advanceRun(run, true, "opp-a");
    run = advanceRun(run, true, "opp-b");
    expect(run.defeated).toEqual(["opp-a", "opp-b"]);
  });
});

describe("7-stage scripted run with all wins", () => {
  const opponents = [
    "opp-g1",
    "opp-g2",
    "opp-g3",
    "opp-r16",
    "opp-qf",
    "opp-sf",
    "opp-final",
  ];

  function runAllMatches() {
    let run = newRun(DUMMY_DECK, CAPTAIN_ID);
    const stages: RunState["stage"][] = [];

    for (const oppId of opponents) {
      stages.push(run.stage);
      run = advanceRun(run, true, oppId);
    }

    return { run, stages };
  }

  it("visits all expected stages in order", () => {
    const { stages } = runAllMatches();
    expect(stages).toEqual(["group", "group", "group", "r16", "qf", "sf", "final"]);
  });

  it("accumulates all 7 defeated opponents", () => {
    const { run } = runAllMatches();
    expect(run.defeated).toEqual(opponents);
  });

  it("remains alive after all 7 wins", () => {
    const { run } = runAllMatches();
    expect(run.alive).toBe(true);
  });

  it("isRunWon returns true after the Final is cleared", () => {
    const { run } = runAllMatches();
    expect(isRunWon(run)).toBe(true);
  });

  it("isRunOver returns true after the Final is cleared", () => {
    const { run } = runAllMatches();
    expect(isRunOver(run)).toBe(true);
  });
});

describe("permadeath — loss at each stage", () => {
  const stageIndices = [0, 1, 2, 3, 4, 5, 6];

  it.each(stageIndices)("a loss at matchIndex %i sets alive=false", (lossAt) => {
    let run = newRun(DUMMY_DECK, CAPTAIN_ID);

    for (let i = 0; i < lossAt; i++) {
      run = advanceRun(run, true, `opp-${i}`);
    }

    run = advanceRun(run, false, `opp-${lossAt}`);

    expect(run.alive).toBe(false);
    expect(isRunOver(run)).toBe(true);
    expect(isRunWon(run)).toBe(false);
  });
});

describe("isRunOver / isRunWon — intermediate wins", () => {
  it("isRunOver is false while the run is in progress", () => {
    let run = newRun(DUMMY_DECK, CAPTAIN_ID);
    run = advanceRun(run, true, "opp-g1");
    expect(isRunOver(run)).toBe(false);
    expect(isRunWon(run)).toBe(false);
  });

  it("isRunWon is false immediately after the SF", () => {
    let run = newRun(DUMMY_DECK, CAPTAIN_ID);
    for (const id of ["g1", "g2", "g3", "r16", "qf", "sf"]) {
      run = advanceRun(run, true, id);
    }
    expect(run.stage).toBe("final");
    expect(isRunWon(run)).toBe(false);
    expect(isRunOver(run)).toBe(false);
  });
});

type RunState = import("../engine").RunState;
