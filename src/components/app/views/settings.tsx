import { useState } from "react";
import { Download, Upload, Trash2, Bell, User, BrainCircuit, Database, Info, TestTube2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { Card, PageHeader, GhostButton, Input, Label, Select, SectionHeader } from "@/components/app/ui";
import { ConfirmDialog } from "@/components/app/sheet";
import { JarvisSettingsCard } from "@/components/app/jarvis/settings-card";
import { JarvisActivityCard } from "@/components/app/jarvis/activity-view";
import { GoalsProfileCard } from "@/components/app/jarvis/goals-profile-card";

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { state, set, reset, exportJson, importJson } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const updateProfile = (p: Partial<Profile>) => set(s => ({ ...s, profile: { ...s.profile, ...p } }));

  const downloadBackup = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fitcore-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (f: File | null) => {
    if (!f) return;
    f.text().then(t => {
      const ok = importJson(t);
      setImportMsg(ok ? "Imported successfully \u2713" : "Invalid backup file");
      setTimeout(() => setImportMsg(""), 3000);
    });
  };

  return (
    <div className="pb-24">
      <PageHeader title="Hub" subtitle="Profile, targets, data" action={<button onClick={onBack} className="text-sm text-muted-foreground">Done</button>} />

      <div className="px-5 space-y-6">
        <Card className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Control center</p>
              <h2 className="mt-1 text-xl font-semibold">Profile, targets, AI, and local data</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Tune FitCore to your training setup, review Jarvis settings, and manage backups from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border px-3 py-1">Local data</span>
              <span className="rounded-full border border-border px-3 py-1">{state.profile.units}</span>
            </div>
          </div>
        </Card>

        <section>
          <SectionHeader title="Profile" />
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <User size={18} className="mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Profile</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Adjust your experience level, split, and preferred units.
                </p>
              </div>
            </div>

            <div><Label>Goal</Label>
              <Select value={state.profile.goal} onChange={e => updateProfile({ goal: e.target.value as Profile["goal"] })}>
                <option value="strength">Strength</option><option value="hypertrophy">Hypertrophy</option>
                <option value="lean_bulk">Lean Bulk</option><option value="cut">Cut</option><option value="maintenance">Maintenance</option>
              </Select>
            </div>
            <div><Label>Experience</Label>
              <Select value={state.profile.experience} onChange={e => updateProfile({ experience: e.target.value as Profile["experience"] })}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label>Days/week</Label><Input type="number" value={state.profile.daysPerWeek} onChange={e => updateProfile({ daysPerWeek: Number(e.target.value) || 0 })} /></div>
              <div><Label>Split</Label><Input value={state.profile.split} onChange={e => updateProfile({ split: e.target.value })} /></div>
            </div>
            <div><Label>Units</Label>
              <Select value={state.profile.units} onChange={e => updateProfile({ units: e.target.value as "lb" | "kg" })}>
                <option value="lb">lb</option><option value="kg">kg</option>
              </Select>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="Health Profile" />
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <User size={18} className="mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Health Profile</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Keep bodyweight targets aligned with your current training phase.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label>Bodyweight (lb)</Label><Input inputMode="decimal" value={state.profile.bodyweightLb} onChange={e => updateProfile({ bodyweightLb: Number(e.target.value)||0 })} /></div>
              <div><Label>Target (lb)</Label><Input inputMode="decimal" value={state.profile.targetBodyweightLb} onChange={e => updateProfile({ targetBodyweightLb: Number(e.target.value)||0 })} /></div>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="App Preferences" />
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <Bell size={18} className="mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Reminders</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Reminders use local browser notifications. The app functions normally without them.
                </p>
              </div>
            </div>

            {(["workout","weighIn","lunch"] as const).map(k => (
              <label key={k} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm capitalize leading-snug">{k === "weighIn" ? "Weigh-in 9 PM" : k === "workout" ? "Workout 5 PM" : "Lunch log 12 PM"}</span>
                <input type="checkbox" checked={state.reminders[k]} onChange={e => set(s => ({ ...s, reminders: { ...s.reminders, [k]: e.target.checked } }))}
                  className="h-5 w-5 shrink-0 accent-[var(--section)]" aria-label={`Toggle ${k} reminder`} />
              </label>
            ))}

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-start gap-3">
                <TestTube2 size={18} className="mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Demo data</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Fills charts with sample data. Your real data remains untouched.
                  </p>
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Show demo data</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">Fills charts with sample data. Your real data remains untouched.</p>
                </div>
                <input type="checkbox" checked={state.demoMode}
                  onChange={e => set(s => ({ ...s, demoMode: e.target.checked }))}
                  className="h-5 w-5 shrink-0 accent-[var(--section)]" />
              </label>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="AI Coach & Goals" />
          <div className="mb-3 flex items-start gap-3 px-1">
            <BrainCircuit size={18} className="mt-0.5 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Manage your AI permissions, memory, and training targets. Disabled or informational items remain unchanged.
            </p>
          </div>
          <div className="space-y-4">
            <JarvisSettingsCard />
            <GoalsProfileCard />
            <JarvisActivityCard />
          </div>
        </section>

        <section>
          <SectionHeader title="Data Management" />
          <Card className="space-y-4 border-destructive/30">
            <div className="flex items-start gap-3">
              <Database size={18} className="mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Data Management</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your data is stored locally. Use backups to secure your progress.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <GhostButton className="w-full justify-center" onClick={downloadBackup}><Download size={16} />Export</GhostButton>
              <label className="block">
                <GhostButton className="w-full justify-center pointer-events-none"><Upload size={16} />Import</GhostButton>
                <input type="file" accept="application/json" className="hidden" onChange={e => handleImport(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {importMsg && <p className="text-xs text-center" style={{ color: "var(--section)" }}>{importMsg}</p>}
            <div className="border-t border-destructive/30 pt-4">
              <button onClick={() => setConfirmReset(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-small)] border border-destructive px-4 py-2.5 font-medium text-destructive transition-colors hover:bg-destructive/10"><Trash2 size={16} />Reset all data</button>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="About" />
          <Card>
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm">FitCore v1 &mdash; your personal fitness command center.</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">AI coach: Lovable AI (Gemini). <span className="font-medium text-foreground">Data stays on this device.</span> No accounts, no tracking.</p>
              </div>
            </div>
          </Card>
        </section>
      </div>

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={reset}
        title="Reset all data?" message="This permanently erases workouts, meals, recovery, photos and PRs." confirmLabel="Reset" destructive />
    </div>
  );
}
