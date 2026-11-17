import { Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { USUAL_MEAL_SLOTS, usualMealSlots, writeUsualMeal } from "@/lib/jarvis/usual-meals";
import type { UserGoalsProfile, ExtendedGoal } from "@/lib/types";
import { Card, Input, Label, Select } from "../ui";

export function GoalsProfileCard() {
  const { state, set } = useStore();
  const p = state.userGoalsProfile;
  const upd = (patch: Partial<UserGoalsProfile>) => set(s => ({ ...s, userGoalsProfile: { ...s.userGoalsProfile, ...patch } }));
  const csv = (k: keyof UserGoalsProfile) => Array.isArray(p[k]) ? (p[k] as string[]).join(", ") : "";
  const setCsv = (k: keyof UserGoalsProfile, v: string) => upd({ [k]: v.split(",").map(s => s.trim()).filter(Boolean) } as Partial<UserGoalsProfile>);

  return (
    <section>
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Target size={16} />Goals & Profile</h3>
      <Card className="space-y-3">
        <div>
          <Label>Current goal</Label>
          <Select value={p.goal ?? ""} onChange={e => upd({ goal: (e.target.value || undefined) as ExtendedGoal | undefined })}>
            <option value="">—</option>
            <option value="bulk">Bulk</option><option value="cut">Cut</option><option value="maintain">Maintain</option>
            <option value="recomp">Recomp</option><option value="strength">Strength</option>
            <option value="hypertrophy">Hypertrophy</option><option value="general">General health</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Current bodyweight (lb)</Label><Input inputMode="decimal" value={p.currentBodyweightLb ?? ""} onChange={e => upd({ currentBodyweightLb: numOrUndef(e.target.value) })} /></div>
          <div><Label>Target bodyweight (lb)</Label><Input inputMode="decimal" value={p.targetBodyweightLb ?? ""} onChange={e => upd({ targetBodyweightLb: numOrUndef(e.target.value) })} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Calorie goal</Label><Input inputMode="numeric" value={p.calorieGoal ?? ""} onChange={e => upd({ calorieGoal: numOrUndef(e.target.value) })} /></div>
          <div><Label>Protein goal (g)</Label><Input inputMode="numeric" value={p.proteinGoal ?? ""} onChange={e => upd({ proteinGoal: numOrUndef(e.target.value) })} /></div>
          <div><Label>Carb goal (g)</Label><Input inputMode="numeric" value={p.carbGoal ?? ""} onChange={e => upd({ carbGoal: numOrUndef(e.target.value) })} /></div>
          <div><Label>Fat goal (g)</Label><Input inputMode="numeric" value={p.fatGoal ?? ""} onChange={e => upd({ fatGoal: numOrUndef(e.target.value) })} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Weekly weight change (lb)</Label><Input inputMode="decimal" value={p.weeklyWeightChangeLb ?? ""} onChange={e => upd({ weeklyWeightChangeLb: numOrUndef(e.target.value) })} /></div>
          <div><Label>Workout split</Label><Input value={p.workoutSplit ?? ""} onChange={e => upd({ workoutSplit: e.target.value || undefined })} placeholder="e.g. PPL" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Normal workout time</Label><Input type="time" value={p.normalWorkoutTime ?? ""} onChange={e => upd({ normalWorkoutTime: e.target.value || undefined })} /></div>
          <div><Label>Normal weigh-in time</Label><Input type="time" value={p.normalWeighInTime ?? ""} onChange={e => upd({ normalWeighInTime: e.target.value || undefined })} /></div>
        </div>

        <div><Label>Weak points (comma sep)</Label><Input value={csv("weakPoints")} onChange={e => setCsv("weakPoints", e.target.value)} placeholder="rear delts, calves" /></div>
        <div><Label>Injury / pain areas</Label><Input value={csv("injuryAreas")} onChange={e => setCsv("injuryAreas", e.target.value)} placeholder="left shoulder, low back" /></div>
        <div><Label>Supplement routine</Label><Input value={csv("supplementRoutine")} onChange={e => setCsv("supplementRoutine", e.target.value)} placeholder="creatine, whey, fish oil" /></div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <p className="col-span-2 text-xs text-muted-foreground">Changing a meal name here clears its saved macros. To save a name and macros together, ask Jarvis to update the usual meal.</p>
          {USUAL_MEAL_SLOTS.map(slot => {
            const { field, label } = usualMealSlots[slot];
            const id = `jarvis-usual-${slot}`;
            return (
              <div key={slot}>
                <label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Usual {label}</label>
                <Input id={id} value={p[field] ?? ""} onChange={event => {
                  const name = event.target.value || undefined;
                  set(s => writeUsualMeal(s, slot, { name }));
                }} />
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

function numOrUndef(v: string): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && v.trim() !== "" ? n : undefined;
}
