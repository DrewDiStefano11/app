import { useMemo } from "react";
import { Activity } from "lucide-react";
import { PremiumCard, SectionHeader } from "@/components/app/premium-ui";
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
    <section className="recent-activity-section px-5 mt-4" aria-labelledby="recent-activity-title">
      <SectionHeader
        eyebrow="Timeline"
        title="Recent activity"
        action={<Activity size={16} className="text-white/40" aria-hidden="true" />}
      />
      <div id="recent-activity-title" className="sr-only">
        Recent activity
      </div>
      <PremiumCard className={activity.length === 0 ? "recent-activity-card--empty" : undefined}>
        {activity.length === 0 ? (
          <p className="text-xs leading-5 text-white/40">
            Your saved workouts, meals, weigh-ins, and check-ins will appear here.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-white/5">
            {activity.map((log) => (
              <div key={`${log.type}:${log.id}`} className="py-2 flex items-center gap-3">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--section)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white/80 truncate">{labels[log.type]}</p>
                  <p className="text-[10px] text-white/40 truncate">
                    {log.subtype || log.notes || "Saved to FitCore"}
                  </p>
                </div>
                <time className="text-[9px] text-white/30 shrink-0">
                  {new Date(log.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </PremiumCard>
    </section>
  );
}
