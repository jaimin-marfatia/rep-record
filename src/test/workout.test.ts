import { describe, expect, it } from "vitest";
import {
  MUSCLES,
  WEIGHT_PRESETS,
  isNewPR,
  parseWeight,
  personalBests,
  prMilestones,
  setVolume,
  summarize,
  weeklySplit,
  type WorkoutSet,
} from "@/lib/workout";

const s = (muscle: WorkoutSet["muscle"], weight: number, reps: number, performed_at: string): WorkoutSet => ({
  muscle,
  weight,
  reps,
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

  it("volume is total weight times reps", () => {
    expect(setVolume({ weight: 45, reps: 10 })).toBe(450);
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
      s("back", 50, 10, new Date(2026, 0, 12, 9).toISOString()), // this week
      s("back", 50, 10, new Date(2026, 0, 13, 9).toISOString()), // this week
      s("back", 50, 10, new Date(2026, 0, 8, 9).toISOString()), // last week
    ];
    const back = weeklySplit(sets, now).find((p) => p.muscle === "back");
    expect(back).toMatchObject({ thisWeek: 2, lastWeek: 1 });
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
