import re

with open("src/components/app/views/nutrition.tsx", "r") as f:
    content = f.read()

# Remove unused imports: Target
content = content.replace("import { Plus, Trash2, Utensils, Target, Camera, Sparkles }", "import { Plus, Trash2, Utensils, Camera, Sparkles }")
# SubTabs
content = content.replace("  SubTabs,\n", "")

# Remove TABS definition
content = re.sub(r'type Tab = "today" \| "history" \| "goals";.*?\];', '', content, flags=re.DOTALL)

# Find LogMealSheet
log_meal_sheet_idx = content.find("function LogMealSheet")
log_meal_sheet_code = content[log_meal_sheet_idx:]

# Find MacroBar
macro_bar_match = re.search(r'function MacroBar.*?\n}\n', content, flags=re.DOTALL)
macro_bar_code = macro_bar_match.group(0)

new_content = """import { useState } from "react";
import { Plus, Trash2, Utensils, Camera, Sparkles, Droplets, Pill } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { FOODS, MEAL_TEMPLATES, mealTotals } from "@/lib/data";
import type { MealEntry } from "@/lib/types";
import {
  PageHeader,
  PrimaryButton,
  GhostButton,
  EmptyState,
  Chip,
  Input,
  Label,
  Select,
  Ring,
  SectionHeader,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { Tile, Eyebrow } from "@/components/app/tile";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];

export function NutritionView() {
  const { state, set } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const today = state.mealEntries.filter((m) => isToday(m.createdAt));
  const t = today.reduce(
    (a, m) => ({ c: a.c + m.calories, p: a.p + m.protein, cb: a.cb + m.carbs, f: a.f + m.fat }),
    { c: 0, p: 0, cb: 0, f: 0 },
  );
  const tg = state.nutritionTargets;
  const remaining = Math.max(0, tg.calories - t.c);

  const supplements = state.supplementLogs ? state.supplementLogs.filter((s) => isToday(s.createdAt)) : [];

  let statusMsg = "No nutrition logged yet";
  if (today.length > 0) {
    const proteinGap = tg.protein - t.p;
    const calorieGap = tg.calories - t.c;
    if (proteinGap > 30) statusMsg = `Protein still needed (${Math.round(proteinGap)}g short)`;
    else if (calorieGap > 500) statusMsg = `Calories still needed (${Math.round(calorieGap)} kcal under)`;
    else statusMsg = "On track";
  }

  return (
    <div className="pb-24">
      <PageHeader title="Nutrition" subtitle={`${Math.round(remaining)} kcal remaining today`} />

      <div className="px-5 space-y-4 mt-2">
        <Tile hero accent delay={0} className="glow-section p-6 bg-red-500/10 border-red-500/20" style={{ '--section': 'rgb(239 68 68)' } as React.CSSProperties}>
          <div className="flex justify-between items-center mb-4">
            <Eyebrow color="rgb(239 68 68)">Daily Macros</Eyebrow>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 bg-white/5 px-2 py-1 rounded-md">{statusMsg}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex flex-col items-center gap-2">
              <Ring value={t.c} max={tg.calories} size={96} label="kcal" color="rgb(239 68 68)" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {Math.round((t.c / Math.max(1, tg.calories)) * 100)}% Goal
              </p>
            </div>
            <div className="flex-1 space-y-3">
              <MacroBar
                label="Protein"
                value={t.p}
                target={tg.protein}
                unit="g"
                color="rgb(239 68 68)"
              />
              <MacroBar
                label="Carbs"
                value={t.cb}
                target={tg.carbs}
                unit="g"
                color="rgb(245 158 11)"
              />
              <MacroBar label="Fat" value={t.f} target={tg.fat} unit="g" color="rgb(34 197 94)" />
            </div>
          </div>
        </Tile>

        <div className="grid grid-cols-2 gap-3">
          <PrimaryButton onClick={() => setLogOpen(true)} className="rounded-2xl h-14 bg-red-500 hover:bg-red-600 text-white border-transparent">
            <Plus size={18} />
            <span>Log Meal</span>
          </PrimaryButton>
          <GhostButton
            onClick={() => window.dispatchEvent(new CustomEvent("fitcore:open-ai"))}
            className="rounded-2xl h-14 border-white/10 bg-white/5 hover:bg-white/10"
          >
            <Camera size={18} className="text-red-400" />
            <span>Photo Meal</span>
          </GhostButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={16} className="text-blue-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Hydration</p>
            </div>
            <p className="font-display text-xl text-white">0 <span className="text-sm text-white/40">fl oz</span></p>
          </div>

          <div className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Pill size={16} className="text-purple-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Supplements</p>
            </div>
            {supplements.length > 0 ? (
               <p className="font-display text-xl text-white">{supplements.length} <span className="text-sm text-white/40">taken</span></p>
            ) : (
               <p className="font-display text-xl text-white/40 italic">None logged</p>
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="Meals Today" />
          {today.length === 0 ? (
            <EmptyState
              icon={<Utensils size={22} />}
              title="No meals logged yet"
              description="Log your first meal or scan with AI to start tracking."
              action={
                <PrimaryButton onClick={() => setLogOpen(true)} className="mt-2 bg-red-500 hover:bg-red-600 border-transparent">
                  <Plus size={16} />
                  Log Meal
                </PrimaryButton>
              }
            />
          ) : (
            <div className="space-y-3">
              {today.map((m) => (
                <div
                  key={m.id}
                  className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group transition-all active:scale-[0.98]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">{m.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                        {m.type}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[10px] font-bold text-white/40">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {m.source === "ai" && (
                         <>
                           <span className="w-1 h-1 rounded-full bg-white/10" />
                           <span className="text-[10px] font-bold text-red-400/80">AI Estimated</span>
                         </>
                      )}
                    </div>
                  </div>
                  <div className="text-right px-3">
                    <p className="font-display text-xl leading-none tabular-nums text-white">
                      {Math.round(m.calories)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">
                      P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                    </p>
                  </div>
                  <button
                    aria-label="Delete meal"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    onClick={() => setConfirmDel(m.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LogMealSheet open={logOpen} onClose={() => setLogOpen(false)} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          set((s) => ({ ...s, mealEntries: s.mealEntries.filter((x) => x.id !== confirmDel) }));
          setConfirmDel(null);
        }}
        title="Delete meal?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

"""

new_content += macro_bar_code + "\n\n" + log_meal_sheet_code

with open("src/components/app/views/nutrition.tsx", "w") as f:
    f.write(new_content)
