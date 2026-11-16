import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { BottomNav } from "@/components/app/bottom-nav";
import { JarvisPanel, JarvisUndoSnackbar } from "@/components/app/jarvis/jarvis-panel";
import { RecentActivity } from "@/components/app/recent-activity";
import { HomeView } from "@/components/app/views/home";
import { TrainingView } from "@/components/app/views/training";
import { NutritionView } from "@/components/app/views/nutrition";
import { RecoveryView } from "@/components/app/views/recovery";
import { ProgressView } from "@/components/app/views/progress";
import { SettingsView } from "@/components/app/views/settings";
import { Onboarding } from "@/components/app/views/onboarding";
import type { LayoutMode } from "@/components/app/layout-primitives";
import type { SectionId } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitCore — AI Fitness Command Center for Training & Recovery" },
      { name: "description", content: "Plan workouts, log nutrition, monitor recovery and track progress in one AI-powered fitness dashboard." },
      { property: "og:title", content: "FitCore — Personal Fitness Command Center" },
      { property: "og:description", content: "Plan workouts, log nutrition, monitor recovery and track progress with a personal AI coach." },
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
          description: "Personal AI fitness command center for training, nutrition, recovery and progress tracking.",
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
  const { state, hasHydrated, view, persistenceStatus, persistenceRequiresReload } = useStore();
  const [section, setSection] = useState<SectionId>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("daily");
  const [overviewWorkoutId, setOverviewWorkoutId] = useState<string | null>(null);

  const activeWorkoutId = state.activeWorkout?.id;
  const hasActiveWorkout = activeWorkoutId !== undefined;
  const showActiveWorkout = activeWorkoutId !== undefined && activeWorkoutId !== overviewWorkoutId;
  const displayedSection = hasActiveWorkout ? "training" : section;
  const persistenceProblem = persistenceRequiresReload
    ? "FitCore needs to reload the latest saved data before it can save changes."
    : persistenceStatus === "storage_error" || persistenceStatus === "blocked"
      ? "FitCore could not access device storage. Changes may be unsaved."
      : null;
  const storageMessage = persistenceProblem && (
    <p role="status" className="px-5 py-3 text-sm text-destructive">{persistenceProblem}</p>
  );

  useEffect(() => {
    if (hasActiveWorkout) {
      setSection("training");
      setSettingsOpen(false);
    }
  }, [hasActiveWorkout]);

  useEffect(() => {
    if (!hasActiveWorkout) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasActiveWorkout]);

  if (!hasHydrated) {
    return (
      <div className="phone-shell grid min-h-dvh place-items-center" aria-busy="true">
        <p role="status" className="text-muted-foreground">Loading FitCore…</p>
      </div>
    );
  }

  if (!state.onboardingComplete && !hasActiveWorkout) {
    return (
      <div className="phone-shell" data-section="home">
        {storageMessage}
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="phone-shell" data-section={displayedSection} key={displayedSection}>
      {storageMessage}
      <div className="animate-tile-in">
        {settingsOpen && !hasActiveWorkout ? (
          <SettingsView onBack={() => setSettingsOpen(false)} layoutMode={layoutMode} />
        ) : (
          <>
            {displayedSection === "home" && (
              <>
                <HomeView
                  onNavigate={(s) => setSection(s)}
                  onOpenSettings={() => setSettingsOpen(true)}
                  layoutMode={layoutMode}
                  onLayoutModeChange={setLayoutMode}
                />
                <RecentActivity />
              </>
            )}
            {displayedSection === "training" && (
              <TrainingView
                layoutMode={layoutMode}
                showActiveWorkout={showActiveWorkout}
                onOpenActive={() => setOverviewWorkoutId(null)}
                onBackFromWorkout={() => setOverviewWorkoutId(activeWorkoutId ?? null)}
              />
            )}
            {displayedSection === "nutrition" && <NutritionView layoutMode={layoutMode} />}
            {displayedSection === "recovery" && <RecoveryView layoutMode={layoutMode} />}
            {displayedSection === "progress" && <ProgressView layoutMode={layoutMode} />}
          </>
        )}
      </div>

      <JarvisPanel section={displayedSection} />
      <JarvisUndoSnackbar />
      {!hasActiveWorkout && (
        <BottomNav
          active={section}
          onChange={(s) => { setSection(s); setSettingsOpen(false); }}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
    </div>
  );
}
