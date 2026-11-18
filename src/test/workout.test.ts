import { describe, expect, it } from "vitest";
import {
  MUSCLES,
  WEIGHT_PRESETS,
  isNewPR,
  parseWeight,
  personalBests,
  prMilestones,
  clampSetCount,
  countSets,
  summarize,
  weeklySplit,
  type WorkoutSet,
} from "@/lib/workout";

const s = (muscle: WorkoutSet["muscle"], weight: number, setCount: number, performed_at: string): WorkoutSet => ({
  muscle,
  weight,
  setCount,
  performed_at,
});

describe("workout rules", () => {
  it("offers exactly the seven defined muscles", () => {
    expect([...MUSCLES]).toEqual(["biceps", "triceps", "chest", "shoulder", "back", "abs", "legs"]);
  });

  it("quick weights go from 10 to 60 lbs in 5 lb steps", () => {
    expect(WEIGHT_PRESETS).toEqual([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  });

  it("accepts custom and heavier weights but rejects invalid ones", () => {
    expect(parseWeight("135")).toBe(135);
    expect(parseWeight("72.5")).toBe(72.5);
    expect(parseWeight("0")).toBeNull();
    expect(parseWeight("-5")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
  });

  it("one save records how many sets were done, and totals add them up", () => {
    expect(countSets([{ setCount: 3 }, { setCount: 4 }])).toBe(7);
  });

  it("number of sets per save stays between 1 and 20", () => {
    expect(clampSetCount(0)).toBe(1);
    expect(clampSetCount(3)).toBe(3);
    expect(clampSetCount(25)).toBe(20);
  });

  it("PR milestones only record increases in heaviest weight per muscle", () => {
    const sets = [
      s("chest", 40, 10, "2026-01-01T10:00:00Z"),
      s("chest", 35, 12, "2026-01-02T10:00:00Z"),
      s("chest", 50, 8, "2026-01-03T10:00:00Z"),
      s("legs", 100, 5, "2026-01-03T11:00:00Z"),
    ];
    expect(prMilestones(sets).map((m) => [m.muscle, m.weight, m.previous])).toEqual([
      ["chest", 40, null],
      ["chest", 50, 40],
      ["legs", 100, null],
    ]);
    expect(personalBests(sets).chest?.weight).toBe(50);
    expect(personalBests(sets).back).toBeNull();
  });

  it("flags a new PR only when beating an earlier set for that muscle", () => {
    const earlier = [s("biceps", 30, 10, "2026-01-01T10:00:00Z")];
    expect(isNewPR({ muscle: "biceps", weight: 35 }, earlier)).toBe(true);
    expect(isNewPR({ muscle: "biceps", weight: 30 }, earlier)).toBe(false);
    expect(isNewPR({ muscle: "back", weight: 200 }, earlier)).toBe(false);
  });

  it("weekly split counts sets this week vs last week (Monday start)", () => {
    const now = new Date(2026, 0, 14, 12); // Wed Jan 14 2026
    const sets = [
      s("back", 50, 3, new Date(2026, 0, 12, 9).toISOString()), // this week
      s("back", 50, 4, new Date(2026, 0, 13, 9).toISOString()), // this week
      s("back", 50, 2, new Date(2026, 0, 8, 9).toISOString()), // last week
    ];
    const back = weeklySplit(sets, now).find((p) => p.muscle === "back");
    expect(back).toMatchObject({ thisWeek: 7, lastWeek: 2 });
  });

  it("streak counts consecutive training days", () => {
    const now = new Date(2026, 0, 14, 20);
    const sets = [
      s("abs", 10, 20, new Date(2026, 0, 14, 9).toISOString()),
      s("abs", 10, 20, new Date(2026, 0, 13, 9).toISOString()),
      s("abs", 10, 20, new Date(2026, 0, 11, 9).toISOString()),
    ];
    expect(summarize(sets, now).currentStreak).toBe(2);
  });
});

import { performedAtFor } from "@/lib/workout";
describe("logging for a past date", () => {
  const now = new Date(2026, 10, 16, 9, 30);
  it("uses the current time for today", () => {
    expect(performedAtFor("2026-11-16", now)).toBe(now.toISOString());
  });
  it("saves a past day at noon that day", () => {
    expect(performedAtFor("2026-11-10", now)).toBe(new Date(2026, 10, 10, 12).toISOString());
  });
  it("never saves in the future", () => {
    expect(performedAtFor("2026-12-01", now)).toBe(now.toISOString());
  });
});
