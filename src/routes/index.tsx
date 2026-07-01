import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { BottomNav } from "@/components/app/bottom-nav";
import { JarvisPanel, JarvisUndoSnackbar } from "@/components/app/jarvis/jarvis-panel";
import { HomeView } from "@/components/app/views/home";
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
      { title: "FitCore — AI Fitness Command Center for Training & Recovery" },
      {
        name: "description",
        content:
          "Plan workouts, log nutrition, monitor recovery and track progress in one AI-powered fitness dashboard.",
      },
      { property: "og:title", content: "FitCore — Personal Fitness Command Center" },
      {
        property: "og:description",
        content:
          "Plan workouts, log nutrition, monitor recovery and track progress with a personal AI coach.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FitCore",
          applicationCategory: "HealthApplication",
          applicationSubCategory: "FitnessApplication",
          operatingSystem: "Web, iOS, Android",
          description:
            "Personal AI fitness command center for training, nutrition, recovery and progress tracking.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: () => (
    <StoreProvider>
      <FitCoreApp />
    </StoreProvider>
  ),
});

function FitCoreApp() {
  const { state, view } = useStore();
  const [section, setSection] = useState<SectionId>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasActiveWorkout = !!state.activeWorkout;

  // Lock app to Training while a workout is active — protects against losing progress
  // on refresh/nav. User can still discard via the active workout screen.
  useEffect(() => {
    if (hasActiveWorkout) {
      if (section !== "training") setSection("training");
      if (settingsOpen) setSettingsOpen(false);
    }
  }, [hasActiveWorkout, section, settingsOpen]);

  // Warn on accidental tab close/refresh while a workout is in progress.
  useEffect(() => {
    if (!hasActiveWorkout) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasActiveWorkout]);

  if (!state.onboardingComplete) {
    return (
      <div className="phone-shell" data-section="home">
        <Onboarding />
      </div>
    );
  }

  const contextSummary = buildContext(view, section);

  return (
    <div className="phone-shell" data-section={section} key={section}>
      <div className="animate-tile-in">
        {settingsOpen ? (
          <SettingsView onBack={() => setSettingsOpen(false)} />
        ) : (
          <>
            {section === "home" && (
              <HomeView
                onNavigate={(s) => setSection(s)}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            )}
            {section === "training" && <TrainingView />}
            {section === "nutrition" && <NutritionView />}
            {section === "recovery" && <RecoveryView />}
            {section === "progress" && <ProgressView />}
          </>
        )}
      </div>

      <JarvisPanel section={section} contextSummary={contextSummary} />
      <JarvisUndoSnackbar />
      {!hasActiveWorkout && (
        <BottomNav
          active={section}
          onChange={(s) => {
            setSection(s);
            setSettingsOpen(false);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
    </div>
  );
}

function buildContext(state: ReturnType<typeof useStore>["state"], section: SectionId): string {
  const lines: string[] = [];
  lines.push(`Section: ${section}`);
  lines.push(
    `Goal: ${state.profile.goal}, ${state.profile.experience}, ${state.profile.daysPerWeek}d/wk, ${state.profile.split}`,
  );
  lines.push(
    `Bodyweight: ${state.profile.bodyweightLb}lb (target ${state.profile.targetBodyweightLb}lb)`,
  );
  lines.push(
    `Macros: ${state.nutritionTargets.calories} kcal / P${state.nutritionTargets.protein} C${state.nutritionTargets.carbs} F${state.nutritionTargets.fat}`,
  );
  lines.push(
    `Workouts last 7d: ${state.workouts.filter((w) => w.startedAt > Date.now() - 7 * 86400000).length}`,
  );
  lines.push(
    `Meals today: ${state.mealEntries.filter((m) => m.createdAt > Date.now() - 86400000).length}`,
  );
  if (state.recoveryCheckIns.length) {
    const c = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
    lines.push(`Last check-in: energy ${c.energy}, soreness ${c.soreness}, stress ${c.stress}`);
  }
  if (state.prs.length) lines.push(`Tracked PRs: ${state.prs.length}`);
  return lines.join("\n");
}
