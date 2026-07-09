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
  const { state, view } = useStore();
  const [section, setSection] = useState<SectionId>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("daily");

  const hasActiveWorkout = !!state.activeWorkout;

  useEffect(() => {
    if (hasActiveWorkout) {
      if (section !== "training") setSection("training");
      if (settingsOpen) setSettingsOpen(false);
    }
  }, [hasActiveWorkout, section, settingsOpen]);

  useEffect(() => {
    if (!hasActiveWorkout) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
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

  const contextSummary = buildAICoachContext(view, section);

  return (
    <div className="phone-shell" data-section={section} key={section}>
      <div className="animate-tile-in">
        {settingsOpen ? (
          <SettingsView onBack={() => setSettingsOpen(false)} layoutMode={layoutMode} />
        ) : (
          <>
            {section === "home" && (
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
            {section === "training" && <TrainingView layoutMode={layoutMode} />}
            {section === "nutrition" && <NutritionView layoutMode={layoutMode} />}
            {section === "recovery" && <RecoveryView layoutMode={layoutMode} />}
            {section === "progress" && <ProgressView layoutMode={layoutMode} />}
          </>
        )}
      </div>

      <JarvisPanel section={section} contextSummary={contextSummary} />
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
