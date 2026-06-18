import { Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import type { JarvisSettings } from "@/lib/types";
import { Card, Label, Select } from "../ui";

export function JarvisSettingsCard() {
  const { state, set } = useStore();
  const s = state.jarvisSettings;
  const upd = (p: Partial<JarvisSettings>) => set(st => ({ ...st, jarvisSettings: { ...st.jarvisSettings, ...p } }));

  const Toggle = ({ label, val, onChange, hint, disabled }: { label: string; val: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) => (
    <label className={`flex items-start justify-between py-1 gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <input type="checkbox" disabled={disabled} checked={val} onChange={e => onChange(e.target.checked)} className="w-5 h-5 accent-[var(--section)] mt-0.5" />
    </label>
  );

  return (
    <section>
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Sparkles size={16} />Jarvis AI</h3>
      <Card className="space-y-4">
        <Toggle label="Jarvis enabled" val={s.enabled} onChange={v => upd({ enabled: v })} />

        <div>
          <Label>Permission level</Label>
          <Select value={String(s.permission)} onChange={e => upd({ permission: Number(e.target.value) as JarvisSettings["permission"] })}>
            <option value="1">L1 — Suggest only</option>
            <option value="2">L2 — Draft & confirm</option>
            <option value="3">L3 — Auto-log simple items</option>
            <option value="4">L4 — Full app control (with undo)</option>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">L3 and L4 auto-save clear bodyweight / supplements; uncertain items still ask.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Response style</Label>
            <Select value={s.responseStyle} onChange={e => upd({ responseStyle: e.target.value as JarvisSettings["responseStyle"] })}>
              <option value="concise">Concise</option><option value="normal">Normal</option><option value="detailed">Detailed</option>
            </Select>
          </div>
          <div>
            <Label>Personality</Label>
            <Select value={s.personality} onChange={e => upd({ personality: e.target.value as JarvisSettings["personality"] })}>
              <option value="friendly">Friendly</option><option value="coach">Coach</option><option value="siri">Siri-style</option><option value="chatgpt">ChatGPT-style</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>Proactive suggestions</Label>
          <Select value={s.proactive} onChange={e => upd({ proactive: e.target.value as JarvisSettings["proactive"] })}>
            <option value="off">Off</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Trend-based suggestions arrive in Phase 5.</p>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Auto-log</p>
          <Toggle label="Auto-log clear supplements" val={s.autoLogSupplements} onChange={v => upd({ autoLogSupplements: v })} hint="\"Log creatine\" saves immediately." />
          <Toggle label="Auto-log exact bodyweight" val={s.autoLogBodyweight} onChange={v => upd({ autoLogBodyweight: v })} />
          <Toggle label="Auto-log high-confidence meal estimates" val={s.autoLogMealEstimates} onChange={v => upd({ autoLogMealEstimates: v })} hint="Only when Jarvis is confident; vague meals still ask." />
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Confirmation</p>
          <Toggle label="Ask before saving meal estimates" val={s.askBeforeMealEstimates} onChange={v => upd({ askBeforeMealEstimates: v })} />
          <Toggle label="Ask before saving workouts" val={s.askBeforeWorkouts} onChange={v => upd({ askBeforeWorkouts: v })} />
          <Toggle label="Ask before editing active workouts" val={s.askBeforeActiveWorkoutEdits} onChange={v => upd({ askBeforeActiveWorkoutEdits: v })} />
        </div>

        <div className="border-t border-border pt-3">
          <Label>Food estimate detail</Label>
          <Select value={s.foodEstimateDetail} onChange={e => upd({ foodEstimateDetail: e.target.value as JarvisSettings["foodEstimateDetail"] })}>
            <option value="simple">Simple</option><option value="normal">Normal</option><option value="detailed">Detailed assumptions</option>
          </Select>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Coaching</p>
          <Toggle label="Nutrition suggestions" val={s.nutritionSuggestions} onChange={v => upd({ nutritionSuggestions: v })} />
          <Toggle label="Supplement reminders" val={s.supplementReminders} onChange={v => upd({ supplementReminders: v })} />
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Memory</p>
          <Toggle label="Learn from corrections" val={s.learningEnabled} onChange={v => upd({ learningEnabled: v })} hint="Jarvis remembers usual meals, portion sizes, dismissed suggestions." />
          <button onClick={() => set(st => ({ ...st, jarvisLearning: {} }))} className="text-xs text-destructive">Clear learned preferences</button>
          <button onClick={() => set(st => ({ ...st, jarvisAudit: [] }))} className="text-xs text-destructive block">Clear Jarvis activity history</button>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Reviews</p>
          <Toggle label="Daily review (ask Jarvis any time)" val={s.dailyReviewEnabled} onChange={v => upd({ dailyReviewEnabled: v })} hint="On-demand today. Scheduled push arrives in Phase 5." />
          <Toggle disabled label="Weekly review (coming Phase 5)" val={s.weeklyReviewEnabled} onChange={v => upd({ weeklyReviewEnabled: v })} />
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Voice (coming Phase 6)</p>
          <Toggle disabled label="Voice mode" val={s.voiceModeEnabled} onChange={v => upd({ voiceModeEnabled: v })} />
          <Toggle disabled label="Spoken responses" val={s.spokenResponses} onChange={v => upd({ spokenResponses: v })} />
        </div>
      </Card>
    </section>
  );
}
