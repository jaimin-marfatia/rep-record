import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, startOfWeek, subWeeks } from "date-fns";

export const MUSCLES = ["biceps", "triceps", "chest", "shoulder", "back", "abs", "legs"] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  biceps: "Biceps",
  triceps: "Triceps",
  chest: "Chest",
  shoulder: "Shoulder",
  back: "Back",
  abs: "Abs",
  legs: "Legs",
};

/** CSS color for a muscle (theme token). */
export const muscleColor = (m: Muscle) => `var(--m-${m})`;

/** Quick weight buttons: 10 lbs to 60 lbs in 5 lb steps. */
export const WEIGHT_PRESETS: number[] = Array.from({ length: 11 }, (_, i) => 10 + i * 5);
export const MAX_WEIGHT = 5000;
/** How many sets one save can record. */
export const MIN_SET_COUNT = 1;
export const MAX_SET_COUNT = 20;
export const DEFAULT_SET_COUNT = 3;

/** One saved log: a muscle, the total weight used, and how many sets were done at it. */
export interface WorkoutSet {
  id?: string;
  muscle: Muscle;
  /** Total weight lifted in lbs (not per side). */
  weight: number;
  /** Number of sets done in this log entry. */
  setCount: number;
  performed_at: string;
}

export function isMuscle(v: unknown): v is Muscle {
  return typeof v === "string" && (MUSCLES as readonly string[]).includes(v);
}

/** Parses a custom weight entry. Returns null if not a valid positive amount. */
export function parseWeight(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Math.round(Number(trimmed) * 10) / 10;
  if (!Number.isFinite(n) || n <= 0 || n > MAX_WEIGHT) return null;
  return n;
}

/** Keeps a set count a whole number between MIN_SET_COUNT and MAX_SET_COUNT. */
export function clampSetCount(n: number): number {
  if (!Number.isFinite(n)) return MIN_SET_COUNT;
  return Math.min(MAX_SET_COUNT, Math.max(MIN_SET_COUNT, Math.round(n)));
}

/** Total sets across log entries. */
export const countSets = (sets: Pick<WorkoutSet, "setCount">[]) => sets.reduce((a, s) => a + s.setCount, 0);

/**
 * Timestamp to save a set under. Today -> right now; a past day (yyyy-MM-dd)
 * -> noon local time that day. Future days are clamped to now.
 */
export function performedAtFor(day: string, now: Date = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= dayKey(now)) return now.toISOString();
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0).toISOString();
}

export const dayKey = (d: Date | string) => format(typeof d === "string" ? parseISO(d) : d, "yyyy-MM-dd");

const byTime = (a: WorkoutSet, b: WorkoutSet) => a.performed_at.localeCompare(b.performed_at);

export interface PersonalBest {
  weight: number;
  weightDate: string;
  totalSets: number;
}

export function personalBests(sets: WorkoutSet[]): Record<Muscle, PersonalBest | null> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, null])) as Record<Muscle, PersonalBest | null>;
  for (const s of [...sets].sort(byTime)) {
    const cur = out[s.muscle];
    if (!cur) {
      out[s.muscle] = { weight: s.weight, weightDate: s.performed_at, totalSets: s.setCount };
      continue;
    }
    cur.totalSets += s.setCount;
    if (s.weight > cur.weight) {
      cur.weight = s.weight;
      cur.weightDate = s.performed_at;
    }
  }
  return out;
}

export interface Milestone {
  muscle: Muscle;
  weight: number;
  date: string;
  previous: number | null;
}

/** Every time a muscle's heaviest weight goes up, that's a PR milestone. */
export function prMilestones(sets: WorkoutSet[]): Milestone[] {
  const best = new Map<Muscle, number>();
  const out: Milestone[] = [];
  for (const s of [...sets].sort(byTime)) {
    const prev = best.get(s.muscle);
    if (prev === undefined || s.weight > prev) {
      out.push({ muscle: s.muscle, weight: s.weight, date: s.performed_at, previous: prev ?? null });
      best.set(s.muscle, s.weight);
    }
  }
  return out;
}

/** True when this set beats every earlier set for the same muscle (and there was an earlier one). */
export function isNewPR(set: Pick<WorkoutSet, "muscle" | "weight">, earlier: WorkoutSet[]): boolean {
  const prior = earlier.filter((s) => s.muscle === set.muscle);
  if (prior.length === 0) return false;
  return set.weight > Math.max(...prior.map((s) => s.weight));
}

export interface TrendPoint {
  day: string;
  maxWeight: number;
  sets: number;
}

export function dailyTrend(sets: WorkoutSet[], muscle: Muscle | "all"): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const s of sets) {
    if (muscle !== "all" && s.muscle !== muscle) continue;
    const k = dayKey(s.performed_at);
    const p = map.get(k) ?? { day: k, maxWeight: 0, sets: 0 };
    p.maxWeight = Math.max(p.maxWeight, s.weight);
    p.sets += s.setCount;
    map.set(k, p);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export interface SplitPoint {
  muscle: Muscle;
  label: string;
  thisWeek: number;
  lastWeek: number;
}

/** Sets per muscle in the current week (Mon–Sun) vs. the previous week. */
export function weeklySplit(sets: WorkoutSet[], now: Date = new Date()): SplitPoint[] {
  const thisStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastStart = subWeeks(thisStart, 1);
  const nextStart = addDays(thisStart, 7);
  const counts = Object.fromEntries(MUSCLES.map((m) => [m, { thisWeek: 0, lastWeek: 0 }])) as Record<
    Muscle,
    { thisWeek: number; lastWeek: number }
  >;
  for (const s of sets) {
    const t = parseISO(s.performed_at);
    if (t >= thisStart && t < nextStart) counts[s.muscle].thisWeek += s.setCount;
    else if (t >= lastStart && t < thisStart) counts[s.muscle].lastWeek += s.setCount;
  }
  return MUSCLES.map((m) => ({ muscle: m, label: MUSCLE_LABEL[m], ...counts[m] }));
}

export interface Summary {
  totalSets: number;
  workoutDays: number;
  currentStreak: number;
  thisWeekSets: number;
}

export function summarize(sets: WorkoutSet[], now: Date = new Date()): Summary {
  const days = new Set(sets.map((s) => dayKey(s.performed_at)));
  // Streak: consecutive training days ending today (or yesterday, if not trained yet today).
  let streak = 0;
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return {
    totalSets: countSets(sets),
    workoutDays: days.size,
    currentStreak: streak,
    thisWeekSets: countSets(sets.filter((s) => parseISO(s.performed_at) >= weekStart)),
  };
}

/** Training-day heatmap cells for the last `weeks` weeks (Mon-start columns), shaded by sets done. */
export function activityGrid(sets: WorkoutSet[], weeks = 12, now: Date = new Date()) {
  const perDay = new Map<string, number>();
  for (const s of sets) {
    const k = dayKey(s.performed_at);
    perDay.set(k, (perDay.get(k) ?? 0) + s.setCount);
  }
  const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), weeks - 1);
  const max = Math.max(1, ...perDay.values());
  const cols: { day: string; sets: number; level: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const k = dayKey(date);
      const v = perDay.get(k) ?? 0;
      col.push({
        day: k,
        sets: v,
        level: v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)),
        future: differenceInCalendarDays(date, now) > 0,
      });
    }
    cols.push(col);
  }
  return cols;
}

export function formatLbs(n: number): string {
  if (n >= 100000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(1);
}

export const setsLabel = (n: number) => `${n} ${n === 1 ? "set" : "sets"}`;
