import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Sparkles, XCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import type { JarvisSettings } from "@/lib/types";
import { testAiConnection } from "@/lib/ai.functions";
import { GEMINI_MODELS, GROQ_MODELS, selectedGroqModel } from "@/lib/jarvis/provider-models";
import { Card, GhostButton, Input, Label, PrimaryButton, Select } from "../ui";

const GEMINI_KEY_STORAGE = "fitcore.jarvis.geminiApiKey.v1";
const GROQ_KEY_STORAGE = "fitcore.jarvis.groqApiKey.v1";
const AI_DIAGNOSTICS_STORAGE = "fitcore.jarvis.aiDiagnostics.v1";
type ConnectionStatus = "not_configured" | "testing" | "connected" | "failed";
type ConnectionResult = {
  ok: boolean;
  status: ConnectionStatus;
  provider?: string;
  keySource?: string;
  model?: string;
  error?: string;
};
type AiDiagnostics = {
  provider?: string;
  selectedModel?: string;
  actualModel?: string;
  routed?: boolean;
  fallback?: boolean;
  fallbackReason?: string;
  callType?: string;
  status?: number;
  errorCategory?: string;
  retryCount?: number;
  fallbackCount?: number;
  inputSize?: number;
  toolsSent?: number;
  messagesSent?: number;
  timestamp?: number;
};

function readSavedKey(storageKey: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(storageKey) ?? "";
}

function readDiagnostics(): AiDiagnostics[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AI_DIAGNOSTICS_STORAGE);
    return raw ? (JSON.parse(raw) as { calls?: AiDiagnostics[] }).calls ?? [] : [];
  } catch {
    return [];
  }
}

function modelLabel(model?: string) {
  if (model === "openai/gpt-oss-20b") return "GPT OSS 20B";
  if (model === "openai/gpt-oss-120b") return "GPT OSS 120B";
  if (model === "qwen/qwen3.8-27b") return "Qwen 3.8 27B";
  if (model === GEMINI_MODELS[0]) return "Gemini 3.5 Flash-Lite";
  return model ?? "None";
}

export function JarvisSettingsCard() {
  const { state, set } = useStore();
  const s = state.jarvisSettings;
  const upd = (p: Partial<JarvisSettings>) => set(st => ({ ...st, jarvisSettings: { ...st.jarvisSettings, ...p } }));
  const testConnection = useServerFn(testAiConnection);
  const [groqKeyDraft, setGroqKeyDraft] = useState("");
  const [geminiKeyDraft, setGeminiKeyDraft] = useState("");
  const [groqStatus, setGroqStatus] = useState<ConnectionStatus>("not_configured");
  const [geminiStatus, setGeminiStatus] = useState<ConnectionStatus>("not_configured");
  const [groqStatusText, setGroqStatusText] = useState("Not configured");
  const [geminiStatusText, setGeminiStatusText] = useState("Not configured");
  const [hasSavedGroqKey, setHasSavedGroqKey] = useState(false);
  const [hasSavedGeminiKey, setHasSavedGeminiKey] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AiDiagnostics[]>([]);
  const groqModel = selectedGroqModel(s.groqModel);
  const geminiModel = GEMINI_MODELS[0];

  useEffect(() => {
    const groqSaved = Boolean(readSavedKey(GROQ_KEY_STORAGE));
    const geminiSaved = Boolean(readSavedKey(GEMINI_KEY_STORAGE));
    setHasSavedGroqKey(groqSaved);
    setHasSavedGeminiKey(geminiSaved);
    setDiagnostics(readDiagnostics());
    const patch: Partial<JarvisSettings> = {};
    if (groqSaved && !s.groqUserKeySaved) patch.groqUserKeySaved = true;
    if (geminiSaved && !s.geminiUserKeySaved) patch.geminiUserKeySaved = true;
    if (s.groqKeyMode === "user") patch.groqKeyMode = "local";
    if (s.geminiKeyMode === "user") patch.geminiKeyMode = "local";
    if (s.groqModel !== groqModel) patch.groqModel = groqModel;
    if (s.geminiModel !== geminiModel) patch.geminiModel = geminiModel;
    if (s.autoModelRouting === undefined) patch.autoModelRouting = true;
    if (s.allowGeminiFallback === undefined) patch.allowGeminiFallback = false;
    if (Object.keys(patch).length > 0) upd(patch);
  }, []);

  useEffect(() => {
    const h = () => setDiagnostics(readDiagnostics());
    window.addEventListener("fitcore:jarvis-ai-diagnostics", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("fitcore:jarvis-ai-diagnostics", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  useEffect(() => {
    if (groqStatus !== "connected") {
      setGroqStatus("not_configured");
      setGroqStatusText(hasSavedGroqKey || s.groqUserKeySaved ? "Saved Groq key configured. Test connection when ready." : "Jarvis needs a Groq API key. Add one in Jarvis AI Settings.");
    }
    if (geminiStatus !== "connected") {
      setGeminiStatus("not_configured");
      setGeminiStatusText(hasSavedGeminiKey || s.geminiUserKeySaved ? "Saved Gemini backup key configured. Test connection when ready." : "Gemini backup is not configured.");
    }
  }, [hasSavedGroqKey, hasSavedGeminiKey, s.groqUserKeySaved, s.geminiUserKeySaved]);

  const diagSummary = useMemo(() => {
    const last = diagnostics[diagnostics.length - 1];
    const now = Date.now();
    return {
      last,
      total: diagnostics.length,
      lastMinute: diagnostics.filter(d => d.timestamp && now - d.timestamp < 60_000).length,
    };
  }, [diagnostics]);

  const Toggle = ({ label, val, onChange, hint, disabled }: { label: string; val: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) => (
    <label className={`flex items-start justify-between py-1 gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <input type="checkbox" disabled={disabled} checked={val} onChange={e => onChange(e.target.checked)} className="w-5 h-5 accent-[var(--section)] mt-0.5" />
    </label>
  );

  const persistGroqKey = (key: string) => {
    window.localStorage.setItem(GROQ_KEY_STORAGE, key);
    setHasSavedGroqKey(true);
    setGroqKeyDraft("");
    upd({ aiProvider: "groq", groqKeyMode: "local", groqUserKeySaved: true });
  };

  const persistGeminiKey = (key: string) => {
    window.localStorage.setItem(GEMINI_KEY_STORAGE, key);
    setHasSavedGeminiKey(true);
    setGeminiKeyDraft("");
    upd({ geminiKeyMode: "local", geminiUserKeySaved: true });
  };

  const saveGroqKey = () => {
    const key = groqKeyDraft.trim();
    if (!key) {
      setGroqStatus("failed");
      setGroqStatusText("Enter a Groq API key first.");
      return;
    }
    persistGroqKey(key);
    setGroqStatus("not_configured");
    setGroqStatusText("Saved Groq key configured. Raw key is hidden after saving.");
  };

  const saveGeminiKey = () => {
    const key = geminiKeyDraft.trim();
    if (!key) {
      setGeminiStatus("failed");
      setGeminiStatusText("Enter a Gemini API key first.");
      return;
    }
    persistGeminiKey(key);
    setGeminiStatus("not_configured");
    setGeminiStatusText("Saved Gemini key configured. Raw key is hidden after saving.");
  };

  const clearGroqKey = () => {
    window.localStorage.removeItem(GROQ_KEY_STORAGE);
    setHasSavedGroqKey(false);
    setGroqKeyDraft("");
    upd({ groqUserKeySaved: false });
    setGroqStatus("not_configured");
    setGroqStatusText("Saved Groq key cleared.");
  };

  const clearGeminiKey = () => {
    window.localStorage.removeItem(GEMINI_KEY_STORAGE);
    setHasSavedGeminiKey(false);
    setGeminiKeyDraft("");
    upd({ geminiUserKeySaved: false });
    setGeminiStatus("not_configured");
    setGeminiStatusText("Saved Gemini key cleared.");
  };

  const runConnectionTest = async (provider: "groq" | "gemini") => {
    if (provider === "groq") {
      setGroqStatus("testing");
      setGroqStatusText("Testing Groq connection...");
    } else {
      setGeminiStatus("testing");
      setGeminiStatusText("Testing Gemini connection...");
    }
    const draftGroqKey = groqKeyDraft.trim();
    const draftGeminiKey = geminiKeyDraft.trim();
    const savedGroqKey = readSavedKey(GROQ_KEY_STORAGE);
    const savedGeminiKey = readSavedKey(GEMINI_KEY_STORAGE);
    try {
      const result = await testConnection({ data: {
        provider,
        ...(provider === "groq"
          ? { groqModel, userGroqApiKey: draftGroqKey || savedGroqKey || undefined }
          : { geminiModel, userGeminiApiKey: draftGeminiKey || savedGeminiKey || undefined }),
      } }) as ConnectionResult;
      if (result.ok) {
        if (provider === "groq") {
          if (draftGroqKey) persistGroqKey(draftGroqKey);
          setGroqStatus("connected");
          setGroqStatusText(`Connected via Groq ${result.keySource ? `(${result.keySource})` : ""}${result.model ? ` using ${modelLabel(result.model)}` : ""}.`);
        } else {
          if (draftGeminiKey) persistGeminiKey(draftGeminiKey);
          setGeminiStatus("connected");
          setGeminiStatusText(`Connected via Gemini ${result.keySource ? `(${result.keySource})` : ""}${result.model ? ` using ${modelLabel(result.model)}` : ""}.`);
        }
      } else if (provider === "groq") {
        setGroqStatus(result.status === "not_configured" ? "not_configured" : "failed");
        setGroqStatusText(result.error || "Groq connection failed.");
      } else {
        setGeminiStatus(result.status === "not_configured" ? "not_configured" : "failed");
        setGeminiStatusText(result.error || "Gemini connection failed.");
      }
    } catch {
      if (provider === "groq") {
        setGroqStatus("failed");
        setGroqStatusText("Groq connection test failed.");
      } else {
        setGeminiStatus("failed");
        setGeminiStatusText("Gemini connection test failed.");
      }
    }
  };

  const StatusLine = ({ status, text }: { status: ConnectionStatus; text: string }) => {
    const StatusIcon = status === "testing" ? Loader2 : status === "connected" ? CheckCircle2 : status === "failed" ? XCircle : KeyRound;
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><StatusIcon size={14} className={status === "testing" ? "animate-spin" : ""} /><span className="capitalize">{status.replace("_", " ")}</span><span>-</span><span>{text}</span></div>;
  };

  return (
    <section>
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Sparkles size={16} />Jarvis AI</h3>
      <Card className="space-y-4">
        <Toggle label="Jarvis enabled" val={s.enabled} onChange={v => upd({ enabled: v })} />

        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">AI provider</p>
          <Toggle
            label="Allow cloud text AI"
            val={s.allowCloudText === true}
            onChange={v => upd({ allowCloudText: v })}
            hint="Sends your message and recent user messages to the selected provider. Those messages may include personal fitness or nutrition details."
          />
          <p className="text-xs text-muted-foreground">Use keys from free-tier projects. Saved keys stay in this browser's storage and scripts running on this site can read them. FitCore forwards the key to its provider when making a request. Clear a saved key here at any time.</p>
          {(s.groqKeyMode === "environment" || s.geminiKeyMode === "environment") && (
            <p className="text-xs text-muted-foreground">Shared keys are disabled. Save a personal provider key to switch that provider to local key mode.</p>
          )}
          <div>
            <Label>Provider</Label>
            <Select value={s.aiProvider ?? "groq"} onChange={e => upd({ aiProvider: e.target.value as JarvisSettings["aiProvider"] })}>
              <option value="groq">Groq - recommended/default</option>
              <option value="gemini">Gemini - backup</option>
              {s.aiProvider === "legacy-lovable" && <option disabled value="legacy-lovable">Shared access unavailable</option>}
            </Select>
          </div>

          <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-3">
            <p className="text-sm font-semibold">Groq main provider</p>
            <div>
              <Label>Groq model</Label>
              <Select value={groqModel} onChange={e => upd({ groqModel: e.target.value as JarvisSettings["groqModel"] })}>
                {GROQ_MODELS.map(model => <option key={model} value={model}>{modelLabel(model)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Groq API key</Label>
              <Input type="password" autoComplete="off" value={groqKeyDraft} onChange={e => setGroqKeyDraft(e.target.value)} placeholder={(hasSavedGroqKey || s.groqUserKeySaved) ? "Saved Groq key configured" : "Paste Groq API key"} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <PrimaryButton type="button" onClick={saveGroqKey} disabled={!groqKeyDraft.trim()}>Save key</PrimaryButton>
              <GhostButton type="button" onClick={clearGroqKey}>Clear key</GhostButton>
              <GhostButton type="button" onClick={() => runConnectionTest("groq")} disabled={groqStatus === "testing" || (!hasSavedGroqKey && !groqKeyDraft.trim())}>{groqStatus === "testing" ? <Loader2 size={14} className="animate-spin" /> : null}Test</GhostButton>
            </div>
            <StatusLine status={groqStatus} text={groqStatusText} />
            <Toggle label="Auto model routing" val={s.autoModelRouting !== false} onChange={v => upd({ autoModelRouting: v })} hint="Uses Qwen 3.8 for requests with tools." />
            <Toggle label="Auto fallback when model fails" val={s.autoAiFallback === true} onChange={v => upd({ autoAiFallback: v })} hint="Allows one attempt with a second Groq model." />
            <Toggle label="Allow Gemini fallback" val={Boolean(s.allowGeminiFallback)} onChange={v => upd({ allowGeminiFallback: v })} hint="Allows a second request to Google Gemini with the same text after an eligible Groq error." />
          </div>

          <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-3">
            <p className="text-sm font-semibold">Gemini backup</p>
            <p className="text-xs text-muted-foreground">Gemini is kept for backup text, image-food estimation, and future multimodal features. Free quota can be limited.</p>
            <p className="text-xs text-muted-foreground">{modelLabel(geminiModel)}</p>
            <div>
              <Label>Gemini API key</Label>
              <Input type="password" autoComplete="off" value={geminiKeyDraft} onChange={e => setGeminiKeyDraft(e.target.value)} placeholder={(hasSavedGeminiKey || s.geminiUserKeySaved) ? "Saved Gemini key configured" : "Paste Gemini API key"} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <PrimaryButton type="button" onClick={saveGeminiKey} disabled={!geminiKeyDraft.trim()}>Save key</PrimaryButton>
              <GhostButton type="button" onClick={clearGeminiKey}>Clear key</GhostButton>
              <GhostButton type="button" onClick={() => runConnectionTest("gemini")} disabled={geminiStatus === "testing" || (!hasSavedGeminiKey && !geminiKeyDraft.trim())}>{geminiStatus === "testing" ? <Loader2 size={14} className="animate-spin" /> : null}Test</GhostButton>
            </div>
            <StatusLine status={geminiStatus} text={geminiStatusText} />
          </div>

        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Model diagnostics</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Current provider</span><span>{s.aiProvider ?? "groq"}</span>
            <span>Selected model</span><span>{modelLabel((s.aiProvider ?? "groq") === "gemini" ? geminiModel : groqModel)}</span>
            <span>Actual last model</span><span>{modelLabel(diagSummary.last?.actualModel)}</span>
            <span>Auto-routed</span><span>{diagSummary.last?.routed ? "yes" : "no"}</span>
            <span>Fallback</span><span>{diagSummary.last?.fallback ? "yes" : "no"}</span>
            <span>Fallback reason</span><span>{diagSummary.last?.fallbackReason ?? "none"}</span>
            <span>AI calls this session</span><span>{diagSummary.total}</span>
            <span>AI calls last minute</span><span>{diagSummary.lastMinute}</span>
            <span>Last call type</span><span>{diagSummary.last?.callType ?? "none"}</span>
            <span>Last status/error</span><span>{diagSummary.last?.status ?? diagSummary.last?.errorCategory ?? "none"}</span>
            <span>Last request</span><span>{diagSummary.last?.provider ?? "none"} / {modelLabel(diagSummary.last?.actualModel)}</span>
            <span>Last input size</span><span>{diagSummary.last?.inputSize ?? 0}</span>
            <span>Tools/messages sent</span><span>{diagSummary.last?.toolsSent ?? 0} / {diagSummary.last?.messagesSent ?? 0}</span>
            <span>Retry/fallback count</span><span>{diagSummary.last?.retryCount ?? 0} / {diagSummary.last?.fallbackCount ?? 0}</span>
          </div>
        </div>

        <div>
          <Label>Action permission</Label>
          <Select value={s.permission < 2 ? "1" : "2"} onChange={e => upd({ permission: e.target.value === "1" ? 1 : 2 })}>
            <option value="1">Read only</option>
            <option value="2">Review changes before saving</option>
          </Select>
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
