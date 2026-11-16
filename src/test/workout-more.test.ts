import { describe, expect, it } from "vitest";
import {
  MAX_WEIGHT,
  activityGrid,
  dailyTrend,
  formatLbs,
  isMuscle,
  parseWeight,
  personalBests,
  summarize,
  weeklySplit,
  type WorkoutSet,
} from "@/lib/workout";

const s = (muscle: WorkoutSet["muscle"], weight: number, reps: number, d: Date): WorkoutSet => ({
  muscle,
  weight,
  reps,
  performed_at: d.toISOString(),
});

describe("custom weight entry", () => {
  it("allows weights above 60 lb up to the maximum", () => {
    expect(parseWeight("225")).toBe(225);
    expect(parseWeight(String(MAX_WEIGHT))).toBe(MAX_WEIGHT);
    expect(parseWeight(String(MAX_WEIGHT + 1))).toBeNull();
  });
  it("rounds to one decimal and ignores surrounding spaces", () => {
    expect(parseWeight(" 47.55 ")).toBe(47.6);
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("1e3")).toBeNull();
  });
});

describe("muscle names", () => {
  it("only accepts the seven defined muscles", () => {
    expect(isMuscle("legs")).toBe(true);
    expect(isMuscle("glutes")).toBe(false);
    expect(isMuscle("Legs")).toBe(false);
  });
});

describe("personal bests", () => {
  it("tracks heaviest weight (more reps break ties), best volume and set count", () => {
    const sets = [
      s("chest", 40, 10, new Date(2026, 0, 1)),
      s("chest", 40, 12, new Date(2026, 0, 2)),
      s("chest", 30, 20, new Date(2026, 0, 3)),
    ];
    expect(personalBests(sets).chest).toMatchObject({ weight: 40, reps: 12, bestVolume: 600, totalSets: 3 });
  });
});

describe("weight and volume trend", () => {
  const sets = [
    s("legs", 100, 5, new Date(2026, 0, 2, 9)),
    s("legs", 120, 3, new Date(2026, 0, 2, 10)),
    s("back", 50, 10, new Date(2026, 0, 1, 9)),
  ];
  it("gives one point per day with heaviest weight and total volume, oldest first", () => {
    expect(dailyTrend(sets, "legs")).toEqual([{ day: "2026-01-02", maxWeight: 120, volume: 860, sets: 2 }]);
    expect(dailyTrend(sets, "all").map((p) => p.day)).toEqual(["2026-01-01", "2026-01-02"]);
  });
});

describe("weekly split", () => {
  it("always lists all seven muscles and ignores sets older than last week", () => {
    const now = new Date(2026, 0, 14, 12);
    const split = weeklySplit([s("abs", 10, 10, new Date(2025, 11, 20))], now);
    expect(split).toHaveLength(7);
    expect(split.every((p) => p.thisWeek === 0 && p.lastWeek === 0)).toBe(true);
  });
});

describe("summary", () => {
  const now = new Date(2026, 0, 14, 8);
  const sets = [
    s("biceps", 20, 10, new Date(2026, 0, 13, 9)),
    s("biceps", 25, 8, new Date(2026, 0, 12, 9)),
    s("biceps", 25, 8, new Date(2026, 0, 12, 10)),
  ];
  it("totals sets, reps, volume and training days", () => {
    expect(summarize(sets, now)).toMatchObject({ totalSets: 3, totalReps: 26, totalVolume: 600, workoutDays: 2, thisWeekSets: 3 });
  });
  it("keeps the streak alive when today hasn't been trained yet", () => {
    expect(summarize(sets, now).currentStreak).toBe(2);
  });
  it("breaks the streak after a missed day", () => {
    expect(summarize(sets, new Date(2026, 0, 16)).currentStreak).toBe(0);
  });
});

describe("consistency grid", () => {
  it("shows 12 weeks of 7 days, with the heaviest day at the top level", () => {
    const now = new Date(2026, 0, 14, 12);
    const grid = activityGrid([s("legs", 100, 10, new Date(2026, 0, 13, 9)), s("abs", 10, 10, new Date(2026, 0, 12, 9))], 12, now);
    expect(grid).toHaveLength(12);
    expect(grid.every((c) => c.length === 7)).toBe(true);
    const cells = grid.flat();
    expect(cells.find((c) => c.day === "2026-01-13")?.level).toBe(4);
    expect(cells.find((c) => c.day === "2026-01-12")?.level).toBe(1);
    expect(cells.find((c) => c.day === "2026-01-15")?.future).toBe(true);
  });
});

describe("weight display", () => {
  it("abbreviates large totals", () => {
    expect(formatLbs(1250)).toBe("1,250");
    expect(formatLbs(12500)).toBe("12.5k");
    expect(formatLbs(125000)).toBe("125k");
    expect(formatLbs(47.5)).toBe("47.5");
  });
});
