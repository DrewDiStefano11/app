import type { AppState } from "./types";
import { EXERCISES, type MuscleGroup } from "./data";
import { workoutVolume, workoutsInRange, MUSCLES } from "./analytics";

const DAY = 86400000;
const EX_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

export type Bucket = "day" | "week" | "month";

/** Generic volume series for any range/bucket. */
export function volumeSeries(state: AppState, days: number, bucket: Bucket = "day"):
  { label: string; volume: number; ts: number }[] {
  const now = Date.now();
  if (bucket === "day") {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = now - (i + 1) * DAY;
      const end = now - i * DAY;
      const vol = state.workouts.filter(w => w.startedAt >= start && w.startedAt < end)
        .reduce((s, w) => s + workoutVolume(w), 0);
      const d = new Date(end);
      out.push({
        label: days <= 14
          ? d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1)
          : `${d.getMonth() + 1}/${d.getDate()}`,
        volume: Math.round(vol),
        ts: end,
      });
    }
    return out;
  }
  if (bucket === "week") {
    const weeks = Math.max(1, Math.ceil(days / 7));
    const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = now - (i + 1) * 7 * DAY;
      const end = now - i * 7 * DAY;
      const vol = state.workouts.filter(w => w.startedAt >= start && w.startedAt < end)
        .reduce((s, w) => s + workoutVolume(w), 0);
      out.push({ label: `W${weeks - i}`, volume: Math.round(vol), ts: end });
    }
    return out;
  }
  // month
  const months = Math.max(1, Math.ceil(days / 30));
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = now - (i + 1) * 30 * DAY;
    const end = now - i * 30 * DAY;
    const vol = state.workouts.filter(w => w.startedAt >= start && w.startedAt < end)
      .reduce((s, w) => s + workoutVolume(w), 0);
    const d = new Date(end);
    out.push({ label: d.toLocaleDateString(undefined, { month: "short" }), volume: Math.round(vol), ts: end });
  }
  return out;
}

export function volumeByMuscle(state: AppState, days: number): { name: MuscleGroup; volume: number }[] {
  const out = new Map<MuscleGroup, number>();
  for (const m of MUSCLES) out.set(m, 0);
  for (const w of workoutsInRange(state, days)) {
    for (const we of w.exercises) {
      const ex = EX_BY_ID.get(we.exerciseId);
      if (!ex) continue;
      const vol = we.sets.reduce((s, x) => s + (x.completed && x.weight && x.reps ? x.weight * x.reps : 0), 0);
      for (const m of ex.primary) out.set(m, (out.get(m) ?? 0) + vol);
      for (const m of ex.secondary ?? []) out.set(m, (out.get(m) ?? 0) + vol * 0.4);
    }
  }
  return [...out.entries()]
    .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
    .filter(d => d.volume > 0)
    .sort((a, b) => b.volume - a.volume);
}

export function volumeByExercise(state: AppState, days: number): { name: string; volume: number; sets: number }[] {
  const map = new Map<string, { vol: number; sets: number }>();
  for (const w of workoutsInRange(state, days)) {
    for (const we of w.exercises) {
      const ex = EX_BY_ID.get(we.exerciseId);
      if (!ex) continue;
      const vol = we.sets.reduce((s, x) => s + (x.completed && x.weight && x.reps ? x.weight * x.reps : 0), 0);
      const setsCount = we.sets.filter(s => s.completed).length;
      const e = map.get(ex.name) ?? { vol: 0, sets: 0 };
      e.vol += vol; e.sets += setsCount;
      map.set(ex.name, e);
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, volume: Math.round(v.vol), sets: v.sets }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 12);
}

const WEEKDAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function volumeByDayOfWeek(state: AppState, days: number): { label: string; volume: number; sets: number }[] {
  const bucket: Record<number, { vol: number; sets: number; count: number }> = {};
  for (let i = 0; i < 7; i++) bucket[i] = { vol: 0, sets: 0, count: 0 };
  for (const w of workoutsInRange(state, days)) {
    const dow = new Date(w.startedAt).getDay();
    const vol = workoutVolume(w);
    const sets = w.exercises.reduce((s, e) => s + e.sets.filter(x => x.completed).length, 0);
    bucket[dow].vol += vol;
    bucket[dow].sets += sets;
    bucket[dow].count++;
  }
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map(dow => ({
    label: WEEKDAY[dow],
    volume: Math.round(bucket[dow].vol),
    sets: bucket[dow].sets,
  }));
}

export function setsSeries(state: AppState, days: number): { label: string; sets: number; reps: number; ts: number }[] {
  const now = Date.now();
  const out: { label: string; sets: number; reps: number; ts: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = now - (i + 1) * DAY;
    const end = now - i * DAY;
    let sets = 0, reps = 0;
    for (const w of state.workouts) {
      if (w.startedAt < start || w.startedAt >= end) continue;
      for (const we of w.exercises) {
        for (const s of we.sets) {
          if (s.completed) {
            sets++;
            reps += s.reps ?? 0;
          }
        }
      }
    }
    const d = new Date(end);
    out.push({
      label: days <= 14
        ? d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1)
        : `${d.getMonth() + 1}/${d.getDate()}`,
      sets, reps, ts: end,
    });
  }
  return out;
}

export function muscleStats(state: AppState, muscle: string) {
  const now = Date.now();
  let setsWeek = 0, volWeek = 0, lastTrained = 0;
  for (const w of state.workouts) {
    for (const we of w.exercises) {
      const ex = EX_BY_ID.get(we.exerciseId);
      if (!ex || !(ex.primary as string[]).includes(muscle)) continue;
      if (w.startedAt > now - 7 * DAY) {
        setsWeek += we.sets.filter(s => s.completed).length;
        volWeek += we.sets.reduce((s, x) => s + (x.completed && x.weight && x.reps ? x.weight * x.reps : 0), 0);
      }
      if (w.startedAt > lastTrained) lastTrained = w.startedAt;
    }
  }
  // previous week comparison
  let volPrev = 0;
  for (const w of state.workouts) {
    if (w.startedAt > now - 7 * DAY || w.startedAt < now - 14 * DAY) continue;
    for (const we of w.exercises) {
      const ex = EX_BY_ID.get(we.exerciseId);
      if (!ex || !(ex.primary as string[]).includes(muscle)) continue;
      volPrev += we.sets.reduce((s, x) => s + (x.completed && x.weight && x.reps ? x.weight * x.reps : 0), 0);
    }
  }
  const deltaPct = volPrev > 0 ? Math.round(((volWeek - volPrev) / volPrev) * 100) : 0;
  const recommended = EXERCISES.filter(e => (e.primary as string[]).includes(muscle)).slice(0, 4).map(e => e.name);
  return {
    setsWeek,
    volWeek: Math.round(volWeek),
    lastTrained,
    deltaPct,
    recommended,
  };
}

export function daysAgo(ts: number): string {
  if (!ts) return "Never";
  const d = Math.floor((Date.now() - ts) / DAY);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function compareWindows(state: AppState, days: number): { current: number; previous: number; deltaPct: number } {
  const now = Date.now();
  const current = state.workouts
    .filter(w => w.startedAt > now - days * DAY)
    .reduce((s, w) => s + workoutVolume(w), 0);
  const previous = state.workouts
    .filter(w => w.startedAt <= now - days * DAY && w.startedAt > now - 2 * days * DAY)
    .reduce((s, w) => s + workoutVolume(w), 0);
  const deltaPct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
  return { current: Math.round(current), previous: Math.round(previous), deltaPct };
}
