import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Sparkles, XCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { jarvisProviderKeys } from "@/lib/jarvis/provider-keys";
import { useStore } from "@/lib/store";
import type { JarvisSettings } from "@/lib/types";
import { testAiConnection } from "@/lib/ai.functions";
import { GEMINI_MODELS, GROQ_MODELS, selectedGroqModel } from "@/lib/jarvis/provider-models";
import { Card, GhostButton, Input, Label, PrimaryButton, Select } from "../ui";

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
    const groqKey = jarvisProviderKeys.read("groq");
    const geminiKey = jarvisProviderKeys.read("gemini");
    setHasSavedGroqKey(Boolean(groqKey.key));
    setHasSavedGeminiKey(Boolean(geminiKey.key));
    setDiagnostics(readDiagnostics());
    const patch: Partial<JarvisSettings> = {};
    if (groqKey.source === "saved" && !s.groqUserKeySaved) patch.groqUserKeySaved = true;
    if (geminiKey.source === "saved" && !s.geminiUserKeySaved) patch.geminiUserKeySaved = true;
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
      setGroqStatusText(hasSavedGroqKey ? (jarvisProviderKeys.read("groq").source === "temporary" ? "Key available until this page reloads." : "Saved Groq key configured. Test connection when ready.") : "Jarvis needs a Groq API key. Add one in Jarvis AI Settings.");
    }
    if (geminiStatus !== "connected") {
      setGeminiStatus("not_configured");
      setGeminiStatusText(hasSavedGeminiKey ? (jarvisProviderKeys.read("gemini").source === "temporary" ? "Key available until this page reloads." : "Saved Gemini backup key configured. Test connection when ready.") : "Gemini backup is not configured.");
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

  const configureKey = (provider: "groq" | "gemini", remember: boolean) => {
    const groq = provider === "groq";
    const key = groq ? groqKeyDraft : geminiKeyDraft;
    const configured = remember ? jarvisProviderKeys.save(provider, key) : jarvisProviderKeys.useTemporary(provider, key);
    const status = groq ? setGroqStatus : setGeminiStatus;
    const message = groq ? setGroqStatusText : setGeminiStatusText;
    if (!configured) {
      status("failed");
      message("Browser storage is unavailable. Try using the key until reload.");
      return;
    }

    const settingsSaved = upd(groq
      ? { aiProvider: "groq", groqKeyMode: "local", ...(remember ? { groqUserKeySaved: true } : {}) }
      : { geminiKeyMode: "local", ...(remember ? { geminiUserKeySaved: true } : {}) });
    (groq ? setHasSavedGroqKey : setHasSavedGeminiKey)(true);
    (groq ? setGroqKeyDraft : setGeminiKeyDraft)("");
    status(settingsSaved ? "not_configured" : "failed");
    message(settingsSaved
      ? remember ? "Key saved in browser storage." : "Key available until this page reloads."
      : "The key is available, but FitCore could not save the provider settings.");
  };

  const clearKey = (provider: "groq" | "gemini") => {
    const groq = provider === "groq";
    const ok = jarvisProviderKeys.clear(provider);
    (groq ? setHasSavedGroqKey : setHasSavedGeminiKey)(false);
    (groq ? setGroqKeyDraft : setGeminiKeyDraft)("");
    if (ok) upd(groq ? { groqUserKeySaved: false } : { geminiUserKeySaved: false });
    (groq ? setGroqStatus : setGeminiStatus)(ok ? "not_configured" : "failed");
    (groq ? setGroqStatusText : setGeminiStatusText)(ok ? "Provider key cleared." : "Browser storage could not be cleared.");
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
    const savedGroqKey = jarvisProviderKeys.read("groq").key;
    const savedGeminiKey = jarvisProviderKeys.read("gemini").key;
    try {
      const result = await testConnection({ data: {
        provider,
        ...(provider === "groq"
          ? { groqModel, userGroqApiKey: draftGroqKey || savedGroqKey || undefined }
          : { geminiModel, userGeminiApiKey: draftGeminiKey || savedGeminiKey || undefined }),
      } }) as ConnectionResult;
      if (result.ok) {
        if (provider === "groq") {
          setGroqStatus("connected");
          setGroqStatusText(`Connected via Groq ${result.keySource ? `(${result.keySource})` : ""}${result.model ? ` using ${modelLabel(result.model)}` : ""}.`);
        } else {
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
          <p className="text-xs text-muted-foreground">Use keys from free-tier projects. A temporary key stays in this page's memory until reload. Remembering a key stores it in this browser. Scripts on this site can read browser-stored keys. FitCore forwards the key to its provider when making a request.</p>
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
              <Input type="password" autoComplete="off" value={groqKeyDraft} onChange={e => setGroqKeyDraft(e.target.value)} aria-label="Groq API key" placeholder={hasSavedGroqKey ? "Groq key ready" : "Paste Groq API key"} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PrimaryButton type="button" onClick={() => configureKey("groq", false)} disabled={!groqKeyDraft.trim()}>Use until reload</PrimaryButton>
              <GhostButton type="button" onClick={() => configureKey("groq", true)} disabled={!groqKeyDraft.trim()}>Remember key</GhostButton>
              <GhostButton type="button" onClick={() => clearKey("groq")}>Clear key</GhostButton>
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
              <Input type="password" autoComplete="off" value={geminiKeyDraft} onChange={e => setGeminiKeyDraft(e.target.value)} aria-label="Gemini API key" placeholder={hasSavedGeminiKey ? "Gemini key ready" : "Paste Gemini API key"} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PrimaryButton type="button" onClick={() => configureKey("gemini", false)} disabled={!geminiKeyDraft.trim()}>Use until reload</PrimaryButton>
              <GhostButton type="button" onClick={() => configureKey("gemini", true)} disabled={!geminiKeyDraft.trim()}>Remember key</GhostButton>
              <GhostButton type="button" onClick={() => clearKey("gemini")}>Clear key</GhostButton>
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
