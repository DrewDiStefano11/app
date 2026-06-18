import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Sparkles, XCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import type { JarvisSettings } from "@/lib/types";
import { testAiConnection } from "@/lib/ai.functions";
import { Card, GhostButton, Input, Label, PrimaryButton, Select } from "../ui";

const GEMINI_KEY_STORAGE = "fitcore.jarvis.geminiApiKey.v1";
type ConnectionStatus = "not_configured" | "testing" | "connected" | "failed";

function readSavedGeminiKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GEMINI_KEY_STORAGE) ?? "";
}

export function JarvisSettingsCard() {
  const { state, set } = useStore();
  const s = state.jarvisSettings;
  const upd = (p: Partial<JarvisSettings>) => set(st => ({ ...st, jarvisSettings: { ...st.jarvisSettings, ...p } }));
  const testConnection = useServerFn(testAiConnection);
  const [keyDraft, setKeyDraft] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("not_configured");
  const [statusText, setStatusText] = useState("Not configured");

  useEffect(() => {
    if (s.aiProvider === "legacy-lovable") {
      setStatus("not_configured");
      setStatusText("Legacy provider uses LOVABLE_API_KEY on the server.");
      return;
    }
    if (s.geminiKeyMode === "user" && s.geminiUserKeySaved) {
      setStatus("not_configured");
      setStatusText("Saved key available. Test connection when ready.");
      return;
    }
    setStatus("not_configured");
    setStatusText(s.geminiKeyMode === "environment" ? "Uses GEMINI_API_KEY or GOOGLE_API_KEY from the server environment." : "No user key saved.");
  }, [s.aiProvider, s.geminiKeyMode, s.geminiUserKeySaved]);

  const Toggle = ({ label, val, onChange, hint, disabled }: { label: string; val: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) => (
    <label className={`flex items-start justify-between py-1 gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <input type="checkbox" disabled={disabled} checked={val} onChange={e => onChange(e.target.checked)} className="w-5 h-5 accent-[var(--section)] mt-0.5" />
    </label>
  );

  const saveGeminiKey = () => {
    const key = keyDraft.trim();
    if (!key) {
      setStatus("failed");
      setStatusText("Enter a Gemini API key first.");
      return;
    }
    window.localStorage.setItem(GEMINI_KEY_STORAGE, key);
    setKeyDraft("");
    upd({ aiProvider: "gemini", geminiKeyMode: "user", geminiUserKeySaved: true });
    setStatus("not_configured");
    setStatusText("Gemini key saved locally. Raw key is hidden after saving.");
  };

  const clearGeminiKey = () => {
    window.localStorage.removeItem(GEMINI_KEY_STORAGE);
    setKeyDraft("");
    upd({ geminiUserKeySaved: false });
    setStatus("not_configured");
    setStatusText("Saved Gemini key cleared.");
  };

  const runConnectionTest = async () => {
    setStatus("testing");
    setStatusText("Testing connection...");
    const savedKey = s.geminiKeyMode === "user" ? readSavedGeminiKey() : "";
    const keyForTest = keyDraft.trim() || savedKey;
    const result = await testConnection({ data: {
      provider: s.aiProvider,
      geminiKeyMode: s.geminiKeyMode,
      userGeminiApiKey: s.geminiKeyMode === "user" ? keyForTest : undefined,
    } });
    if (result.ok) {
      setStatus("connected");
      setStatusText(s.aiProvider === "gemini" ? `Connected via Gemini ${"keySource" in result ? `(${result.keySource})` : ""}.` : "Connected to legacy provider.");
      if (s.geminiKeyMode === "user" && keyDraft.trim()) saveGeminiKey();
    } else {
      setStatus(result.status === "not_configured" ? "not_configured" : "failed");
      setStatusText(result.error || "Connection failed.");
    }
  };

  const StatusIcon = status === "testing" ? Loader2 : status === "connected" ? CheckCircle2 : status === "failed" ? XCircle : KeyRound;

  return (
    <section>
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Sparkles size={16} />Jarvis AI</h3>
      <Card className="space-y-4">
        <Toggle label="Jarvis enabled" val={s.enabled} onChange={v => upd({ enabled: v })} />

        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">AI provider</p>
          <div>
            <Label>Provider</Label>
            <Select value={s.aiProvider} onChange={e => upd({ aiProvider: e.target.value as JarvisSettings["aiProvider"] })}>
              <option value="gemini">Gemini</option>
              <option value="legacy-lovable">Legacy/Lovable fallback</option>
            </Select>
          </div>

          {s.aiProvider === "gemini" && (
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-3">
              <div>
                <Label>Gemini key source</Label>
                <Select value={s.geminiKeyMode} onChange={e => upd({ geminiKeyMode: e.target.value as JarvisSettings["geminiKeyMode"] })}>
                  <option value="environment">Use environment key if available</option>
                  <option value="user">Use user-entered key if no environment key is available</option>
                </Select>
              </div>
              <div>
                <Label>Gemini API key</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={keyDraft}
                  onChange={e => setKeyDraft(e.target.value)}
                  placeholder={s.geminiUserKeySaved ? "Saved key hidden" : "Paste Gemini API key"}
                />
                <p className="text-xs text-muted-foreground mt-1">For personal/local use only. Do not commit API keys.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <PrimaryButton type="button" onClick={saveGeminiKey} disabled={!keyDraft.trim()}>Save key</PrimaryButton>
                <GhostButton type="button" onClick={clearGeminiKey}>Clear key</GhostButton>
                <GhostButton type="button" onClick={runConnectionTest} disabled={status === "testing"}>
                  {status === "testing" ? <Loader2 size={14} className="animate-spin" /> : null}Test
                </GhostButton>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <StatusIcon size={14} className={status === "testing" ? "animate-spin" : ""} />
                <span className="capitalize">{status.replace("_", " ")}</span>
                <span>-</span>
                <span>{statusText}</span>
              </div>
            </div>
          )}

          {s.aiProvider === "legacy-lovable" && (
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-2">
              <p className="text-sm font-medium">Legacy/Lovable fallback</p>
              <p className="text-xs text-muted-foreground">Uses server-side LOVABLE_API_KEY only. Gemini remains the main provider for Jarvis.</p>
              <GhostButton type="button" onClick={runConnectionTest} disabled={status === "testing"}>{status === "testing" ? <Loader2 size={14} className="animate-spin" /> : null}Test legacy connection</GhostButton>
              <p className="text-xs text-muted-foreground">{statusText}</p>
            </div>
          )}
        </div>

        <div>
          <Label>Permission level</Label>
          <Select value={String(s.permission)} onChange={e => upd({ permission: Number(e.target.value) as JarvisSettings["permission"] })}>
            <option value="1">L1 - Suggest only</option>
            <option value="2">L2 - Draft & confirm</option>
            <option value="3">L3 - Auto-log simple items</option>
            <option value="4">L4 - Full app control (with undo)</option>
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
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Auto-log</p>
          <Toggle label="Auto-log clear supplements" val={s.autoLogSupplements} onChange={v => upd({ autoLogSupplements: v })} hint='"Log creatine" saves immediately.' />
          <Toggle label="Auto-log exact bodyweight" val={s.autoLogBodyweight} onChange={v => upd({ autoLogBodyweight: v })} />
          <Toggle label="Auto-log high-confidence meal estimates" val={s.autoLogMealEstimates} onChange={v => upd({ autoLogMealEstimates: v })} hint="Only when Jarvis is confident; vague meals still ask." />
          <Toggle label="Auto-apply active workout suggestions" val={s.autoApplyActiveWorkoutSuggestions} onChange={v => upd({ autoApplyActiveWorkoutSuggestions: v })} hint="When off, Jarvis asks before changing an active workout." />
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
          <Toggle label="Workout suggestions" val={s.workoutSuggestions} onChange={v => upd({ workoutSuggestions: v })} />
          <Toggle label="Progression suggestions" val={s.progressionSuggestions} onChange={v => upd({ progressionSuggestions: v })} />
          <Toggle label="Pain-based workout warnings" val={s.painBasedWorkoutWarnings} onChange={v => upd({ painBasedWorkoutWarnings: v })} />
          <Toggle label="Save workout template suggestions" val={s.saveWorkoutTemplateSuggestions} onChange={v => upd({ saveWorkoutTemplateSuggestions: v })} />
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
