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
export const MAX_REPS = 1000;

export interface WorkoutSet {
  id?: string;
  muscle: Muscle;
  /** Total weight lifted in lbs (not per side). */
  weight: number;
  reps: number;
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

export const setVolume = (s: Pick<WorkoutSet, "weight" | "reps">) => s.weight * s.reps;

export const dayKey = (d: Date | string) => format(typeof d === "string" ? parseISO(d) : d, "yyyy-MM-dd");

const byTime = (a: WorkoutSet, b: WorkoutSet) => a.performed_at.localeCompare(b.performed_at);

export interface PersonalBest {
  weight: number;
  reps: number;
  weightDate: string;
  bestVolume: number;
  volumeDate: string;
  totalSets: number;
}

export function personalBests(sets: WorkoutSet[]): Record<Muscle, PersonalBest | null> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, null])) as Record<Muscle, PersonalBest | null>;
  for (const s of [...sets].sort(byTime)) {
    const cur = out[s.muscle];
    const vol = setVolume(s);
    if (!cur) {
      out[s.muscle] = {
        weight: s.weight,
        reps: s.reps,
        weightDate: s.performed_at,
        bestVolume: vol,
        volumeDate: s.performed_at,
        totalSets: 1,
      };
      continue;
    }
    cur.totalSets += 1;
    if (s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
      cur.weight = s.weight;
      cur.reps = s.reps;
      cur.weightDate = s.performed_at;
    }
    if (vol > cur.bestVolume) {
      cur.bestVolume = vol;
      cur.volumeDate = s.performed_at;
    }
  }
  return out;
}

export interface Milestone {
  muscle: Muscle;
  weight: number;
  reps: number;
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
      out.push({ muscle: s.muscle, weight: s.weight, reps: s.reps, date: s.performed_at, previous: prev ?? null });
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
  volume: number;
  sets: number;
}

export function dailyTrend(sets: WorkoutSet[], muscle: Muscle | "all"): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const s of sets) {
    if (muscle !== "all" && s.muscle !== muscle) continue;
    const k = dayKey(s.performed_at);
    const p = map.get(k) ?? { day: k, maxWeight: 0, volume: 0, sets: 0 };
    p.maxWeight = Math.max(p.maxWeight, s.weight);
    p.volume += setVolume(s);
    p.sets += 1;
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
    if (t >= thisStart && t < nextStart) counts[s.muscle].thisWeek += 1;
    else if (t >= lastStart && t < thisStart) counts[s.muscle].lastWeek += 1;
  }
  return MUSCLES.map((m) => ({ muscle: m, label: MUSCLE_LABEL[m], ...counts[m] }));
}

export interface Summary {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
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
    totalSets: sets.length,
    totalReps: sets.reduce((a, s) => a + s.reps, 0),
    totalVolume: sets.reduce((a, s) => a + setVolume(s), 0),
    workoutDays: days.size,
    currentStreak: streak,
    thisWeekSets: sets.filter((s) => parseISO(s.performed_at) >= weekStart).length,
  };
}

/** Training-day heatmap cells for the last `weeks` weeks (Mon-start columns). */
export function activityGrid(sets: WorkoutSet[], weeks = 12, now: Date = new Date()) {
  const vol = new Map<string, number>();
  for (const s of sets) {
    const k = dayKey(s.performed_at);
    vol.set(k, (vol.get(k) ?? 0) + setVolume(s));
  }
  const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), weeks - 1);
  const max = Math.max(1, ...vol.values());
  const cols: { day: string; volume: number; level: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const k = dayKey(date);
      const v = vol.get(k) ?? 0;
      col.push({
        day: k,
        volume: v,
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
