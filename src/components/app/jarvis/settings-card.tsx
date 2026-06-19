import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import type { GroqModel, JarvisSettings } from "@/lib/types";
import { testAiConnection } from "@/lib/ai.functions";
import { Card, GhostButton, Input, Label, PrimaryButton, Select } from "../ui";

const GEMINI_KEY_STORAGE = "fitcore.jarvis.geminiApiKey.v1";
const GROQ_KEY_STORAGE = "fitcore.jarvis.groqApiKey.v1";
const AI_DIAGNOSTICS_STORAGE = "fitcore.jarvis.aiDiagnostics.v1";
const VOICE_DIAGNOSTICS_STORAGE = "fitcore.jarvis.voiceDiagnostics.v1";
const WORKING_GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
] as const;
const WORKING_GROQ_MODELS = [
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
] as const;
type ConnectionStatus = "not_configured" | "testing" | "connected" | "failed";
type ConnectionResult = {
  ok: boolean;
  status: ConnectionStatus;
  provider?: string;
  keySource?: string;
  model?: string;
  error?: string;
};
type VoiceDiagnostics = {
  voiceTurnsThisSession?: number;
  aiCallsThisSession?: number;
  lastTranscript?: string;
  lastProviderModel?: string;
  autoRouting?: boolean;
  fallback?: boolean;
  duplicateTranscriptPrevented?: boolean;
  transcriptStorage?: string;
  transcriptRetention?: string;
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

function normalizedKeyMode(
  mode: JarvisSettings["geminiKeyMode"],
): "local" | "environment" {
  return mode === "environment" ? "environment" : "local";
}

function selectedGeminiModel(model: unknown): JarvisSettings["geminiModel"] {
  return WORKING_GEMINI_MODELS.includes(model as JarvisSettings["geminiModel"])
    ? (model as JarvisSettings["geminiModel"])
    : "gemini-2.5-flash-lite";
}

function selectedGroqModel(model: unknown): GroqModel {
  return WORKING_GROQ_MODELS.includes(model as GroqModel)
    ? (model as GroqModel)
    : "qwen/qwen3-32b";
}

function readDiagnostics(): AiDiagnostics[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AI_DIAGNOSTICS_STORAGE);
    return raw
      ? ((JSON.parse(raw) as { calls?: AiDiagnostics[] }).calls ?? [])
      : [];
  } catch {
    return [];
  }
}

function readVoiceDiagnostics(): VoiceDiagnostics {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      window.localStorage.getItem(VOICE_DIAGNOSTICS_STORAGE) ?? "{}",
    ) as VoiceDiagnostics;
  } catch {
    return {};
  }
}

function modelLabel(model?: string) {
  if (model === "llama-3.1-8b-instant") return "Groq Llama 3.1 8B Instant";
  if (model === "llama-3.3-70b-versatile")
    return "Groq Llama 3.3 70B Versatile";
  if (model === "qwen/qwen3-32b") return "Groq Qwen 3 32B";
  if (model === "gemini-2.5-flash-lite") return "Gemini 2.5 Flash-Lite";
  if (model === "gemini-2.5-flash") return "Gemini 2.5 Flash";
  return model ?? "None";
}

export function JarvisSettingsCard() {
  const { state, set } = useStore();
  const s = state.jarvisSettings;
  const upd = (p: Partial<JarvisSettings>) =>
    set((st) => ({ ...st, jarvisSettings: { ...st.jarvisSettings, ...p } }));
  const testConnection = useServerFn(testAiConnection);
  const [groqKeyDraft, setGroqKeyDraft] = useState("");
  const [geminiKeyDraft, setGeminiKeyDraft] = useState("");
  const [groqStatus, setGroqStatus] =
    useState<ConnectionStatus>("not_configured");
  const [geminiStatus, setGeminiStatus] =
    useState<ConnectionStatus>("not_configured");
  const [legacyStatus, setLegacyStatus] =
    useState<ConnectionStatus>("not_configured");
  const [groqStatusText, setGroqStatusText] = useState("Not configured");
  const [geminiStatusText, setGeminiStatusText] = useState("Not configured");
  const [legacyStatusText, setLegacyStatusText] = useState(
    "Legacy provider uses LOVABLE_API_KEY on the server.",
  );
  const [hasSavedGroqKey, setHasSavedGroqKey] = useState(false);
  const [hasSavedGeminiKey, setHasSavedGeminiKey] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AiDiagnostics[]>([]);
  const [voiceDiagnostics, setVoiceDiagnostics] = useState<VoiceDiagnostics>(
    {},
  );
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>(
    [],
  );
  const groqKeyMode = normalizedKeyMode(s.groqKeyMode);
  const geminiKeyMode = normalizedKeyMode(s.geminiKeyMode);
  const groqModel = selectedGroqModel(s.groqModel);
  const geminiModel = selectedGeminiModel(s.geminiModel);

  useEffect(() => {
    const groqSaved = Boolean(readSavedKey(GROQ_KEY_STORAGE));
    const geminiSaved = Boolean(readSavedKey(GEMINI_KEY_STORAGE));
    setHasSavedGroqKey(groqSaved);
    setHasSavedGeminiKey(geminiSaved);
    setDiagnostics(readDiagnostics());
    setVoiceDiagnostics(readVoiceDiagnostics());
    const patch: Partial<JarvisSettings> = {};
    if (groqSaved && !s.groqUserKeySaved) patch.groqUserKeySaved = true;
    if (geminiSaved && !s.geminiUserKeySaved) patch.geminiUserKeySaved = true;
    if (s.groqKeyMode === "user") patch.groqKeyMode = "local";
    if (s.geminiKeyMode === "user") patch.geminiKeyMode = "local";
    if (s.groqModel !== groqModel) patch.groqModel = groqModel;
    if (s.geminiModel !== geminiModel) patch.geminiModel = geminiModel;
    if (!s.groqModel) patch.aiProvider = "groq";
    if (s.autoModelRouting === undefined) patch.autoModelRouting = true;
    if (s.autoAiFallback === undefined) patch.autoAiFallback = true;
    if (s.allowGeminiFallback === undefined) patch.allowGeminiFallback = false;
    if (s.voiceInputEnabled === undefined)
      patch.voiceInputEnabled =
        typeof window !== "undefined" &&
        Boolean(
          "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
        );
    if (s.spokenResponses === undefined) patch.spokenResponses = true;
    if (s.autoListenAfterReply === undefined) patch.autoListenAfterReply = true;
    if (s.confirmTranscriptBeforeSend === undefined)
      patch.confirmTranscriptBeforeSend = false;
    if (s.voiceSilenceDelayMs === undefined) patch.voiceSilenceDelayMs = 1200;
    if (s.voiceOutputMuted === undefined) patch.voiceOutputMuted = false;
    if (s.voiceName === undefined) patch.voiceName = "";
    if (s.voiceRateMode === undefined) patch.voiceRateMode = "normal";
    if (s.voiceResponseLength === undefined)
      patch.voiceResponseLength = "normal";
    if (s.saveVoiceTranscripts === undefined) patch.saveVoiceTranscripts = true;
    if (s.voiceTranscriptRetentionDays === undefined)
      patch.voiceTranscriptRetentionDays = 30;
    if (s.voiceHaptics === undefined) patch.voiceHaptics = true;
    if (s.voiceKeepAwake === undefined) patch.voiceKeepAwake = true;
    if (Object.keys(patch).length > 0) upd(patch);
    // This is a one-time migration of persisted settings; rerunning it would reset live status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () =>
      setBrowserVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    const h = () => {
      setDiagnostics(readDiagnostics());
      setVoiceDiagnostics(readVoiceDiagnostics());
    };
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
      setGroqStatusText(
        hasSavedGroqKey || s.groqUserKeySaved
          ? "Saved Groq key configured. Test connection when ready."
          : "Jarvis needs a Groq API key. Add one in Jarvis AI Settings.",
      );
    }
    if (geminiStatus !== "connected") {
      setGeminiStatus("not_configured");
      setGeminiStatusText(
        hasSavedGeminiKey || s.geminiUserKeySaved
          ? "Saved Gemini backup key configured. Test connection when ready."
          : "Gemini backup is not configured.",
      );
    }
    // Status values are intentionally excluded so this reset effect does not loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasSavedGroqKey,
    hasSavedGeminiKey,
    s.groqUserKeySaved,
    s.geminiUserKeySaved,
  ]);

  const diagSummary = useMemo(() => {
    const last = diagnostics[diagnostics.length - 1];
    const now = Date.now();
    return {
      last,
      total: diagnostics.length,
      lastMinute: diagnostics.filter(
        (d) => d.timestamp && now - d.timestamp < 60_000,
      ).length,
    };
  }, [diagnostics]);

  const Toggle = ({
    label,
    val,
    onChange,
    hint,
    disabled,
  }: {
    label: string;
    val: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
    disabled?: boolean;
  }) => (
    <label
      className={`flex items-start justify-between py-1 gap-3 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <input
        type="checkbox"
        disabled={disabled}
        checked={val}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-[var(--section)] mt-0.5"
      />
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
    setGroqStatusText(
      "Saved Groq key configured. Raw key is hidden after saving.",
    );
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
    setGeminiStatusText(
      "Saved Gemini key configured. Raw key is hidden after saving.",
    );
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

  const runConnectionTest = async (provider: JarvisSettings["aiProvider"]) => {
    if (provider === "groq") {
      setGroqStatus("testing");
      setGroqStatusText("Testing Groq connection...");
    } else if (provider === "gemini") {
      setGeminiStatus("testing");
      setGeminiStatusText("Testing Gemini connection...");
    } else {
      setLegacyStatus("testing");
      setLegacyStatusText("Testing legacy connection...");
    }
    const draftGroqKey = groqKeyDraft.trim();
    const draftGeminiKey = geminiKeyDraft.trim();
    const savedGroqKey = readSavedKey(GROQ_KEY_STORAGE);
    const savedGeminiKey = readSavedKey(GEMINI_KEY_STORAGE);
    try {
      const result = (await testConnection({
        data: {
          provider,
          groqKeyMode,
          groqModel,
          userGroqApiKey: draftGroqKey || savedGroqKey || undefined,
          geminiKeyMode,
          geminiModel,
          userGeminiApiKey: draftGeminiKey || savedGeminiKey || undefined,
        },
      })) as ConnectionResult;
      if (result.ok) {
        if (provider === "groq") {
          if (draftGroqKey) persistGroqKey(draftGroqKey);
          setGroqStatus("connected");
          setGroqStatusText(
            `Connected via Groq ${result.keySource ? `(${result.keySource})` : ""}${result.model ? ` using ${modelLabel(result.model)}` : ""}.`,
          );
        } else if (provider === "gemini") {
          if (draftGeminiKey) persistGeminiKey(draftGeminiKey);
          setGeminiStatus("connected");
          setGeminiStatusText(
            `Connected via Gemini ${result.keySource ? `(${result.keySource})` : ""}${result.model ? ` using ${modelLabel(result.model)}` : ""}.`,
          );
        } else {
          setLegacyStatus("connected");
          setLegacyStatusText("Connected to legacy provider.");
        }
      } else if (provider === "groq") {
        setGroqStatus(
          result.status === "not_configured" ? "not_configured" : "failed",
        );
        setGroqStatusText(result.error || "Groq connection failed.");
      } else if (provider === "gemini") {
        setGeminiStatus(
          result.status === "not_configured" ? "not_configured" : "failed",
        );
        setGeminiStatusText(result.error || "Gemini connection failed.");
      } else {
        setLegacyStatus(
          result.status === "not_configured" ? "not_configured" : "failed",
        );
        setLegacyStatusText(result.error || "Legacy connection failed.");
      }
    } catch {
      if (provider === "groq") {
        setGroqStatus("failed");
        setGroqStatusText("Groq connection test failed.");
      } else if (provider === "gemini") {
        setGeminiStatus("failed");
        setGeminiStatusText("Gemini connection test failed.");
      } else {
        setLegacyStatus("failed");
        setLegacyStatusText("Legacy connection test failed.");
      }
    }
  };

  const StatusLine = ({
    status,
    text,
  }: {
    status: ConnectionStatus;
    text: string;
  }) => {
    const StatusIcon =
      status === "testing"
        ? Loader2
        : status === "connected"
          ? CheckCircle2
          : status === "failed"
            ? XCircle
            : KeyRound;
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <StatusIcon
          size={14}
          className={status === "testing" ? "animate-spin" : ""}
        />
        <span className="capitalize">{status.replace("_", " ")}</span>
        <span>-</span>
        <span>{text}</span>
      </div>
    );
  };

  return (
    <section>
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <Sparkles size={16} />
        Jarvis AI
      </h3>
      <Card className="space-y-4">
        <Toggle
          label="Jarvis enabled"
          val={s.enabled}
          onChange={(v) => upd({ enabled: v })}
        />

        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            AI provider
          </p>
          <div>
            <Label>Provider</Label>
            <Select
              value={s.aiProvider ?? "groq"}
              onChange={(e) =>
                upd({
                  aiProvider: e.target.value as JarvisSettings["aiProvider"],
                })
              }
            >
              <option value="groq">Groq - recommended/default</option>
              <option value="gemini">Gemini - backup</option>
              <option value="legacy-lovable">Legacy/Lovable fallback</option>
            </Select>
          </div>

          <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-3">
            <p className="text-sm font-semibold">Groq main provider</p>
            <div>
              <Label>Groq model</Label>
              <Select
                value={groqModel}
                onChange={(e) =>
                  upd({
                    groqModel: e.target.value as JarvisSettings["groqModel"],
                  })
                }
              >
                <option value="qwen/qwen3-32b">
                  Groq Qwen 3 32B - reliable tool calling/default
                </option>
                <option value="llama-3.1-8b-instant">
                  Groq Llama 3.1 8B Instant - fast chat
                </option>
                <option value="llama-3.3-70b-versatile">
                  Groq Llama 3.3 70B Versatile - stronger reasoning
                </option>
              </Select>
            </div>
            <div>
              <Label>Groq key source</Label>
              <Select
                value={groqKeyMode}
                onChange={(e) =>
                  upd({
                    groqKeyMode: e.target
                      .value as JarvisSettings["groqKeyMode"],
                  })
                }
              >
                <option value="local">Use saved local key first</option>
                <option value="environment">Use GROQ_API_KEY first</option>
              </Select>
            </div>
            <div>
              <Label>Groq API key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={groqKeyDraft}
                onChange={(e) => setGroqKeyDraft(e.target.value)}
                placeholder={
                  hasSavedGroqKey || s.groqUserKeySaved
                    ? "Saved Groq key configured"
                    : "Paste Groq API key"
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                For personal/local use only. Do not commit API keys.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <PrimaryButton
                type="button"
                onClick={saveGroqKey}
                disabled={!groqKeyDraft.trim()}
              >
                Save key
              </PrimaryButton>
              <GhostButton type="button" onClick={clearGroqKey}>
                Clear key
              </GhostButton>
              <GhostButton
                type="button"
                onClick={() => runConnectionTest("groq")}
                disabled={groqStatus === "testing"}
              >
                {groqStatus === "testing" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Test
              </GhostButton>
            </div>
            <StatusLine status={groqStatus} text={groqStatusText} />
            <Toggle
              label="Auto model routing"
              val={s.autoModelRouting !== false}
              onChange={(v) => upd({ autoModelRouting: v })}
              hint="Uses Qwen for reliable tool calls, with Llama models available for fallback and reasoning."
            />
            <Toggle
              label="Auto fallback when model fails"
              val={s.autoAiFallback !== false}
              onChange={(v) => upd({ autoAiFallback: v })}
              hint="Fallback happens before any app mutation runs."
            />
            <Toggle
              label="Allow Gemini fallback"
              val={Boolean(s.allowGeminiFallback)}
              onChange={(v) => upd({ allowGeminiFallback: v })}
              hint="Off by default to avoid silently using low Gemini quota."
            />
          </div>

          <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-3">
            <p className="text-sm font-semibold">Gemini backup</p>
            <p className="text-xs text-muted-foreground">
              Gemini is kept for backup text, image-food estimation, and future
              multimodal features. Free quota can be limited.
            </p>
            <div>
              <Label>Gemini model</Label>
              <Select
                value={geminiModel}
                onChange={(e) =>
                  upd({
                    geminiModel: e.target
                      .value as JarvisSettings["geminiModel"],
                  })
                }
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-lite">
                  Gemini 2.5 Flash-Lite - low free daily quota for this project
                </option>
              </Select>
            </div>
            <div>
              <Label>Gemini key source</Label>
              <Select
                value={geminiKeyMode}
                onChange={(e) =>
                  upd({
                    geminiKeyMode: e.target
                      .value as JarvisSettings["geminiKeyMode"],
                  })
                }
              >
                <option value="local">Use saved local key first</option>
                <option value="environment">
                  Use GEMINI_API_KEY or GOOGLE_API_KEY first
                </option>
              </Select>
            </div>
            <div>
              <Label>Gemini API key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={geminiKeyDraft}
                onChange={(e) => setGeminiKeyDraft(e.target.value)}
                placeholder={
                  hasSavedGeminiKey || s.geminiUserKeySaved
                    ? "Saved Gemini key configured"
                    : "Paste Gemini API key"
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <PrimaryButton
                type="button"
                onClick={saveGeminiKey}
                disabled={!geminiKeyDraft.trim()}
              >
                Save key
              </PrimaryButton>
              <GhostButton type="button" onClick={clearGeminiKey}>
                Clear key
              </GhostButton>
              <GhostButton
                type="button"
                onClick={() => runConnectionTest("gemini")}
                disabled={geminiStatus === "testing"}
              >
                {geminiStatus === "testing" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Test
              </GhostButton>
            </div>
            <StatusLine status={geminiStatus} text={geminiStatusText} />
          </div>

          {s.aiProvider === "legacy-lovable" && (
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-2">
              <p className="text-sm font-medium">Legacy/Lovable fallback</p>
              <p className="text-xs text-muted-foreground">
                Uses server-side LOVABLE_API_KEY only. Keep this as fallback
                only.
              </p>
              <GhostButton
                type="button"
                onClick={() => runConnectionTest("legacy-lovable")}
                disabled={legacyStatus === "testing"}
              >
                {legacyStatus === "testing" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Test legacy connection
              </GhostButton>
              <StatusLine status={legacyStatus} text={legacyStatusText} />
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Model diagnostics
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Current provider</span>
            <span>{s.aiProvider ?? "groq"}</span>
            <span>Selected model</span>
            <span>
              {modelLabel(
                (s.aiProvider ?? "groq") === "gemini" ? geminiModel : groqModel,
              )}
            </span>
            <span>Actual last model</span>
            <span>{modelLabel(diagSummary.last?.actualModel)}</span>
            <span>Auto-routed</span>
            <span>{diagSummary.last?.routed ? "yes" : "no"}</span>
            <span>Fallback</span>
            <span>{diagSummary.last?.fallback ? "yes" : "no"}</span>
            <span>Fallback reason</span>
            <span>{diagSummary.last?.fallbackReason ?? "none"}</span>
            <span>AI calls this session</span>
            <span>{diagSummary.total}</span>
            <span>AI calls last minute</span>
            <span>{diagSummary.lastMinute}</span>
            <span>Last call type</span>
            <span>{diagSummary.last?.callType ?? "none"}</span>
            <span>Last status/error</span>
            <span>
              {diagSummary.last?.status ??
                diagSummary.last?.errorCategory ??
                "none"}
            </span>
            <span>Last request</span>
            <span>
              {diagSummary.last?.provider ?? "none"} /{" "}
              {modelLabel(diagSummary.last?.actualModel)}
            </span>
            <span>Last input size</span>
            <span>{diagSummary.last?.inputSize ?? 0}</span>
            <span>Tools/messages sent</span>
            <span>
              {diagSummary.last?.toolsSent ?? 0} /{" "}
              {diagSummary.last?.messagesSent ?? 0}
            </span>
            <span>Retry/fallback count</span>
            <span>
              {diagSummary.last?.retryCount ?? 0} /{" "}
              {diagSummary.last?.fallbackCount ?? 0}
            </span>
            <span>Model cooldowns</span>
            <span>
              {diagSummary.last?.fallbackReason
                ? `${diagSummary.last.fallbackReason} on prior model`
                : "none visible"}
            </span>
            <span>Voice turns this session</span>
            <span>{voiceDiagnostics.voiceTurnsThisSession ?? 0}</span>
            <span>Voice AI calls this session</span>
            <span>{voiceDiagnostics.aiCallsThisSession ?? 0}</span>
            <span>Last voice transcript</span>
            <span className="truncate">
              {voiceDiagnostics.lastTranscript ?? "none"}
            </span>
            <span>Last voice provider/model</span>
            <span>{modelLabel(voiceDiagnostics.lastProviderModel)}</span>
            <span>Voice auto-routing / fallback</span>
            <span>
              {voiceDiagnostics.autoRouting ? "yes" : "no"} /{" "}
              {voiceDiagnostics.fallback ? "yes" : "no"}
            </span>
            <span>Duplicate voice transcript blocked</span>
            <span>
              {voiceDiagnostics.duplicateTranscriptPrevented ? "yes" : "no"}
            </span>
            <span>Transcript storage</span>
            <span>
              {voiceDiagnostics.transcriptStorage ??
                (s.saveVoiceTranscripts === false ? "off" : "on")}
            </span>
            <span>Transcript retention</span>
            <span>
              {voiceDiagnostics.transcriptRetention ??
                (s.voiceTranscriptRetentionDays === 0
                  ? "forever"
                  : `${s.voiceTranscriptRetentionDays ?? 30} days`)}
            </span>
          </div>
        </div>

        <div>
          <Label>Permission level</Label>
          <Select
            value={String(s.permission)}
            onChange={(e) =>
              upd({
                permission: Number(
                  e.target.value,
                ) as JarvisSettings["permission"],
              })
            }
          >
            <option value="1">L1 - Suggest only</option>
            <option value="2">L2 - Draft & confirm</option>
            <option value="3">L3 - Auto-log simple items</option>
            <option value="4">L4 - Full app control (with undo)</option>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            L3 and L4 auto-save clear bodyweight / supplements; uncertain items
            still ask.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Response style</Label>
            <Select
              value={s.responseStyle}
              onChange={(e) =>
                upd({
                  responseStyle: e.target
                    .value as JarvisSettings["responseStyle"],
                })
              }
            >
              <option value="concise">Concise</option>
              <option value="normal">Normal</option>
              <option value="detailed">Detailed</option>
            </Select>
          </div>
          <div>
            <Label>Personality</Label>
            <Select
              value={s.personality}
              onChange={(e) =>
                upd({
                  personality: e.target.value as JarvisSettings["personality"],
                })
              }
            >
              <option value="friendly">Friendly</option>
              <option value="coach">Coach</option>
              <option value="siri">Siri-style</option>
              <option value="chatgpt">ChatGPT-style</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>Proactive suggestions</Label>
          <Select
            value={s.proactive}
            onChange={(e) =>
              upd({ proactive: e.target.value as JarvisSettings["proactive"] })
            }
          >
            <option value="off">Off</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Auto-log
          </p>
          <Toggle
            label="Auto-log clear supplements"
            val={s.autoLogSupplements}
            onChange={(v) => upd({ autoLogSupplements: v })}
            hint='"Log creatine" saves immediately.'
          />
          <Toggle
            label="Auto-log exact bodyweight"
            val={s.autoLogBodyweight}
            onChange={(v) => upd({ autoLogBodyweight: v })}
          />
          <Toggle
            label="Auto-log high-confidence meal estimates"
            val={s.autoLogMealEstimates}
            onChange={(v) => upd({ autoLogMealEstimates: v })}
            hint="Only when Jarvis is confident; vague meals still ask."
          />
          <Toggle
            label="Auto-apply active workout suggestions"
            val={s.autoApplyActiveWorkoutSuggestions}
            onChange={(v) => upd({ autoApplyActiveWorkoutSuggestions: v })}
            hint="When off, Jarvis asks before changing an active workout."
          />
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Confirmation
          </p>
          <Toggle
            label="Ask before saving meal estimates"
            val={s.askBeforeMealEstimates}
            onChange={(v) => upd({ askBeforeMealEstimates: v })}
          />
          <Toggle
            label="Ask before saving workouts"
            val={s.askBeforeWorkouts}
            onChange={(v) => upd({ askBeforeWorkouts: v })}
          />
          <Toggle
            label="Ask before editing active workouts"
            val={s.askBeforeActiveWorkoutEdits}
            onChange={(v) => upd({ askBeforeActiveWorkoutEdits: v })}
          />
        </div>

        <div className="border-t border-border pt-3">
          <Label>Food estimate detail</Label>
          <Select
            value={s.foodEstimateDetail}
            onChange={(e) =>
              upd({
                foodEstimateDetail: e.target
                  .value as JarvisSettings["foodEstimateDetail"],
              })
            }
          >
            <option value="simple">Simple</option>
            <option value="normal">Normal</option>
            <option value="detailed">Detailed assumptions</option>
          </Select>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Coaching
          </p>
          <Toggle
            label="Nutrition suggestions"
            val={s.nutritionSuggestions}
            onChange={(v) => upd({ nutritionSuggestions: v })}
          />
          <Toggle
            label="Supplement reminders"
            val={s.supplementReminders}
            onChange={(v) => upd({ supplementReminders: v })}
          />
          <Toggle
            label="Workout suggestions"
            val={s.workoutSuggestions}
            onChange={(v) => upd({ workoutSuggestions: v })}
          />
          <Toggle
            label="Progression suggestions"
            val={s.progressionSuggestions}
            onChange={(v) => upd({ progressionSuggestions: v })}
          />
          <Toggle
            label="Pain-based workout warnings"
            val={s.painBasedWorkoutWarnings}
            onChange={(v) => upd({ painBasedWorkoutWarnings: v })}
          />
          <Toggle
            label="Save workout template suggestions"
            val={s.saveWorkoutTemplateSuggestions}
            onChange={(v) => upd({ saveWorkoutTemplateSuggestions: v })}
          />
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Memory
          </p>
          <Toggle
            label="Learn from corrections"
            val={s.learningEnabled}
            onChange={(v) => upd({ learningEnabled: v })}
            hint="Jarvis remembers usual meals, portion sizes, dismissed suggestions."
          />
          <button
            onClick={() => set((st) => ({ ...st, jarvisLearning: {} }))}
            className="text-xs text-destructive"
          >
            Clear learned preferences
          </button>
          <button
            onClick={() => set((st) => ({ ...st, jarvisAudit: [] }))}
            className="text-xs text-destructive block"
          >
            Clear Jarvis activity history
          </button>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Reviews
          </p>
          <Toggle
            label="Daily review (ask Jarvis any time)"
            val={s.dailyReviewEnabled}
            onChange={(v) => upd({ dailyReviewEnabled: v })}
            hint="On-demand today. Scheduled push arrives in Phase 5."
          />
          <Toggle
            disabled
            label="Weekly review (coming Phase 5)"
            val={s.weeklyReviewEnabled}
            onChange={(v) => upd({ weeklyReviewEnabled: v })}
          />
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Voice
          </p>
          <Toggle
            label="Voice input"
            val={s.voiceInputEnabled !== false}
            onChange={(v) => upd({ voiceInputEnabled: v })}
            hint="Uses this browser's speech recognition. Raw audio is never sent to Groq or Gemini."
          />
          <Toggle
            label="Voice mode enabled"
            val={s.voiceModeEnabled !== false}
            onChange={(v) => upd({ voiceModeEnabled: v })}
            hint="Voice still requires a tap to start each session."
          />
          <Toggle
            label="Speak Jarvis replies"
            val={s.spokenResponses !== false}
            onChange={(v) => upd({ spokenResponses: v })}
          />
          <Toggle
            label="Auto-listen after replies"
            val={s.autoListenAfterReply !== false}
            onChange={(v) => upd({ autoListenAfterReply: v })}
          />
          <Toggle
            label="Confirm transcript before sending"
            val={Boolean(s.confirmTranscriptBeforeSend)}
            onChange={(v) => upd({ confirmTranscriptBeforeSend: v })}
          />
          <Toggle
            label="Voice output muted"
            val={Boolean(s.voiceOutputMuted)}
            onChange={(v) => upd({ voiceOutputMuted: v })}
          />
          <Toggle
            label="Save voice transcripts locally"
            val={s.saveVoiceTranscripts !== false}
            onChange={(v) => upd({ saveVoiceTranscripts: v })}
          />
          <Toggle
            label="Haptics"
            val={s.voiceHaptics !== false}
            onChange={(v) => upd({ voiceHaptics: v })}
            hint="Subtle vibration when supported."
          />
          <Toggle
            label="Keep screen awake"
            val={s.voiceKeepAwake !== false}
            onChange={(v) => upd({ voiceKeepAwake: v })}
            hint="Uses Screen Wake Lock when supported."
          />

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <div>
              <Label>Jarvis voice</Label>
              <Select
                value={s.voiceName ?? ""}
                onChange={(e) => upd({ voiceName: e.target.value })}
              >
                <option value="">Default system voice</option>
                {browserVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Speech rate</Label>
              <Select
                value={s.voiceRateMode ?? "normal"}
                onChange={(e) =>
                  upd({
                    voiceRateMode: e.target
                      .value as JarvisSettings["voiceRateMode"],
                  })
                }
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </Select>
            </div>
            <div>
              <Label>Voice response length</Label>
              <Select
                value={s.voiceResponseLength ?? "normal"}
                onChange={(e) =>
                  upd({
                    voiceResponseLength: e.target
                      .value as JarvisSettings["voiceResponseLength"],
                  })
                }
              >
                <option value="short">Short</option>
                <option value="normal">Normal</option>
                <option value="detailed">Detailed</option>
              </Select>
            </div>
            <div>
              <Label>Transcript retention</Label>
              <Select
                value={String(s.voiceTranscriptRetentionDays ?? 30)}
                onChange={(e) =>
                  upd({
                    voiceTranscriptRetentionDays: Number(
                      e.target.value,
                    ) as JarvisSettings["voiceTranscriptRetentionDays"],
                  })
                }
              >
                <option value="0">Keep forever</option>
                <option value="7">Delete after 7 days</option>
                <option value="30">Delete after 30 days</option>
                <option value="90">Delete after 90 days</option>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Silence delay before sending</Label>
              <span className="text-xs text-muted-foreground">
                {((s.voiceSilenceDelayMs ?? 1200) / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={1500}
              step={100}
              value={s.voiceSilenceDelayMs ?? 1200}
              onChange={(e) =>
                upd({ voiceSilenceDelayMs: Number(e.target.value) })
              }
              className="w-full accent-[var(--section)]"
            />
          </div>
        </div>
      </Card>
    </section>
  );
}
