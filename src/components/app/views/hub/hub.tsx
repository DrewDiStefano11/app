import { useState } from "react";
import { PageHeader, Card } from "@/components/app/ui";
import { User, Target, Activity, Bell, BrainCircuit, Activity as Medical, Watch, Database, Palette, Settings, Info, ChevronLeft } from "lucide-react";

export function HubView({ onBack }: { onBack: () => void }) {
  return (
    <div className="pb-6">
      <PageHeader
        title="FitCore Hub"
        subtitle="A control center for profile, goals, health context, devices, privacy, and app settings."
        action={
          <button onClick={onBack} className="text-sm text-muted-foreground flex items-center gap-1">
            <ChevronLeft size={16} /> Close
          </button>
        }
      />

      <div className="px-5 space-y-5">
        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><User size={16} /> Profile</h3>
          </div>
          <Card className="space-y-4">
             <p className="text-xs text-muted-foreground">Name, age, height, units, training experience, preferences.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Target size={16} /> Goals & Phases</h3>
          </div>
          <Card className="space-y-4">
            <p className="text-xs text-muted-foreground">Main goal, secondary goals, current phase chip (Bulk, Cut, Maintenance, Rehab, Travel, Illness, Deload), goal history.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Activity size={16} /> Daily View / Deep Dive</h3>
          </div>
          <Card className="space-y-4">
            <p className="text-xs text-muted-foreground">Controls Daily vs Deep Dive modes.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Bell size={16} /> Notifications</h3>
          </div>
          <Card className="space-y-4">
            <p className="text-xs text-muted-foreground">Morning check-in, night review, workout/meal reminders, Do Not Disturb, busy detection.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><BrainCircuit size={16} /> Privacy & AI</h3>
          </div>
          <Card className="space-y-4">
            <p className="text-xs text-muted-foreground">AI memory controls, local-only mode, cloud sync permission, correction learning toggle, "Why do you know this?"</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2 text-destructive"><Medical size={16} /> Medical / Health</h3>
          </div>
          <Card className="space-y-4">
             <p className="text-xs text-muted-foreground">Injuries, pain history, medications, allergies, blood type, conditions, surgeries, PT reports, labs, imaging reports, genetics, emergency info, red-flag checklist.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Watch size={16} /> Wearables & Devices</h3>
          </div>
          <Card className="space-y-4">
             <p className="text-xs text-muted-foreground">Apple Health, Apple Watch, Fitbit, WHOOP, smart scales, etc.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Database size={16} /> Data Management</h3>
          </div>
          <Card className="space-y-4">
             <p className="text-xs text-muted-foreground">Export, delete, reset, clear AI memory, import.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Palette size={16} /> Appearance</h3>
          </div>
          <Card className="space-y-4">
             <p className="text-xs text-muted-foreground">Theme, tab colors, intensity settings, reduced motion.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Settings size={16} /> App Settings</h3>
          </div>
          <Card className="space-y-4">
             <p className="text-xs text-muted-foreground">Units, defaults, logging preferences, offline behavior, developer toggles.</p>
          </Card>
        </section>

        <section>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2"><Info size={16} /> About / QA</h3>
          </div>
          <Card className="space-y-4">
             <p className="text-xs text-muted-foreground">App version, build status, QA checklist, known limitations.</p>
          </Card>
        </section>

      </div>
    </div>
  );
}
