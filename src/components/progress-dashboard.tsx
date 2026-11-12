import { useMemo, useState, type ReactNode } from "react";
import { format, parseISO, subWeeks } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Trophy, TrendingUp } from "lucide-react";
import {
  MUSCLES,
  MUSCLE_LABEL,
  activityGrid,
  dailyTrend,
  formatLbs,
  muscleColor,
  personalBests,
  prMilestones,
  summarize,
  weeklySplit,
  type Muscle,
  type WorkoutSet,
} from "@/lib/workout";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "4w", label: "4W", weeks: 4 },
  { key: "12w", label: "12W", weeks: 12 },
  { key: "all", label: "All", weeks: null },
] as const;

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

export function Panel({ title, subtitle, children, className }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="mb-4">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-wide">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display text-3xl font-black tabular-nums", accent && "text-primary")}>{value}</div>
    </div>
  );
}

export function ProgressDashboard({ sets }: { sets: WorkoutSet[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("12w");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");

  const summary = useMemo(() => summarize(sets), [sets]);
  const filtered = useMemo(() => {
    const r = RANGES.find((x) => x.key === range);
    if (!r?.weeks) return sets;
    const cutoff = subWeeks(new Date(), r.weeks).toISOString();
    return sets.filter((s) => s.performed_at >= cutoff);
  }, [sets, range]);
  const trend = useMemo(
    () => dailyTrend(filtered, muscle).map((p) => ({ ...p, label: format(parseISO(p.day), "MMM d") })),
    [filtered, muscle],
  );
  const split = useMemo(() => weeklySplit(sets), [sets]);
  const bests = useMemo(() => personalBests(sets), [sets]);
  const milestones = useMemo(() => prMilestones(sets).slice(-8).reverse(), [sets]);
  const grid = useMemo(() => activityGrid(sets, 12), [sets]);
  const trendColor = muscle === "all" ? "var(--primary)" : muscleColor(muscle);

  if (sets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-display text-2xl font-extrabold uppercase">No sets yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Charts appear here once workouts are logged.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total volume" value={`${formatLbs(summary.totalVolume)} lb`} accent />
        <StatTile label="Sets logged" value={summary.totalSets.toLocaleString("en-US")} />
        <StatTile label="This week" value={`${summary.thisWeekSets} sets`} />
        <StatTile label="Day streak" value={`${summary.currentStreak}`} />
      </div>

      <Panel title="Weight & volume trend" subtitle="Bars show daily volume (weight × reps). Line shows your heaviest set.">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...MUSCLES] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscle(m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  muscle === m ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {m !== "all" ? <span className="h-2 w-2 rounded-full" style={{ background: muscleColor(m) }} /> : null}
                {m === "all" ? "All" : MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="flex rounded-full bg-secondary p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {trend.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No sets for this muscle in this range.</p>
        ) : (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendColor} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={trendColor} stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis yAxisId="vol" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatLbs(v)} />
                <YAxis yAxisId="wt" orientation="right" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  formatter={(value: number, name: string) => [`${formatLbs(value)} lb`, name]}
                />
                <Bar yAxisId="vol" dataKey="volume" name="Volume" fill="url(#volGrad)" stroke={trendColor} strokeOpacity={0.6} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Line yAxisId="wt" type="monotone" dataKey="maxWeight" name="Top weight" stroke="var(--foreground)" strokeWidth={2.5} dot={{ r: 3, fill: trendColor, stroke: "var(--foreground)" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Weekly muscle split" subtitle="Sets per muscle — this week vs last week.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={split} outerRadius="72%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="label" tick={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis tick={false} axisLine={false} allowDecimals={false} />
                <Radar name="Last week" dataKey="lastWeek" stroke="var(--muted-foreground)" strokeDasharray="4 4" fill="var(--muted-foreground)" fillOpacity={0.08} />
                <Radar name="This week" dataKey="thisWeek" stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.3} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Consistency" subtitle="Training days over the last 12 weeks.">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {grid.map((col, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                {col.map((c) => (
                  <div
                    key={c.day}
                    title={c.volume ? `${format(parseISO(c.day), "EEE MMM d")}: ${formatLbs(c.volume)} lb` : format(parseISO(c.day), "EEE MMM d")}
                    className={cn("h-5 w-5 rounded-[5px] sm:h-6 sm:w-6", c.future ? "opacity-0" : c.level === 0 ? "bg-secondary" : "bg-primary")}
                    style={c.level > 0 ? { opacity: 0.25 + c.level * 0.1875 } : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-secondary p-3">
              <div className="text-xs text-muted-foreground">Training days</div>
              <div className="font-display text-2xl font-black">{summary.workoutDays}</div>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-primary" /> Current streak
              </div>
              <div className="font-display text-2xl font-black">{summary.currentStreak} days</div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Personal bests" subtitle="Heaviest total weight per muscle.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {MUSCLES.map((m) => {
            const b = bests[m];
            return (
              <div key={m} className="relative overflow-hidden rounded-xl border border-border bg-surface p-3">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: muscleColor(m) }} />
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{MUSCLE_LABEL[m]}</div>
                {b ? (
                  <>
                    <div className="mt-1 font-display text-3xl font-black tabular-nums">
                      {formatLbs(b.weight)}
                      <span className="ml-1 text-sm font-semibold text-muted-foreground">lb</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      × {b.reps} · {format(parseISO(b.weightDate), "MMM d")}
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">—</div>
                )}
              </div>
            );
          })}
        </div>

        {milestones.length > 0 ? (
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">PR milestones</h3>
            <ol className="relative space-y-3 border-l border-border pl-5">
              {milestones.map((m, i) => (
                <li key={`${m.muscle}-${m.date}-${i}`} className="relative">
                  <span className="absolute -left-[27px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-background">
                    <Trophy className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold" style={{ color: muscleColor(m.muscle) }}>
                      {MUSCLE_LABEL[m.muscle]}
                    </span>
                    <span className="font-display text-lg font-black">{formatLbs(m.weight)} lb</span>
                    <span className="text-sm text-muted-foreground">× {m.reps}</span>
                    {m.previous !== null ? (
                      <span className="text-xs font-semibold text-primary">+{formatLbs(m.weight - m.previous)} lb</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">first lift</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{format(parseISO(m.date), "EEE, MMM d yyyy")}</div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
