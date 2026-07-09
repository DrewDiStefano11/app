import { useState } from "react";
import { Download, Upload, Trash2, Bell, User, BrainCircuit, Database, Info, TestTube2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { Card, PageHeader, PrimaryButton, GhostButton, Input, Label, Select, SectionHeader } from "@/components/app/ui";
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
      setImportMsg(ok ? "Imported successfully ✓" : "Invalid backup file");
      setTimeout(() => setImportMsg(""), 3000);
    });
  };

  return (
    <div className="pb-6">
      <PageHeader title="Hub" subtitle="Profile, targets, data" action={<button onClick={onBack} className="text-sm text-muted-foreground">Done</button>} />

      <div className="px-5 space-y-6">
        <section>
          <SectionHeader title="Profile & Account" />
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Local Profile</p>
              <p className="text-xs text-muted-foreground mb-3">Your data stays on your device. No cloud account required.</p>
              <Label>Name</Label>
              <Input
                value={state.profile.name ?? ""}
                onChange={e => updateProfile({ name: e.target.value })}
                placeholder="e.g. ATHLETE"
              />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="Health Profile" />
          <Card className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Days/week</Label><Input type="number" value={state.profile.daysPerWeek} onChange={e => updateProfile({ daysPerWeek: Number(e.target.value) || 0 })} /></div>
              <div><Label>Split</Label><Input value={state.profile.split} onChange={e => updateProfile({ split: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bodyweight (lb)</Label><Input inputMode="decimal" value={state.profile.bodyweightLb} onChange={e => updateProfile({ bodyweightLb: Number(e.target.value)||0 })} /></div>
              <div><Label>Target (lb)</Label><Input inputMode="decimal" value={state.profile.targetBodyweightLb} onChange={e => updateProfile({ targetBodyweightLb: Number(e.target.value)||0 })} /></div>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader title="App Preferences" />
          <Card className="space-y-4">
            <div><Label>Units</Label>
              <Select value={state.profile.units} onChange={e => updateProfile({ units: e.target.value as "lb" | "kg" })}>
                <option value="lb">lb</option><option value="kg">kg</option>
              </Select>
            </div>
          </Card>

          <Card className="space-y-2">
            <div>
              <p className="text-sm font-medium">Reminders</p>
              <p className="text-xs text-muted-foreground mb-2">Reminders use local browser notifications.</p>
            </div>
            {(["workout","weighIn","lunch"] as const).map(k => (
              <label key={k} className="flex items-center justify-between py-1 border-t border-border/50 pt-2 mt-1">
                <span className="text-sm capitalize">{k === "weighIn" ? "Weigh-in 9 PM" : k === "workout" ? "Workout 5 PM" : "Lunch log 12 PM"}</span>
                <input type="checkbox" checked={state.reminders[k]} onChange={e => set(s => ({ ...s, reminders: { ...s.reminders, [k]: e.target.checked } }))}
                  className="w-5 h-5 accent-[var(--section)]" aria-label={`Toggle ${k} reminder`} />
              </label>
            ))}
          </Card>

          <Card className="space-y-2">
            <label className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">Show demo data</p>
                <p className="text-xs text-muted-foreground">Fills charts with sample data. Your real data remains untouched.</p>
              </div>
              <input type="checkbox" checked={state.demoMode}
                onChange={e => set(s => ({ ...s, demoMode: e.target.checked }))}
                className="w-5 h-5 accent-[var(--section)]" />
            </label>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader title="AI / Jarvis" />
          <JarvisSettingsCard />
          <GoalsProfileCard />
          <JarvisActivityCard />
        </section>

        <section>
          <SectionHeader title="Data Management" />
          <Card className="space-y-3">
            <p className="text-xs text-muted-foreground">Your data is stored locally. Use backups to secure your progress.</p>
            <div className="grid grid-cols-2 gap-2">
              <GhostButton className="justify-center" onClick={downloadBackup}><Download size={16} />Export</GhostButton>
              <label>
                <GhostButton className="w-full justify-center pointer-events-none"><Upload size={16} />Import</GhostButton>
                <input type="file" accept="application/json" className="hidden" onChange={e => handleImport(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {importMsg && <p className="text-xs text-center" style={{ color: "var(--section)" }}>{importMsg}</p>}
            <div className="h-px bg-border my-2" />
            <button onClick={() => setConfirmReset(true)} className="w-full px-4 py-2.5 rounded-xl border border-destructive text-destructive font-medium flex items-center justify-center gap-2"><Trash2 size={16} />Reset all data</button>
          </Card>
        </section>

        <section>
          <SectionHeader title="Support, About & Legal" />
          <Card>
            <p className="text-sm">FitCore v1 — your personal fitness command center.</p>
            <p className="text-xs text-muted-foreground mt-2">AI coach: Lovable AI (Gemini). <span className="font-medium text-foreground">Data stays on this device.</span> No accounts, no tracking.</p>
          </Card>
        </section>
      </div>

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={reset}
        title="Reset all data?" message="This permanently erases workouts, meals, recovery, photos and PRs." confirmLabel="Reset" destructive />
    </div>
  );
}
