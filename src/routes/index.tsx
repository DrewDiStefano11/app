import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { BottomNav } from "@/components/app/bottom-nav";
import { FloatingAi } from "@/components/app/floating-ai";
import { TrainingView } from "@/components/app/views/training";
import { NutritionView } from "@/components/app/views/nutrition";
import { RecoveryView } from "@/components/app/views/recovery";
import { ProgressView } from "@/components/app/views/progress";
import { SettingsView } from "@/components/app/views/settings";
import { Onboarding } from "@/components/app/views/onboarding";
import type { SectionId } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitCore — Personal Fitness Command Center" },
      { name: "description", content: "Track workouts, nutrition, recovery and progress with an AI coach." },
    ],
  }),
  component: () => (
    <StoreProvider>
      <FitCoreApp />
    </StoreProvider>
  ),
});

function FitCoreApp() {
  const { state } = useStore();
  const [section, setSection] = useState<SectionId>("training");
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!state.onboardingComplete) {
    return (
      <div className="phone-shell" data-section={section}>
        <Onboarding />
      </div>
    );
  }

  const contextSummary = buildContext(state, section);

  return (
    <div className="phone-shell" data-section={section}>
      {settingsOpen ? (
        <SettingsView onBack={() => setSettingsOpen(false)} />
      ) : (
        <>
          {section === "training" && <TrainingView />}
          {section === "nutrition" && <NutritionView />}
          {section === "recovery" && <RecoveryView />}
          {section === "progress" && <ProgressView />}
        </>
      )}

      <FloatingAi section={section} contextSummary={contextSummary} />
      <BottomNav active={section} onChange={(s) => { setSection(s); setSettingsOpen(false); }} onOpenSettings={() => setSettingsOpen(true)} />
    </div>
  );
}

function buildContext(state: ReturnType<typeof useStore>["state"], section: SectionId): string {
  const lines: string[] = [];
  lines.push(`Section: ${section}`);
  lines.push(`Goal: ${state.profile.goal}, ${state.profile.experience}, ${state.profile.daysPerWeek}d/wk, ${state.profile.split}`);
  lines.push(`Bodyweight: ${state.profile.bodyweightLb}lb (target ${state.profile.targetBodyweightLb}lb)`);
  lines.push(`Macros: ${state.nutritionTargets.calories} kcal / P${state.nutritionTargets.protein} C${state.nutritionTargets.carbs} F${state.nutritionTargets.fat}`);
  lines.push(`Workouts last 7d: ${state.workouts.filter(w => w.startedAt > Date.now() - 7*86400000).length}`);
  lines.push(`Meals today: ${state.mealEntries.filter(m => m.createdAt > Date.now() - 86400000).length}`);
  if (state.recoveryCheckIns.length) {
    const c = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
    lines.push(`Last check-in: energy ${c.energy}, soreness ${c.soreness}, stress ${c.stress}`);
  }
  if (state.prs.length) lines.push(`Tracked PRs: ${state.prs.length}`);
  return lines.join("\n");
}
