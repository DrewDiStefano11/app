import { useMemo } from "react";
import { Activity } from "lucide-react";
import { Tile, Eyebrow } from "@/components/app/tile";
import { useStore } from "@/lib/store";
import { getRecentActivity, type FitCoreLog } from "@/lib/fitcore-data";

const labels: Record<FitCoreLog["type"], string> = {
  workout_session: "Workout completed",
  workout_exercise: "Exercise logged",
  workout_set: "Set logged",
  meal: "Meal logged",
  weigh_in: "Weigh-in saved",
  check_in: "Check-in completed",
  recovery_signal: "Recovery note detected",
  body_metric: "Body metric saved",
  ai_event: "AI activity saved",
  template: "Template saved",
};

export function RecentActivity() {
  const { view } = useStore();
  const activity = useMemo(() => getRecentActivity(view, 6), [view]);

  return (
    <div className="px-5 mt-3">
      <Tile>
        <div className="flex items-center justify-between">
          <Eyebrow color="var(--section)">Recent activity</Eyebrow>
          <Activity size={15} className="text-white/40" />
        </div>
        {activity.length === 0 ? (
          <p className="text-xs text-white/40 mt-3">Your saved workouts, meals, weigh-ins, and check-ins will appear here.</p>
        ) : (
          <div className="mt-2 divide-y divide-white/5">
            {activity.map(log => (
              <div key={`${log.type}:${log.id}`} className="py-2 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--section)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white/80 truncate">{labels[log.type]}</p>
                  <p className="text-[10px] text-white/40 truncate">{log.subtype || log.notes || "Saved to FitCore"}</p>
                </div>
                <time className="text-[9px] text-white/30 shrink-0">
                  {new Date(log.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </time>
              </div>
            ))}
          </div>
        )}
      </Tile>
    </div>
  );
}
