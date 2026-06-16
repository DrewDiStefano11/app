import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { PrimaryButton, GhostButton, Input, Label, Select } from "@/components/app/ui";
import { Dumbbell } from "lucide-react";

const STEPS = ["welcome", "goal", "experience", "split", "weight", "macros", "done"] as const;

export function Onboarding() {
  const { state, set } = useStore();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(state.profile);
  const [targets, setTargets] = useState(state.nutritionTargets);

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));
  const finish = () => set(s => ({ ...s, profile, nutritionTargets: targets, onboardingComplete: true }));

  const current = STEPS[step];

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 py-10">
      <div className="flex gap-1 mb-8">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? "var(--section)" : "var(--surface-2)" }} />
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {current === "welcome" && (
          <div className="text-center my-auto">
            <div className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-6" style={{ background: "var(--section)" }}>
              <Dumbbell size={36} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">FitCore</h1>
            <p className="text-muted-foreground mt-3 max-w-sm mx-auto">Your personal command center for training, nutrition, recovery and progress.</p>
          </div>
        )}

        {current === "goal" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">What's your main goal?</h2>
            <Select value={profile.goal} onChange={e => setProfile(p => ({ ...p, goal: e.target.value as Profile["goal"] }))}>
              <option value="hypertrophy">Build muscle (hypertrophy)</option>
              <option value="strength">Get stronger</option>
              <option value="lean_bulk">Lean bulk</option>
              <option value="cut">Cut / lose fat</option>
              <option value="maintenance">Maintain</option>
            </Select>
          </div>
        )}

        {current === "experience" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Training experience?</h2>
            <Select value={profile.experience} onChange={e => setProfile(p => ({ ...p, experience: e.target.value as Profile["experience"] }))}>
              <option value="beginner">Beginner (under 1 year)</option>
              <option value="intermediate">Intermediate (1–3 years)</option>
              <option value="advanced">Advanced (3+ years)</option>
            </Select>
          </div>
        )}

        {current === "split" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Training schedule</h2>
            <div><Label>Days per week</Label><Input type="number" min={1} max={7} value={profile.daysPerWeek} onChange={e => setProfile(p => ({ ...p, daysPerWeek: Number(e.target.value) || 0 }))} /></div>
            <div><Label>Preferred split</Label>
              <Select value={profile.split} onChange={e => setProfile(p => ({ ...p, split: e.target.value }))}>
                <option>Push / Pull / Legs</option><option>Upper / Lower</option><option>Full Body</option><option>Bro Split</option>
              </Select>
            </div>
          </div>
        )}

        {current === "weight" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your bodyweight</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Current (lb)</Label><Input inputMode="decimal" value={profile.bodyweightLb} onChange={e => setProfile(p => ({ ...p, bodyweightLb: Number(e.target.value) || 0 }))} /></div>
              <div><Label>Target (lb)</Label><Input inputMode="decimal" value={profile.targetBodyweightLb} onChange={e => setProfile(p => ({ ...p, targetBodyweightLb: Number(e.target.value) || 0 }))} /></div>
            </div>
          </div>
        )}

        {current === "macros" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Macro targets</h2>
            <p className="text-sm text-muted-foreground">Defaults work for most lifters. Edit anytime.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Calories</Label><Input inputMode="numeric" value={targets.calories} onChange={e => setTargets(t => ({ ...t, calories: +e.target.value || 0 }))} /></div>
              <div><Label>Protein (g)</Label><Input inputMode="numeric" value={targets.protein} onChange={e => setTargets(t => ({ ...t, protein: +e.target.value || 0 }))} /></div>
              <div><Label>Carbs (g)</Label><Input inputMode="numeric" value={targets.carbs} onChange={e => setTargets(t => ({ ...t, carbs: +e.target.value || 0 }))} /></div>
              <div><Label>Fat (g)</Label><Input inputMode="numeric" value={targets.fat} onChange={e => setTargets(t => ({ ...t, fat: +e.target.value || 0 }))} /></div>
            </div>
          </div>
        )}

        {current === "done" && (
          <div className="text-center my-auto">
            <h2 className="text-3xl font-bold">You're all set</h2>
            <p className="text-muted-foreground mt-3">Open the app, start a workout, log a meal, and your floating AI coach is one tap away.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-8">
        {step > 0 && step < STEPS.length - 1 && <GhostButton onClick={back}>Back</GhostButton>}
        {current !== "done" ? (
          <PrimaryButton className="flex-1" onClick={next}>{current === "welcome" ? "Get started" : "Continue"}</PrimaryButton>
        ) : (
          <PrimaryButton className="flex-1" onClick={finish}>Enter FitCore</PrimaryButton>
        )}
      </div>
    </div>
  );
}
