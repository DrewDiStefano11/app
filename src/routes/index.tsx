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
import { buildAICoachContext } from "@/lib/fitcore-data";
import type { LayoutMode } from "@/components/app/layout-primitives";
import type { SectionId } from "@/lib/types";
import { requestWhoopSync } from "@/lib/whoop/browser";

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
  useEffect(() => {
    if (!hasHydrated || !state.onboardingComplete) return;
    let nextAttempt = 0;
    let pending: number | undefined;
    let disposed = false;
    let syncing = false;
    let liveOnly = false;
    let retryRequired = false;
    const foreground = () => !disposed && document.visibilityState === "visible" && navigator.onLine;
    const syncWhileOpen = async (retry: boolean) => {
      if (!foreground() || syncing) return;
      syncing = true;
      try {
        const response = await requestWhoopSync("automatic");
        if (!foreground()) return;
        if (response.ok) liveOnly = response.status === 200;
        const retryAfter = Number(response.headers.get("Retry-After"));
        nextAttempt = Date.now() + Math.max(120, retryAfter || 0) * 1000;
        retryRequired = response.status === 409 && !retry;
        if (retryRequired) {
          pending = window.setTimeout(() => void syncWhileOpen(true), 120_000);
        }
      } catch {
        nextAttempt = Date.now() + 120_000;
      } finally {
        syncing = false;
      }
    };
    const syncOnOpen = () => {
      window.clearTimeout(pending);
      if (!foreground() || syncing) return;
      const delay = nextAttempt - Date.now();
      if (delay <= 0) void syncWhileOpen(retryRequired);
      else if (liveOnly || retryRequired) {
        pending = window.setTimeout(() => void syncWhileOpen(retryRequired), delay);
      }
    };
    syncOnOpen();
    document.addEventListener("visibilitychange", syncOnOpen);
    window.addEventListener("online", syncOnOpen);
    window.addEventListener("pageshow", syncOnOpen);
    return () => {
      disposed = true;
      window.clearTimeout(pending);
      document.removeEventListener("visibilitychange", syncOnOpen);
      window.removeEventListener("online", syncOnOpen);
      window.removeEventListener("pageshow", syncOnOpen);
    };
  }, [hasHydrated, state.onboardingComplete]);
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

  const contextSummary = buildAICoachContext(view, displayedSection);

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

      <JarvisPanel section={displayedSection} contextSummary={contextSummary} />
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
