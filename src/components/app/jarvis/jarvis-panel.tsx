import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Loader2, Mic, MicOff, Volume2, VolumeX, Keyboard, Square, RotateCcw } from "lucide-react";
import { BottomSheet } from "../sheet";
import { Chip, GhostButton } from "../ui";
import { useStore, uid } from "@/lib/store";
import { aiChat } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { TOOL_SPECS, runTool, undoAuditEntry, type ToolResult } from "@/lib/jarvis/tools";
import { ConfirmCard } from "./confirm-card";
import { SourceBadge } from "./source-badge";

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
type ChatResp = { ok: true; content: string; toolCalls?: { id: string; name: string; argsJson: string }[]; notice?: string; diagnostics?: AiDiagnostics } | { ok: false; error: string; diagnostics?: AiDiagnostics };

interface RenderedMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: { tool: string; result: ToolResult; pending?: { draftId: string; args: Record<string, unknown> } }[];
  createdAt: number;
}

const SUGGESTED = [
  "I did bench 185 for 3 sets of 8",
  "Log 30 minutes treadmill",
  "Log my usual protein shake",
  "Log creatine",
  "Check me in: energy 6 soreness 4 stress 3 motivation 7",
  "Give me my daily review",
  "Undo that",
];

const NON_MUTATING = new Set(["undoLastAction", "getJarvisLearnedPreferences", "suggestNutritionAction"]);
const GEMINI_KEY_STORAGE = "fitcore.jarvis.geminiApiKey.v1";
const GROQ_KEY_STORAGE = "fitcore.jarvis.groqApiKey.v1";
const AI_DIAGNOSTICS_STORAGE = "fitcore.jarvis.aiDiagnostics.v1";
const VOICE_DIAGNOSTICS_STORAGE = "fitcore.jarvis.voiceDiagnostics.v1";
const CONFIRM_WORDS = /^(yes|confirm|save it|log it|yes[, ]+save it|yes[, ]+log it)[.!]?$/i;
const CANCEL_WORDS = /^(cancel|no|no cancel|don't save|do not save)[.!]?$/i;

type VoicePhase = "listening" | "processing" | "speaking" | "paused" | "error";
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SpeechErrorEvent = { error: string };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function recordVoiceDiagnostics(patch: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  let previous: Record<string, unknown> = {};
  try { previous = JSON.parse(window.localStorage.getItem(VOICE_DIAGNOSTICS_STORAGE) ?? "{}"); } catch { /* ignore corrupt local diagnostics */ }
  window.localStorage.setItem(VOICE_DIAGNOSTICS_STORAGE, JSON.stringify({ ...previous, ...patch, updatedAt: Date.now() }));
  window.dispatchEvent(new CustomEvent("fitcore:jarvis-ai-diagnostics"));
}

function readSavedKey(storageKey: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(storageKey) ?? "";
}

function normalizedKeyMode(mode: ReturnType<typeof useStore>["state"]["jarvisSettings"]["geminiKeyMode"]): "local" | "environment" {
  return mode === "environment" ? "environment" : "local";
}

function recordDiagnostics(diag?: AiDiagnostics) {
  if (!diag || typeof window === "undefined") return;
  const raw = window.localStorage.getItem(AI_DIAGNOSTICS_STORAGE);
  const previous = raw ? JSON.parse(raw) as { calls?: AiDiagnostics[] } : {};
  const calls = [...(previous.calls ?? []), { ...diag, timestamp: diag.timestamp ?? Date.now() }].slice(-50);
  window.localStorage.setItem(AI_DIAGNOSTICS_STORAGE, JSON.stringify({ calls }));
  window.dispatchEvent(new CustomEvent("fitcore:jarvis-ai-diagnostics"));
}

function expirePendingConfirmations(messages: RenderedMsg[]): RenderedMsg[] {
  return messages.map(m => {
    if (!m.toolResults?.some(tr => tr.pending && tr.result.needsConfirmation)) return m;
    return {
      ...m,
      toolResults: m.toolResults.map(tr => tr.pending && tr.result.needsConfirmation
        ? { tool: tr.tool, result: { ok: false, summary: "Cancelled", needsConfirmation: false } }
        : tr),
    };
  });
}

function stripToolCards(messages: RenderedMsg[]): RenderedMsg[] {
  return expirePendingConfirmations(messages).map(m => m.toolResults ? { ...m, toolResults: undefined } : m);
}

function friendlyAssistantContent(content: string, toolResults: RenderedMsg["toolResults"]) {
  const trimmed = content.trim();
  const normalized = trimmed.replace(/[`"'.,:]/g, "").trim();
  const leakedToolName = TOOL_SPECS.some(tool => tool.name === normalized);
  if (trimmed && !leakedToolName) return trimmed;
  if (toolResults?.some(item => item.result.needsConfirmation)) return "";
  return (toolResults ?? []).map(item => item.result.summary).filter(Boolean).join("\n");
}

function jarvisSystemPrompt(state: ReturnType<typeof useStore>["state"], section: string, contextSummary: string): string {
  const s = state.jarvisSettings;
  const styleLine = s.responseStyle === "concise" ? "Keep replies under 40 words." : s.responseStyle === "detailed" ? "Be thorough but organized." : "Be clear and brief (under 100 words).";
  const personaLine = ({
    friendly: "Tone: friendly, direct, encouraging. Not robotic.",
    coach: "Tone: experienced coach - confident, accountable, practical.",
    siri: "Tone: short, neutral, assistant-like.",
    chatgpt: "Tone: thorough, explanatory.",
  } as const)[s.personality];
  const permLine = {
    1: "Permission: SUGGEST ONLY. Do not call any logging tools - only call getter tools and answer.",
    2: "Permission: DRAFT & CONFIRM. You may call logging tools; every action will be shown to the user for confirmation.",
    3: "Permission: AUTO-LOG SIMPLE. Clear supplements/bodyweight can auto-save. Uncertain meals/workouts still confirm.",
    4: "Permission: FULL CONTROL. Auto-apply low-risk; still confirm destructive/recurring/active-workout changes.",
  }[s.permission];
  const p = state.userGoalsProfile;
  const usualLine = [
    p.usualBreakfast && `breakfast: ${p.usualBreakfast}`,
    p.usualLunch && `lunch: ${p.usualLunch}`,
    p.usualDinner && `dinner: ${p.usualDinner}`,
    p.usualProteinShake && `shake: ${p.usualProteinShake}`,
  ].filter(Boolean).join("; ");
  return [
    "You are Jarvis, the AI control layer for the user's FitCore fitness app.",
    "You ONLY mutate app data via the provided tools. Never claim to log something without a tool call.",
    "Use exactly one save path per user action: auto-log OR confirmation draft, never both.",
    "Do not repeat, replay, or confirm an older user action from previous turns. Only act on the current user message.",
    "FOOD: For natural-language meals, call logMeal with estimates. Set confidence=high only if portions are explicit; otherwise medium or low. Include assumptions and originalText.",
    "USUAL MEALS: If the user says my usual/normal X, call logUsualMeal with the matching slot. If the usual is missing, ask a short follow-up.",
    "SUPPLEMENTS: 'Log creatine' -> logSupplement. Use getSupplementStatus to answer whether supplements were taken today.",
    "BODYWEIGHT: 'Log 185.4 lb' -> logBodyWeight with originalText.",
    "WORKOUTS: For workout descriptions, call createWorkoutDraft or logWorkout with exercises/sets/start/end if available. Respect confirmation. Cardio goes through logCardio.",
    "ACTIVE WORKOUT: Use getActiveWorkout, logExerciseSet, updateActiveWorkout, suggestActiveWorkoutChange, finishActiveWorkout, and related tools. Ask before editing unless settings allow.",
    "If the user says yes/log that after something already saved, do not call a duplicate logging tool; answer that it is already logged.",
    "When uncertain, ask one short follow-up question. Never diagnose. Red-flag symptoms -> recommend medical care.",
    personaLine, styleLine, permLine,
    `Section: ${section}.`,
    usualLine ? `User's usual meals - ${usualLine}.` : "",
    "User context:", contextSummary,
  ].filter(Boolean).join("\n");
}

function isMutatingTool(name: string) {
  return !name.startsWith("get") && !NON_MUTATING.has(name);
}

function shouldAutoRun(name: string, args: Record<string, unknown>, settings: ReturnType<typeof useStore>["state"]["jarvisSettings"]) {
  if (settings.permission < 3) return false;
  if (name === "logBodyWeight") return settings.autoLogBodyweight;
  if (name === "logSupplement") return settings.autoLogSupplements;
  if (name === "logMeal") return settings.autoLogMealEstimates && args.confidence === "high";
  if (name === "logUsualMeal") return settings.autoLogMealEstimates;
  if (name === "logCardio") return !settings.askBeforeWorkouts && args.confidence === "high";
  if (name === "logWorkout") return !settings.askBeforeWorkouts && args.confidence === "high";
  if (name === "updateActiveWorkout") return settings.autoApplyActiveWorkoutSuggestions && !settings.askBeforeActiveWorkoutEdits;
  return false;
}

export function JarvisPanel({ section, contextSummary }: { section: string; contextSummary: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<RenderedMsg[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const { state, set } = useStore();
  const stateRef = useRef(state);
  const messagesRef = useRef(messages);
  const sendingRef = useRef(false);
  const chatFn = useServerFn(aiChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [open, messages.length]);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("fitcore:open-ai", h);
    window.addEventListener("fitcore:open-jarvis", h);
    return () => { window.removeEventListener("fitcore:open-ai", h); window.removeEventListener("fitcore:open-jarvis", h); };
  }, []);

  const settings = state.jarvisSettings;
  const latestToolMessageId = [...messages].reverse().find(m => m.toolResults?.length)?.id;

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    if (!settings.enabled) {
      const disabled = "Jarvis is disabled. Enable it in Settings > Jarvis AI.";
      setMessages(m => [...m, { id: uid(), role: "assistant", content: disabled, createdAt: Date.now() }]);
      sendingRef.current = false;
      return disabled;
    }

    const pendingIntent = CONFIRM_WORDS.test(content) ? "confirm" : CANCEL_WORDS.test(content) ? "cancel" : null;
    const pendingMessage = [...messagesRef.current].reverse().find(m => m.toolResults?.some(tr => tr.pending && tr.result.needsConfirmation));
    if (pendingIntent && pendingMessage?.toolResults) {
      const idx = pendingMessage.toolResults.findIndex(tr => tr.pending && tr.result.needsConfirmation);
      const current = pendingMessage.toolResults[idx];
      const userMsg: RenderedMsg = { id: uid(), role: "user", content, createdAt: Date.now() };
      let spoken = "Cancelled.";
      if (pendingIntent === "confirm" && current?.pending) {
        const result = runTool(current.tool, current.pending.args, { state: stateRef.current, set, settings });
        spoken = result.summary;
        setMessages(prev => [...prev.map(m => m.id === pendingMessage.id && m.toolResults ? {
          ...m,
          toolResults: m.toolResults.map((tr, i) => i === idx ? { tool: tr.tool, result: { ...result, needsConfirmation: false } } : tr),
        } : m), userMsg, { id: uid(), role: "assistant", content: spoken, createdAt: Date.now() }]);
      } else {
        setMessages(prev => [...prev.map(m => m.id === pendingMessage.id && m.toolResults ? {
          ...m,
          toolResults: m.toolResults.map((tr, i) => i === idx ? { tool: tr.tool, result: { ok: false, summary: "Cancelled", needsConfirmation: false } } : tr),
        } : m), userMsg, { id: uid(), role: "assistant", content: spoken, createdAt: Date.now() }]);
      }
      sendingRef.current = false;
      return spoken;
    }

    setInput("");
    setSending(true);
    const userMsg: RenderedMsg = { id: uid(), role: "user", content, createdAt: Date.now() };
    setMessages(m => [...stripToolCards(m), userMsg]);

    try {
      const recent = [{ role: userMsg.role, content: userMsg.content }];
      const tools = settings.permission === 1 ? TOOL_SPECS.filter(t => t.name.startsWith("get")) : TOOL_SPECS;
      const sysPrompt = jarvisSystemPrompt(stateRef.current, section, contextSummary);
      const savedGeminiKey = readSavedKey(GEMINI_KEY_STORAGE);
      const savedGroqKey = readSavedKey(GROQ_KEY_STORAGE);
      const res = await chatFn({ data: {
        messages: recent,
        mode: settings.responseStyle === "detailed" ? "detailed" : "quick",
        systemOverride: sysPrompt,
        tools,
        provider: settings.aiProvider ?? "groq",
        geminiKeyMode: normalizedKeyMode(settings.geminiKeyMode),
        geminiModel: settings.geminiModel,
        userGeminiApiKey: savedGeminiKey || undefined,
        groqKeyMode: normalizedKeyMode(settings.groqKeyMode),
        groqModel: settings.groqModel ?? "qwen/qwen3-32b",
        userGroqApiKey: savedGroqKey || undefined,
        autoModelRouting: settings.autoModelRouting !== false,
        autoAiFallback: settings.autoAiFallback !== false,
        allowGeminiFallback: Boolean(settings.allowGeminiFallback),
      } }) as ChatResp;
      recordDiagnostics(res.diagnostics);

      if (!res.ok) {
        const failure = `Warning: ${res.error}`;
        setMessages(m => [...m, { id: uid(), role: "assistant", content: failure, createdAt: Date.now() }]);
        return failure;
      }

      const toolResults: RenderedMsg["toolResults"] = [];
      for (const tc of res.toolCalls ?? []) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.argsJson); } catch { /* keep empty */ }
        if (isMutatingTool(tc.name) && settings.permission >= 2 && !shouldAutoRun(tc.name, args, settings)) {
          const draftId = uid();
          toolResults.push({ tool: tc.name, result: { ok: true, summary: humanizeArgs(tc.name, args), needsConfirmation: true, data: args }, pending: { draftId, args: { ...args, draftId } } });
        } else {
          const r = runTool(tc.name, args, { state: stateRef.current, set, settings });
          toolResults.push({ tool: tc.name, result: r });
        }
      }

      const assistantContent = friendlyAssistantContent(res.content, toolResults) || (toolResults.length ? "" : "I couldn't complete that request.");
      setMessages(m => [...m, { id: uid(), role: "assistant", content: assistantContent, toolResults, createdAt: Date.now() }]);
      return assistantContent || toolResults.map(item => item.result.summary).filter(Boolean).join(". ");
    } catch (err) {
      const failure = `Warning: ${err instanceof Error ? err.message : "Jarvis failed"}`;
      setMessages(m => [...m, { id: uid(), role: "assistant", content: failure, createdAt: Date.now() }]);
      return failure;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [settings, chatFn, set, section, contextSummary]);

  const applyPending = (msgId: string, idx: number) => {
    const msg = messages.find(m => m.id === msgId);
    const existing = msg?.toolResults?.[idx];
    if (!existing?.pending || !existing.result.needsConfirmation) return;

    const { tool, pending } = existing;
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.toolResults) return m;
      const tr = m.toolResults[idx];
      if (!tr?.pending || !tr.result.needsConfirmation) return m;
      const next = [...m.toolResults];
      next[idx] = { tool: tr.tool, result: { ...tr.result, summary: "Saving...", needsConfirmation: false } };
      return { ...m, toolResults: next };
    }));

    const r = runTool(tool, pending.args, { state: stateRef.current, set, settings });
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.toolResults) return m;
      const next = [...m.toolResults];
      next[idx] = { tool, result: { ...r, needsConfirmation: false } };
      return { ...m, toolResults: next };
    }));
  };

  const cancelPending = (msgId: string, idx: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.toolResults) return m;
      const tr = m.toolResults[idx];
      if (!tr.pending || !tr.result.needsConfirmation) return m;
      const next = [...m.toolResults];
      next[idx] = { tool: tr.tool, result: { ok: false, summary: "Cancelled", needsConfirmation: false } };
      return { ...m, toolResults: next };
    }));
  };
  const undoAction = (auditId: string) => undoAuditEntry(auditId, stateRef.current, set);
  const providerName = settings.aiProvider === "gemini" ? "Gemini" : settings.aiProvider === "legacy-lovable" ? "Legacy" : "Groq";
  const providerModel = settings.aiProvider === "gemini"
    ? `Gemini ${settings.geminiModel === "gemini-2.5-flash" ? "2.5 Flash" : "backup"}`
    : settings.groqModel === "llama-3.1-8b-instant" ? "Groq Llama 3.1 8B" : settings.groqModel === "llama-3.3-70b-versatile" ? "Groq Llama 3.3 70B" : "Groq Qwen 3 32B";

  const closePanel = () => {
    setVoiceOpen(false);
    window.speechSynthesis?.cancel();
    set(s => ({ ...s, jarvisSettings: { ...s.jarvisSettings, voiceModeEnabled: false } }));
    setOpen(false);
  };

  const startVoice = () => {
    set(s => ({ ...s, jarvisSettings: { ...s.jarvisSettings, voiceModeEnabled: true } }));
    setVoiceOpen(true);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed z-20 right-4 bottom-[calc(96px+env(safe-area-inset-bottom))] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-95 transition-transform"
        style={{ background: "var(--section)", boxShadow: "0 10px 40px -5px color-mix(in oklab, var(--section) 60%, transparent)" }}
        aria-label="Open Jarvis">
        <Sparkles size={22} />
      </button>

      <BottomSheet open={open} onClose={closePanel} title="Jarvis" height="tall">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)]">
            <span className={`w-1.5 h-1.5 rounded-full ${sending ? "animate-pulse" : ""}`} style={{ background: sending ? "var(--section)" : "var(--success, #10b981)" }} />
            {sending ? "Thinking..." : "Ready"}
          </span>
          <span className="ml-auto capitalize">{providerName} / L{settings.permission}</span>
        </div>

        <div ref={scrollRef} className="space-y-3 max-h-[45dvh] overflow-y-auto pb-2">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="inline-flex w-12 h-12 items-center justify-center rounded-2xl mb-3" style={{ background: "var(--section-soft)", color: "var(--section)" }}>
                <Sparkles size={22} />
              </div>
              <p className="text-sm text-muted-foreground">Tell Jarvis what you logged, ate, or how you feel. Or ask anything.</p>
            </div>
          )}
          {messages.map(m => {
            const visibleToolResults = m.id === latestToolMessageId ? m.toolResults : undefined;
            return (
              <div key={m.id} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                {m.content && (
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "text-white" : "bg-[var(--surface-2)]"}`}
                    style={m.role === "user" ? { background: "var(--section)" } : undefined}>
                    {m.content}
                  </div>
                )}
                {visibleToolResults?.map((tr, i) => (
                  <ConfirmCard key={i} tool={tr.tool} result={tr.result}
                    onConfirm={() => applyPending(m.id, i)}
                    onCancel={() => cancelPending(m.id, i)}
                    onUndo={tr.result.auditId ? () => undoAction(tr.result.auditId!) : undefined} />
                ))}
              </div>
            );
          })}
          {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Jarvis is thinking...</div>}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-1 px-1">
          {SUGGESTED.map(s => <Chip key={s} onClick={() => send(s)}>{s}</Chip>)}
        </div>

        <div className="flex gap-2 sticky bottom-0 pb-2 pt-1" style={{ background: "var(--surface)" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(input); }}
            placeholder="Talk to Jarvis..." className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)]" />
          <button onClick={startVoice} disabled={settings.voiceInputEnabled === false} title="Start Jarvis voice conversation" className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--surface-2)] text-muted-foreground disabled:opacity-50" aria-label="Start Jarvis voice conversation">
            <Mic size={18} />
          </button>
          <button onClick={() => send(input)} disabled={sending || !input.trim()}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--section)" }}>
            <Send size={18} />
          </button>
        </div>
        {messages.length > 0 && (
          <div className="mt-2"><GhostButton className="w-full text-sm" onClick={() => setMessages([])}>Clear conversation</GhostButton></div>
        )}
        {voiceOpen && (
          <VoiceConversation
            settings={settings}
            providerModel={providerModel}
            onSend={send}
            onEnd={() => {
              setVoiceOpen(false);
              set(s => ({ ...s, jarvisSettings: { ...s.jarvisSettings, voiceModeEnabled: false } }));
            }}
            onTextFallback={() => setVoiceOpen(false)}
            onSettingsChange={patch => set(s => ({ ...s, jarvisSettings: { ...s.jarvisSettings, ...patch } }))}
          />
        )}
      </BottomSheet>
    </>
  );
}

function humanizeArgs(tool: string, args: Record<string, unknown>): string {
  switch (tool) {
    case "logBodyWeight": return `Log bodyweight: ${args.weightLb} lb`;
    case "logSupplement": return `Log supplement: ${args.name}${args.dose ? ` (${args.dose})` : ""}`;
    case "logDailyCheckIn": return `Daily check-in - energy ${args.energy}, soreness ${args.soreness}, stress ${args.stress}, motivation ${args.motivation}`;
    case "updateUserGoalsProfile": return `Update profile: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    case "updateJarvisSettings": return `Update Jarvis settings: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    case "logMeal": return `Log ${args.mealType ?? "meal"}: ${args.name ?? "meal"}`;
    case "logUsualMeal": return `Log usual ${args.slot ?? "meal"}`;
    case "saveUsualMeal": return `Save usual ${args.slot}: ${args.name}`;
    case "createWorkoutDraft":
    case "logWorkout": return `Review workout: ${args.name ?? args.workoutType ?? "Workout"}`;
    case "logCardio": return `Log cardio: ${args.type ?? "cardio"}${args.minutes ? ` for ${args.minutes} min` : ""}`;
    case "updateMeal": return "Edit meal";
    case "deleteMeal": return "Delete meal";
    case "updateDailyCheckIn": return `Update today's check-in: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    default: return "Review requested action";
  }
}

export { SourceBadge };

// Kept as a no-op export so existing mounts remain compatible while global undo UI is disabled.
export function JarvisUndoSnackbar() {
  return null;
}


function VoiceConversation({
  settings,
  providerModel,
  onSend,
  onEnd,
  onTextFallback,
  onSettingsChange,
}: {
  settings: ReturnType<typeof useStore>["state"]["jarvisSettings"];
  providerModel: string;
  onSend: (text: string) => Promise<string | undefined>;
  onEnd: () => void;
  onTextFallback: () => void;
  onSettingsChange: (patch: Partial<ReturnType<typeof useStore>["state"]["jarvisSettings"]>) => void;
}) {
  const [phase, setPhase] = useState<VoicePhase>("paused");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const activeRef = useRef(true);
  const phaseRef = useRef<VoicePhase>("paused");
  const finalTextRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentTranscriptsRef = useRef(new Map<string, number>());
  const errorCountRef = useRef(0);
  const micPermissionRequestedRef = useRef(false);
  const voiceTurnsRef = useRef(0);
  const aiCallsRef = useRef(0);
  const startListeningRef = useRef<() => void>(() => {});

  const updatePhase = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopRecognition = useCallback((abort = false) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    silenceTimerRef.current = null;
    restartTimerRef.current = null;
    try {
      if (abort) recognitionRef.current?.abort();
      else recognitionRef.current?.stop();
    } catch { /* recognition may already be stopped */ }
  }, []);

  const speak = useCallback((text: string) => {
    const synthesis = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!text || settings.spokenResponses === false || settings.voiceOutputMuted) {
      if (settings.autoListenAfterReply !== false) startListeningRef.current();
      else updatePhase("paused");
      return;
    }
    if (!synthesis || typeof SpeechSynthesisUtterance === "undefined") {
      setError("Spoken replies are not supported in this browser.");
      if (settings.autoListenAfterReply !== false) startListeningRef.current();
      else updatePhase("paused");
      return;
    }
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => updatePhase("speaking");
    utterance.onend = () => {
      if (!activeRef.current) return;
      if (settings.autoListenAfterReply !== false) startListeningRef.current();
      else updatePhase("paused");
    };
    utterance.onerror = () => {
      if (!activeRef.current) return;
      setError("Spoken replies are not supported in this browser.");
      if (settings.autoListenAfterReply !== false) startListeningRef.current();
      else updatePhase("paused");
    };
    synthesis.speak(utterance);
  }, [settings.autoListenAfterReply, settings.spokenResponses, settings.voiceOutputMuted, updatePhase]);

  const processTranscript = useCallback(async (rawText: string) => {
    const text = rawText.trim().replace(/\s+/g, " ");
    if (!text || !activeRef.current || phaseRef.current === "processing") return;
    const key = text.toLocaleLowerCase();
    const now = Date.now();
    for (const [oldKey, timestamp] of recentTranscriptsRef.current) {
      if (now - timestamp > 4_000) recentTranscriptsRef.current.delete(oldKey);
    }
    if (recentTranscriptsRef.current.has(key)) {
      recordVoiceDiagnostics({ duplicateTranscriptPrevented: true, lastTranscript: text });
      setError("Duplicate transcript ignored.");
      restartTimerRef.current = setTimeout(() => startListeningRef.current(), 500);
      return;
    }
    recentTranscriptsRef.current.set(key, now);
    voiceTurnsRef.current += 1;
    aiCallsRef.current += CONFIRM_WORDS.test(text) || CANCEL_WORDS.test(text) ? 0 : 1;
    recordVoiceDiagnostics({
      voiceTurnsThisSession: voiceTurnsRef.current,
      aiCallsThisSession: aiCallsRef.current,
      lastTranscript: text,
      duplicateTranscriptPrevented: false,
    });
    updatePhase("processing");
    setTranscript(text);
    setError("");
    stopRecognition();
    const response = await onSend(text);
    if (!activeRef.current) return;
    const cleanReply = response?.trim() || "Done.";
    setReply(cleanReply);
    let lastDiag: AiDiagnostics | undefined;
    try {
      const stored = JSON.parse(window.localStorage.getItem(AI_DIAGNOSTICS_STORAGE) ?? "{}") as { calls?: AiDiagnostics[] };
      lastDiag = stored.calls?.at(-1);
    } catch { /* diagnostics are optional */ }
    recordVoiceDiagnostics({
      lastProviderModel: lastDiag?.actualModel ?? providerModel,
      autoRouting: Boolean(lastDiag?.routed),
      fallback: Boolean(lastDiag?.fallback),
    });
    speak(cleanReply);
  }, [onSend, providerModel, speak, stopRecognition, updatePhase]);

  const submitFinal = useCallback((text: string) => {
    if (!text.trim()) return;
    if (settings.confirmTranscriptBeforeSend) {
      setTranscript(text.trim());
      updatePhase("paused");
      return;
    }
    void processTranscript(text);
  }, [processTranscript, settings.confirmTranscriptBeforeSend, updatePhase]);

  const startListening = useCallback(async () => {
    if (!activeRef.current || settings.voiceInputEnabled === false) return;
    window.speechSynthesis?.cancel();
    stopRecognition(true);
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setError("Voice input is not supported in this browser. Type your message instead.");
      updatePhase("error");
      return;
    }
    try {
      if (!micPermissionRequestedRef.current && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        micPermissionRequestedRef.current = true;
      }
      if (!activeRef.current) return;
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.onstart = () => {
        finalTextRef.current = "";
        setTranscript("");
        setError("");
        updatePhase("listening");
      };
      recognition.onresult = event => {
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalChunk += `${result[0]?.transcript ?? ""} `;
        }
        if (!finalChunk.trim()) return;
        finalTextRef.current = `${finalTextRef.current} ${finalChunk}`.trim();
        setTranscript(finalTextRef.current);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const completed = finalTextRef.current;
          finalTextRef.current = "";
          try { recognition.stop(); } catch { /* already stopped */ }
          submitFinal(completed);
        }, Math.max(500, settings.voiceSilenceDelayMs ?? 1200));
      };
      recognition.onerror = event => {
        if (!activeRef.current || event.error === "aborted") return;
        errorCountRef.current += 1;
        const message = event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone permission is blocked. Enable it in your browser settings."
          : "Voice input stopped unexpectedly. Restart listening.";
        setError(message);
        updatePhase(errorCountRef.current >= 3 ? "paused" : "error");
      };
      recognition.onend = () => {
        if (!activeRef.current || phaseRef.current !== "listening" || silenceTimerRef.current || finalTextRef.current) return;
        restartTimerRef.current = setTimeout(() => startListeningRef.current(), 400);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setError(denied ? "Microphone permission is blocked. Enable it in your browser settings." : "Voice input stopped unexpectedly. Restart listening.");
      updatePhase("error");
    }
  }, [settings.voiceInputEnabled, settings.voiceSilenceDelayMs, stopRecognition, submitFinal, updatePhase]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  useEffect(() => {
    activeRef.current = true;
    recordVoiceDiagnostics({ voiceTurnsThisSession: 0, aiCallsThisSession: 0, duplicateTranscriptPrevented: false });
    void startListening();
    return () => {
      activeRef.current = false;
      stopRecognition(true);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const interrupt = () => {
    if (phase !== "speaking") return;
    window.speechSynthesis?.cancel();
    void startListening();
  };

  const endVoice = () => {
    activeRef.current = false;
    stopRecognition(true);
    window.speechSynthesis?.cancel();
    onEnd();
  };

  const stateLabel = phase === "listening" ? "Listening" : phase === "processing" ? "Processing" : phase === "speaking" ? "Speaking" : phase === "error" ? "Error" : "Paused";

  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col overflow-hidden rounded-t-3xl bg-[var(--surface)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1">{providerModel}</span>
        <span className="font-medium">{stateLabel}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 py-6">
        <button
          onClick={phase === "speaking" ? interrupt : () => void startListening()}
          disabled={phase === "processing"}
          className="relative flex h-44 w-44 items-center justify-center rounded-full disabled:opacity-80"
          aria-label={phase === "speaking" ? "Interrupt Jarvis and listen" : "Start listening"}
          style={{ background: "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--section) 82%, white), var(--section) 58%, color-mix(in oklab, var(--section) 18%, transparent))", boxShadow: phase === "listening" ? "0 0 0 18px color-mix(in oklab, var(--section) 10%, transparent), 0 0 70px color-mix(in oklab, var(--section) 50%, transparent)" : "0 18px 60px color-mix(in oklab, var(--section) 25%, transparent)" }}
        >
          <span className={phase === "listening" || phase === "speaking" ? "animate-pulse" : ""}>
            {phase === "processing" ? <Loader2 className="animate-spin text-white" size={42} /> : phase === "speaking" ? <Volume2 className="text-white" size={42} /> : phase === "error" ? <MicOff className="text-white" size={42} /> : <Mic className="text-white" size={42} />}
          </span>
        </button>

        <div className="w-full max-w-md space-y-3 text-center">
          <p className="text-lg font-semibold">{stateLabel}</p>
          {transcript && <div className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm"><span className="text-muted-foreground">You: </span>{transcript}</div>}
          {reply && <div className="rounded-2xl border border-border px-4 py-3 text-sm"><span className="text-muted-foreground">Jarvis: </span>{reply}</div>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {phase === "paused" && settings.confirmTranscriptBeforeSend && transcript && (
            <button onClick={() => void processTranscript(transcript)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--section)" }}>Send transcript</button>
          )}
          {(phase === "error" || phase === "paused") && !(settings.confirmTranscriptBeforeSend && transcript) && (
            <button onClick={() => void startListening()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-2 text-sm font-medium"><RotateCcw size={15} /> Restart listening</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onSettingsChange({ voiceOutputMuted: !settings.voiceOutputMuted })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 text-sm" aria-label={settings.voiceOutputMuted ? "Unmute spoken replies" : "Mute spoken replies"}>
          {settings.voiceOutputMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}<span className="hidden sm:inline">{settings.voiceOutputMuted ? "Unmute" : "Mute"}</span>
        </button>
        <button onClick={onTextFallback} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 text-sm"><Keyboard size={18} /><span className="hidden sm:inline">Type</span></button>
        <button onClick={endVoice} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-destructive px-3 text-sm font-semibold text-white"><Square size={16} /> End Voice</button>
      </div>
    </div>
  );
}
