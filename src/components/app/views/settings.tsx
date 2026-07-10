import { useState, type ReactNode } from "react";
import {
  Bell,
  BrainCircuit,
  ChevronDown,
  Database,
  Download,
  Info,
  TestTube2,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { Card, GhostButton, Input, Label, PageHeader, Select, SubTabs } from "@/components/app/ui";
import { ConfirmDialog } from "@/components/app/sheet";
import { JarvisSettingsCard } from "@/components/app/jarvis/settings-card";
import { JarvisActivityCard } from "@/components/app/jarvis/activity-view";
import { GoalsProfileCard } from "@/components/app/jarvis/goals-profile-card";

type SettingsSectionId = "profile" | "preferences" | "data" | "integrations";

type SettingsSubtab = "profile" | "preferences" | "data" | "integrations";
const SETTINGS_TABS: { id: SettingsSubtab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "data", label: "Data" },
  { id: "integrations", label: "Integrations" },
];

type HubCardProps = {
  id: SettingsSectionId;
  title: string;
  description: string;
  status?: string;
  icon?: ReactNode;
  expanded: boolean;
  onToggle: (id: SettingsSectionId) => void;
  children: ReactNode;
};

function StatusChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "active" | "planned" | "danger";
}) {
  const toneClass =
    tone === "active"
      ? "border-[var(--section)]/40 bg-[var(--section-soft)] text-foreground"
      : tone === "danger"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : tone === "planned"
          ? "border-border bg-[var(--surface-2)] text-muted-foreground"
          : "border-border bg-white/[0.04] text-muted-foreground";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${toneClass}`}
    >
      {children}
    </span>
  );
}

function HubCard({
  id,
  title,
  description,
  status,
  icon,
  expanded,
  onToggle,
  children,
}: HubCardProps) {
  const isActive = status === "Active";
  const isDestructive = status === "Destructive";
  const cardTone = isActive
    ? "border-[var(--section)]/35 bg-[linear-gradient(180deg,var(--section-soft),transparent_54%)]"
    : isDestructive
      ? "border-destructive/35 bg-[linear-gradient(180deg,rgba(239,68,68,0.08),transparent_54%)]"
      : "bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_58%)]";

  return (
    <Card className={`overflow-hidden p-0 ${cardTone}`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        className="flex min-h-[82px] w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.025] sm:px-5"
      >
        {icon && (
          <span
            className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${isActive ? "bg-[var(--section-soft)] text-foreground" : isDestructive ? "bg-destructive/10 text-destructive" : "bg-[var(--surface-2)] text-muted-foreground"}`}
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold leading-tight">{title}</span>
            {status && (
              <StatusChip
                tone={
                  status === "Active" ? "active" : status === "Destructive" ? "danger" : "planned"
                }
              >
                {status}
              </StatusChip>
            )}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && <div className="border-t border-border px-4 py-5 sm:px-5">{children}</div>}
    </Card>
  );
}

function FutureRows({ rows }: { rows: { label: string; detail: string; status: string }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-[var(--surface-2)] p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{row.detail}</p>
          </div>
          <StatusChip tone="planned">{row.status}</StatusChip>
        </div>
      ))}
    </div>
  );
}

export function SettingsView({
  onBack,
  layoutMode = "daily",
}: {
  onBack: () => void;
  layoutMode?: LayoutMode;
}) {
  const { state, set, reset, exportJson, importJson } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [activeSubtab, setActiveSubtab] = useState<SettingsSubtab>("profile");
  const [expanded, setExpanded] = useState<Record<SettingsSectionId, boolean>>({
    profile: true,
    preferences: true,
    data: true,
    integrations: true,
  });

  const updateProfile = (p: Partial<Profile>) =>
    set((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  const toggleSection = (id: SettingsSectionId) => setExpanded((s) => ({ ...s, [id]: !s[id] }));
  const changeSubtab = (id: SettingsSubtab) => {
    setActiveSubtab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const downloadBackup = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitcore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (f: File | null) => {
    if (!f) return;
    f.text().then((t) => {
      const ok = importJson(t);
      setImportMsg(ok ? "Imported successfully \u2713" : "Invalid backup file");
      setTimeout(() => setImportMsg(""), 3000);
    });
  };

  return (
    <div className="pb-28">
      <PageHeader
        title="Settings"
        subtitle="Control your profile, privacy, app behavior, and integrations."
        action={
          <button onClick={onBack} className="text-sm text-muted-foreground">
            Done
          </button>
        }
      />
      <SubTabs tabs={SETTINGS_TABS} active={activeSubtab} onChange={changeSubtab} />

      <div className="mx-auto max-w-3xl px-5">
        <section className="rounded-[var(--radius-card)] border border-border bg-[linear-gradient(135deg,var(--surface-2),transparent)] p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Settings
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                Control your profile, privacy, app behavior, and integrations.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Your personal fitness command center settings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone="active">Profile active</StatusChip>
              <StatusChip>Local data</StatusChip>
              <StatusChip>{state.profile.units}</StatusChip>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          {activeSubtab === "profile" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <HubCard
                id="profile"
                title="Basic Profile"
                description="Core identity and body metrics."
                status="Active"
                icon={<User size={18} />}
                expanded={expanded.profile}
                onToggle={toggleSection}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Display Name</Label>
                      <Input placeholder="Planned" disabled className="opacity-50" />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" disabled className="opacity-50" title="Planned" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Bodyweight (lb)</Label>
                      <Input
                        inputMode="decimal"
                        value={state.profile.bodyweightLb}
                        onChange={(e) =>
                          updateProfile({ bodyweightLb: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label>Height</Label>
                      <Input placeholder="Planned" disabled className="opacity-50" />
                    </div>
                  </div>
                </div>
              </HubCard>

              <GoalsProfileCard />

              <HubCard
                id="profile" // Reusing profile expansion state for all profile cards for simplicity
                title="Training Profile"
                description="Schedule, experience, and training constraints."
                status="Active"
                icon={<User size={18} />}
                expanded={expanded.profile}
                onToggle={toggleSection}
              >
                <div className="space-y-4">
                  <div>
                    <Label>Experience</Label>
                    <Select
                      value={state.profile.experience}
                      onChange={(e) =>
                        updateProfile({ experience: e.target.value as Profile["experience"] })
                      }
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Days/week</Label>
                      <Input
                        type="number"
                        value={state.profile.daysPerWeek}
                        onChange={(e) =>
                          updateProfile({ daysPerWeek: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label>Split</Label>
                      <Input
                        value={state.profile.split}
                        onChange={(e) => updateProfile({ split: e.target.value })}
                      />
                    </div>
                  </div>
                  <FutureRows
                    rows={[
                      {
                        label: "Preferred split",
                        detail: "Planned placeholder for auto-generated splits.",
                        status: "Planned",
                      },
                      {
                        label: "Equipment / Gym access",
                        detail: "Planned placeholder for location tracking.",
                        status: "Coming later",
                      },
                    ]}
                  />
                </div>
              </HubCard>

              <HubCard
                id="profile"
                title="Health Context"
                description="Injuries, limitations, and medical context."
                status="Presentational only"
                icon={<Info size={18} />}
                expanded={expanded.profile}
                onToggle={toggleSection}
              >
                <FutureRows
                  rows={[
                    {
                      label: "Injuries / Limitations",
                      detail: "Planned context for training limitations and active pain areas.",
                      status: "Not connected yet",
                    },
                    {
                      label: "Allergies",
                      detail: "Future profile note area. No medical advice or alerts are active.",
                      status: "Coming later",
                    },
                    {
                      label: "Medications",
                      detail: "Reserved for optional user-entered context in a later release.",
                      status: "Planned",
                    },
                    {
                      label: "Surgeries",
                      detail: "Placeholder for future safety context.",
                      status: "Coming later",
                    },
                    {
                      label: "Conditions",
                      detail: "Planned sensitive health profile. Not a diagnosis.",
                      status: "Planned",
                    },
                    {
                      label: "Blood type",
                      detail: "Placeholder for later support.",
                      status: "Coming later",
                    },
                  ]}
                />
              </HubCard>

              <HubCard
                id="profile"
                title="Emergency / Safety Profile"
                description="Store important context for future safety-aware insights."
                status="Presentational only"
                icon={<Info size={18} />}
                expanded={expanded.profile}
                onToggle={toggleSection}
              >
                <FutureRows
                  rows={[
                    {
                      label: "Emergency contacts",
                      detail: "Placeholder for later contact information support.",
                      status: "Planned",
                    },
                    {
                      label: "Red-flag safety context",
                      detail:
                        "Future safety profile concept only. You will control what is saved and used.",
                      status: "Not connected yet",
                    },
                    {
                      label: "Safety notes",
                      detail: "Planned placeholder for custom safety notes.",
                      status: "Coming later",
                    },
                  ]}
                />
              </HubCard>
            </div>
          )}

          {activeSubtab === "preferences" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <HubCard
                id="preferences"
                title="Preferences & Reminders"
                description="Workout, weigh-in, lunch reminder toggles, and demo data."
                status="Active"
                icon={<Bell size={18} />}
                expanded={expanded.preferences}
                onToggle={toggleSection}
              >
                <div className="space-y-4">
                  <div>
                    <Label>Units</Label>
                    <Select
                      value={state.profile.units}
                      onChange={(e) => updateProfile({ units: e.target.value as "lb" | "kg" })}
                    >
                      <option value="lb">lb</option>
                      <option value="kg">kg</option>
                    </Select>
                  </div>
                  <FutureRows
                    rows={[
                      {
                        label: "Calories / Macros display",
                        detail: "Planned customization for macro goals display.",
                        status: "Coming later",
                      },
                    ]}
                  />
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-semibold">Reminders</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Reminders use local browser notifications. The app functions normally without
                      them.
                    </p>
                    {(["workout", "weighIn", "lunch"] as const).map((k) => (
                      <label
                        key={k}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--surface-2)] p-3"
                      >
                        <span className="text-sm capitalize leading-snug">
                          {k === "weighIn"
                            ? "Weigh-in 9 PM"
                            : k === "workout"
                              ? "Workout 5 PM"
                              : "Lunch log 12 PM"}
                        </span>
                        <input
                          type="checkbox"
                          checked={state.reminders[k]}
                          onChange={(e) =>
                            set((s) => ({
                              ...s,
                              reminders: { ...s.reminders, [k]: e.target.checked },
                            }))
                          }
                          className="h-5 w-5 shrink-0 accent-[var(--section)]"
                          aria-label={`Toggle ${k} reminder`}
                        />
                      </label>
                    ))}
                  </div>

                  <FutureRows
                    rows={[
                      {
                        label: "Morning briefing",
                        detail: "Planned daily morning check-in.",
                        status: "Planned",
                      },
                      {
                        label: "Workout readiness briefing",
                        detail: "Planned pre-workout suggestions.",
                        status: "Planned",
                      },
                      {
                        label: "Post-workout check-in",
                        detail: "Planned prompt after workouts.",
                        status: "Planned",
                      },
                      {
                        label: "Bedtime / day recap",
                        detail: "Planned evening review.",
                        status: "Planned",
                      },
                    ]}
                  />

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
                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--surface-2)] p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Show demo data</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Fills charts with sample data. Your real data remains untouched.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={state.demoMode}
                        onChange={(e) => set((s) => ({ ...s, demoMode: e.target.checked }))}
                        className="h-5 w-5 shrink-0 accent-[var(--section)]"
                      />
                    </label>
                  </div>
                </div>
              </HubCard>

              <HubCard
                id="preferences"
                title="App Behavior"
                description="Do Not Disturb, display modes, and customization placeholders."
                status="Presentational only"
                icon={<Info size={18} />}
                expanded={expanded.preferences}
                onToggle={toggleSection}
              >
                <FutureRows
                  rows={[
                    {
                      label: "Do Not Disturb / Quiet hours",
                      detail: "Planned feature to delay notifications.",
                      status: "Coming later",
                    },
                    {
                      label: "Busy detection",
                      detail: "Planned feature to suppress alerts during workouts.",
                      status: "Not connected yet",
                    },
                    {
                      label: "Display mode preference",
                      detail: "Planned setting for default Daily View vs Deep Dive.",
                      status: "Planned",
                    },
                    {
                      label: "One-sentence daily summary",
                      detail: "Planned preference for succinct insights.",
                      status: "Planned",
                    },
                    {
                      label: "Choose visible cards",
                      detail: "Planned customization to show/hide Daily View cards.",
                      status: "Planned",
                    },
                    {
                      label: "Reorder cards",
                      detail: "Planned drag-and-drop feature for dashboard.",
                      status: "Planned",
                    },
                    {
                      label: "Hide Deep Dive modules",
                      detail: "Planned toggle for specific analytics modules.",
                      status: "Planned",
                    },
                  ]}
                />
              </HubCard>
            </div>
          )}

          {activeSubtab === "data" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <HubCard
                id="data"
                title="Jarvis / AI Memory"
                description="Manage AI permissions and activity history."
                status="Active"
                icon={<BrainCircuit size={18} />}
                expanded={expanded.data}
                onToggle={toggleSection}
              >
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Existing Jarvis controls live here. Broader AI memory permissions by category
                    are planned.
                  </p>
                  <JarvisSettingsCard />
                  <JarvisActivityCard />

                  <FutureRows
                    rows={[
                      {
                        label: "Memory categories",
                        detail: "Planned toggle AI memory by category.",
                        status: "Planned",
                      },
                      {
                        label: "Delete specific memories",
                        detail: "Planned support for removing single facts.",
                        status: "Planned",
                      },
                      {
                        label: "Why do you know this?",
                        detail: "Planned UI to show source data behind AI conclusions.",
                        status: "Coming later",
                      },
                      {
                        label: "Data used for insights",
                        detail: "Planned connected logs and metrics view.",
                        status: "Coming later",
                      },
                    ]}
                  />
                </div>
              </HubCard>

              <HubCard
                id="data"
                title="Privacy & Security"
                description="Local-data posture and sensitive data controls."
                status="Presentational only"
                icon={<Database size={18} />}
                expanded={expanded.data}
                onToggle={toggleSection}
              >
                <FutureRows
                  rows={[
                    {
                      label: "Local-only data",
                      detail: "Current app data stays on this device unless you export it.",
                      status: "Active",
                    },
                    {
                      label: "Reduced-history mode",
                      detail: "Planned mode for privacy-conscious storage limits.",
                      status: "Planned",
                    },
                    {
                      label: "Local-only sensitive data",
                      detail: "Planned extra locks for medical/genetics/photos/conversations.",
                      status: "Coming later",
                    },
                  ]}
                />
              </HubCard>

              <HubCard
                id="data"
                title="Data Management"
                description="Export, import, and reset local app data."
                status="Destructive"
                icon={<Database size={18} />}
                expanded={expanded.data}
                onToggle={toggleSection}
              >
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold">Data Management</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Your data is stored locally. Use backups to secure your progress.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <GhostButton className="w-full justify-center" onClick={downloadBackup}>
                      <Download size={16} />
                      Export
                    </GhostButton>
                    <label className="block">
                      <GhostButton className="w-full justify-center pointer-events-none">
                        <Upload size={16} />
                        Import
                      </GhostButton>
                      <input
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={(e) => handleImport(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  {importMsg && (
                    <p className="text-xs text-center" style={{ color: "var(--section)" }}>
                      {importMsg}
                    </p>
                  )}
                  <div className="rounded-2xl border border-destructive/35 bg-destructive/5 p-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-destructive">
                      Destructive action
                    </p>
                    <button
                      onClick={() => setConfirmReset(true)}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-small)] border border-destructive px-4 py-2.5 font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 size={16} />
                      Reset all data
                    </button>
                  </div>
                </div>
              </HubCard>
            </div>
          )}

          {activeSubtab === "integrations" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <HubCard
                id="integrations"
                title="Integrations & Devices"
                description="Planned home for future connected health and device sources."
                status="Presentational only"
                icon={<Database size={18} />}
                expanded={expanded.integrations}
                onToggle={toggleSection}
              >
                <FutureRows
                  rows={[
                    {
                      label: "Apple Watch",
                      detail:
                        "Planned support for HRV, resting heart rate, sleep, steps, calories, respiratory rate, and workout detection.",
                      status: "Not connected",
                    },
                    {
                      label: "Whoop",
                      detail:
                        "Planned support for recovery, strain, sleep, HRV, RHR, and respiratory rate.",
                      status: "Not connected",
                    },
                    {
                      label: "Food apps & Database",
                      detail:
                        "Planned placeholders for food database, saved foods, and recipe import.",
                      status: "Planned",
                    },
                    {
                      label: "Camera & Macro Estimation",
                      detail: "Planned support for photo macro estimates and barcode scanning.",
                      status: "Planned",
                    },
                  ]}
                />
              </HubCard>

              <HubCard
                id="integrations"
                title="Coach / Pro / Business"
                description="Future surface for coaching, clinics, teams, or premium workflows."
                status="Presentational only"
                icon={<BrainCircuit size={18} />}
                expanded={expanded.integrations}
                onToggle={toggleSection}
              >
                <FutureRows
                  rows={[
                    {
                      label: "Coach mode",
                      detail: "Planned placeholder for sharing reports and role-based access.",
                      status: "Planned",
                    },
                    {
                      label: "Gym / PT Clinic Mode",
                      detail: "Planned business dashboard and client professional review.",
                      status: "Coming later",
                    },
                    {
                      label: "Premium / Pro",
                      detail:
                        "Presentational placeholder only; no subscription or payment logic is active.",
                      status: "Not connected yet",
                    },
                  ]}
                />
              </HubCard>

              <HubCard
                id="integrations"
                title="About / Support"
                description="Version, AI provider note, and local-data reminder."
                status="Local"
                icon={<Info size={18} />}
                expanded={expanded.integrations}
                onToggle={toggleSection}
              >
                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    FitCore v1 &mdash; your personal fitness command center.
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    AI coach: Lovable AI (Gemini).{" "}
                    <span className="font-medium text-foreground">Data stays on this device.</span>{" "}
                    No accounts, no tracking.
                  </p>
                </div>
                <FutureRows
                  rows={[
                    {
                      label: "Feedback & Support",
                      detail: "Planned support and feedback form.",
                      status: "Planned",
                    },
                    {
                      label: "Privacy & About",
                      detail: "Planned full privacy policy.",
                      status: "Coming later",
                    },
                    { label: "Terms", detail: "Planned terms of service.", status: "Planned" },
                  ]}
                />
              </HubCard>
            </div>
          )}

          <div className="rounded-[var(--radius-card)] border border-border bg-[var(--surface-2)] p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              End of Settings
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Current controls are active above. Planned cards are visual placeholders until their
              features are actually connected.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
        title="Reset all data?"
        message="This permanently erases workouts, meals, recovery, photos and PRs."
        confirmLabel="Reset"
        destructive
      />
    </div>
  );
}
