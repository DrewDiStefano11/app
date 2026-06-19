import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Keyboard,
  RotateCcw,
  X,
  Eye,
  EyeOff,
  History,
} from "lucide-react";
import { BottomSheet } from "../sheet";
import { Chip, GhostButton } from "../ui";
import { useStore, uid } from "@/lib/store";
import { aiChat } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  TOOL_SPECS,
  runTool,
  undoAuditEntry,
  type ToolResult,
} from "@/lib/jarvis/tools";
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
type ChatResp =
  | {
      ok: true;
      content: string;
      toolCalls?: { id: string; name: string; argsJson: string }[];
      notice?: string;
      diagnostics?: AiDiagnostics;
    }
  | { ok: false; error: string; diagnostics?: AiDiagnostics };

interface VoiceTranscriptEntry {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: number;
}

interface VoiceTranscript {
  id: string;
  startedAt: number;
  endedAt: number;
  providerModel: string;
  entries: VoiceTranscriptEntry[];
}

interface RenderedMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: {
    tool: string;
    result: ToolResult;
    pending?: { draftId: string; args: Record<string, unknown> };
  }[];
  voiceTranscript?: VoiceTranscript;
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

const NON_MUTATING = new Set([
  "undoLastAction",
  "getJarvisLearnedPreferences",
  "suggestNutritionAction",
]);
const GEMINI_KEY_STORAGE = "fitcore.jarvis.geminiApiKey.v1";
const GROQ_KEY_STORAGE = "fitcore.jarvis.groqApiKey.v1";
const AI_DIAGNOSTICS_STORAGE = "fitcore.jarvis.aiDiagnostics.v1";
const VOICE_DIAGNOSTICS_STORAGE = "fitcore.jarvis.voiceDiagnostics.v1";
const VOICE_TRANSCRIPTS_STORAGE = "fitcore.jarvis.voiceTranscripts.v1";
const CONFIRM_WORDS =
  /^(yes|confirm|save it|log it|yes[, ]+save it|yes[, ]+log it)[.!]?$/i;
const CANCEL_WORDS = /^(cancel|no|no cancel|don't save|do not save)[.!]?$/i;

type VoicePhase = "listening" | "processing" | "speaking" | "paused" | "error";
type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
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

function speechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function recordVoiceDiagnostics(patch: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  let previous: Record<string, unknown> = {};
  try {
    previous = JSON.parse(
      window.localStorage.getItem(VOICE_DIAGNOSTICS_STORAGE) ?? "{}",
    );
  } catch {
    /* ignore corrupt local diagnostics */
  }
  window.localStorage.setItem(
    VOICE_DIAGNOSTICS_STORAGE,
    JSON.stringify({ ...previous, ...patch, updatedAt: Date.now() }),
  );
  window.dispatchEvent(new CustomEvent("fitcore:jarvis-ai-diagnostics"));
}

function readStoredVoiceTranscripts(retentionDays: number): VoiceTranscript[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(VOICE_TRANSCRIPTS_STORAGE) ?? "[]",
    ) as VoiceTranscript[];
    if (!retentionDays) return stored.slice(-40);
    const cutoff = Date.now() - retentionDays * 86_400_000;
    return stored.filter((item) => item.endedAt >= cutoff).slice(-40);
  } catch {
    return [];
  }
}

function saveVoiceTranscript(
  transcript: VoiceTranscript,
  enabled: boolean,
  retentionDays: number,
) {
  if (typeof window === "undefined") return;
  if (!enabled) {
    recordVoiceDiagnostics({
      transcriptStorage: "off",
      transcriptRetention: retentionDays ? `${retentionDays} days` : "forever",
    });
    return;
  }
  const compact: VoiceTranscript = {
    ...transcript,
    entries: transcript.entries.slice(-250).map((entry) => ({
      ...entry,
      text: entry.text.slice(0, 4000),
    })),
  };
  const next = [...readStoredVoiceTranscripts(retentionDays), compact].slice(
    -40,
  );
  window.localStorage.setItem(VOICE_TRANSCRIPTS_STORAGE, JSON.stringify(next));
  recordVoiceDiagnostics({
    transcriptStorage: `on (${next.length} saved)`,
    transcriptRetention: retentionDays ? `${retentionDays} days` : "forever",
  });
}

function readSavedKey(storageKey: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(storageKey) ?? "";
}

function normalizedKeyMode(
  mode: ReturnType<typeof useStore>["state"]["jarvisSettings"]["geminiKeyMode"],
): "local" | "environment" {
  return mode === "environment" ? "environment" : "local";
}

function recordDiagnostics(diag?: AiDiagnostics) {
  if (!diag || typeof window === "undefined") return;
  const raw = window.localStorage.getItem(AI_DIAGNOSTICS_STORAGE);
  const previous = raw ? (JSON.parse(raw) as { calls?: AiDiagnostics[] }) : {};
  const calls = [
    ...(previous.calls ?? []),
    { ...diag, timestamp: diag.timestamp ?? Date.now() },
  ].slice(-50);
  window.localStorage.setItem(
    AI_DIAGNOSTICS_STORAGE,
    JSON.stringify({ calls }),
  );
  window.dispatchEvent(new CustomEvent("fitcore:jarvis-ai-diagnostics"));
}

function expirePendingConfirmations(messages: RenderedMsg[]): RenderedMsg[] {
  return messages.map((m) => {
    if (!m.toolResults?.some((tr) => tr.pending && tr.result.needsConfirmation))
      return m;
    return {
      ...m,
      toolResults: m.toolResults.map((tr) =>
        tr.pending && tr.result.needsConfirmation
          ? {
              tool: tr.tool,
              result: {
                ok: false,
                summary: "Cancelled",
                needsConfirmation: false,
              },
            }
          : tr,
      ),
    };
  });
}

function stripToolCards(messages: RenderedMsg[]): RenderedMsg[] {
  return expirePendingConfirmations(messages).map((m) =>
    m.toolResults ? { ...m, toolResults: undefined } : m,
  );
}

function voiceConfirmationPrompt(toolResults: RenderedMsg["toolResults"]) {
  const pending = toolResults?.find((item) => item.result.needsConfirmation);
  if (!pending) return "";
  const summary = pending.result.summary.replace(/[.!?]+$/, "");
  return `${summary}. Want me to save it?`;
}

function friendlyAssistantContent(
  content: string,
  toolResults: RenderedMsg["toolResults"],
) {
  const trimmed = content.trim();
  const normalized = trimmed.replace(/[`"'.,:]/g, "").trim();
  const leakedToolName = TOOL_SPECS.some((tool) => tool.name === normalized);
  if (trimmed && !leakedToolName) return trimmed;
  if (toolResults?.some((item) => item.result.needsConfirmation)) return "";
  return (toolResults ?? [])
    .map((item) => item.result.summary)
    .filter(Boolean)
    .join("\n");
}

function jarvisSystemPrompt(
  state: ReturnType<typeof useStore>["state"],
  section: string,
  contextSummary: string,
): string {
  const s = state.jarvisSettings;
  const styleLine =
    s.responseStyle === "concise"
      ? "Keep replies under 40 words."
      : s.responseStyle === "detailed"
        ? "Be thorough but organized."
        : "Be clear and brief (under 100 words).";
  const personaLine = (
    {
      friendly: "Tone: friendly, direct, encouraging. Not robotic.",
      coach: "Tone: experienced coach - confident, accountable, practical.",
      siri: "Tone: short, neutral, assistant-like.",
      chatgpt: "Tone: thorough, explanatory.",
    } as const
  )[s.personality];
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
  ]
    .filter(Boolean)
    .join("; ");
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
    personaLine,
    styleLine,
    permLine,
    `Section: ${section}.`,
    usualLine ? `User's usual meals - ${usualLine}.` : "",
    "User context:",
    contextSummary,
  ]
    .filter(Boolean)
    .join("\n");
}

function isMutatingTool(name: string) {
  return !name.startsWith("get") && !NON_MUTATING.has(name);
}

function shouldAutoRun(
  name: string,
  args: Record<string, unknown>,
  settings: ReturnType<typeof useStore>["state"]["jarvisSettings"],
) {
  if (settings.permission < 3) return false;
  if (name === "logBodyWeight") return settings.autoLogBodyweight;
  if (name === "logSupplement") return settings.autoLogSupplements;
  if (name === "logMeal")
    return settings.autoLogMealEstimates && args.confidence === "high";
  if (name === "logUsualMeal") return settings.autoLogMealEstimates;
  if (name === "logCardio")
    return !settings.askBeforeWorkouts && args.confidence === "high";
  if (name === "logWorkout")
    return !settings.askBeforeWorkouts && args.confidence === "high";
  if (name === "updateActiveWorkout")
    return (
      settings.autoApplyActiveWorkoutSuggestions &&
      !settings.askBeforeActiveWorkoutEdits
    );
  return false;
}

export function JarvisPanel({
  section,
  contextSummary,
}: {
  section: string;
  contextSummary: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<RenderedMsg[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<
    string | null
  >(null);
  const { state, set } = useStore();
  const stateRef = useRef(state);
  const messagesRef = useRef(messages);
  const sendingRef = useRef(false);
  const chatFn = useServerFn(aiChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    if (open)
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, messages.length]);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("fitcore:open-ai", h);
    window.addEventListener("fitcore:open-jarvis", h);
    return () => {
      window.removeEventListener("fitcore:open-ai", h);
      window.removeEventListener("fitcore:open-jarvis", h);
    };
  }, []);

  const settings = state.jarvisSettings;
  const latestToolMessageId = [...messages]
    .reverse()
    .find((m) => m.toolResults?.length)?.id;

  const send = useCallback(
    async (
      text: string,
      options?: { voiceResponseLength?: "short" | "normal" | "detailed" },
    ) => {
      const content = text.trim();
      if (!content || sendingRef.current) return;
      sendingRef.current = true;
      if (!settings.enabled) {
        const disabled =
          "Jarvis is disabled. Enable it in Settings > Jarvis AI.";
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: disabled,
            createdAt: Date.now(),
          },
        ]);
        sendingRef.current = false;
        return disabled;
      }

      const pendingIntent = CONFIRM_WORDS.test(content)
        ? "confirm"
        : CANCEL_WORDS.test(content)
          ? "cancel"
          : null;
      const pendingMessage = [...messagesRef.current]
        .reverse()
        .find((m) =>
          m.toolResults?.some(
            (tr) => tr.pending && tr.result.needsConfirmation,
          ),
        );
      if (pendingIntent && pendingMessage?.toolResults) {
        const idx = pendingMessage.toolResults.findIndex(
          (tr) => tr.pending && tr.result.needsConfirmation,
        );
        const current = pendingMessage.toolResults[idx];
        const userMsg: RenderedMsg = {
          id: uid(),
          role: "user",
          content,
          createdAt: Date.now(),
        };
        let spoken = "Cancelled.";
        if (pendingIntent === "confirm" && current?.pending) {
          const result = runTool(current.tool, current.pending.args, {
            state: stateRef.current,
            set,
            settings,
          });
          spoken = result.summary;
          setMessages((prev) => [
            ...prev.map((m) =>
              m.id === pendingMessage.id && m.toolResults
                ? {
                    ...m,
                    toolResults: m.toolResults.map((tr, i) =>
                      i === idx
                        ? {
                            tool: tr.tool,
                            result: { ...result, needsConfirmation: false },
                          }
                        : tr,
                    ),
                  }
                : m,
            ),
            userMsg,
            {
              id: uid(),
              role: "assistant",
              content: spoken,
              createdAt: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev.map((m) =>
              m.id === pendingMessage.id && m.toolResults
                ? {
                    ...m,
                    toolResults: m.toolResults.map((tr, i) =>
                      i === idx
                        ? {
                            tool: tr.tool,
                            result: {
                              ok: false,
                              summary: "Cancelled",
                              needsConfirmation: false,
                            },
                          }
                        : tr,
                    ),
                  }
                : m,
            ),
            userMsg,
            {
              id: uid(),
              role: "assistant",
              content: spoken,
              createdAt: Date.now(),
            },
          ]);
        }
        sendingRef.current = false;
        return spoken;
      }

      setInput("");
      setSending(true);
      const userMsg: RenderedMsg = {
        id: uid(),
        role: "user",
        content,
        createdAt: Date.now(),
      };
      setMessages((m) => [...stripToolCards(m), userMsg]);

      try {
        const recent = [{ role: userMsg.role, content: userMsg.content }];
        const tools =
          settings.permission === 1
            ? TOOL_SPECS.filter((t) => t.name.startsWith("get"))
            : TOOL_SPECS;
        const sysPrompt = jarvisSystemPrompt(
          stateRef.current,
          section,
          contextSummary,
        );
        const savedGeminiKey = readSavedKey(GEMINI_KEY_STORAGE);
        const savedGroqKey = readSavedKey(GROQ_KEY_STORAGE);
        const res = (await chatFn({
          data: {
            messages: recent,
            mode: settings.responseStyle === "detailed" ? "detailed" : "quick",
            systemOverride: options?.voiceResponseLength
              ? `${sysPrompt}\nVOICE RESPONSE LENGTH: ${options.voiceResponseLength}. Keep spoken wording natural and avoid unnecessary preamble.`
              : sysPrompt,
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
          },
        })) as ChatResp;
        recordDiagnostics(res.diagnostics);

        if (!res.ok) {
          const failure = `Warning: ${res.error}`;
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "assistant",
              content: failure,
              createdAt: Date.now(),
            },
          ]);
          return failure;
        }

        const toolResults: RenderedMsg["toolResults"] = [];
        for (const tc of res.toolCalls ?? []) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.argsJson);
          } catch {
            /* keep empty */
          }
          if (
            isMutatingTool(tc.name) &&
            settings.permission >= 2 &&
            !shouldAutoRun(tc.name, args, settings)
          ) {
            const draftId = uid();
            toolResults.push({
              tool: tc.name,
              result: {
                ok: true,
                summary: humanizeArgs(tc.name, args),
                needsConfirmation: true,
                data: args,
              },
              pending: { draftId, args: { ...args, draftId } },
            });
          } else {
            const r = runTool(tc.name, args, {
              state: stateRef.current,
              set,
              settings,
            });
            toolResults.push({ tool: tc.name, result: r });
          }
        }

        const assistantContent =
          friendlyAssistantContent(res.content, toolResults) ||
          (toolResults.length ? "" : "I couldn't complete that request.");
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: assistantContent,
            toolResults,
            createdAt: Date.now(),
          },
        ]);
        return (
          assistantContent ||
          voiceConfirmationPrompt(toolResults) ||
          toolResults
            .map((item) => item.result.summary)
            .filter(Boolean)
            .join(". ")
        );
      } catch (err) {
        const failure = `Warning: ${err instanceof Error ? err.message : "Jarvis failed"}`;
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: failure,
            createdAt: Date.now(),
          },
        ]);
        return failure;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [settings, chatFn, set, section, contextSummary],
  );

  const applyPending = (msgId: string, idx: number) => {
    const msg = messages.find((m) => m.id === msgId);
    const existing = msg?.toolResults?.[idx];
    if (!existing?.pending || !existing.result.needsConfirmation) return;

    const { tool, pending } = existing;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.toolResults) return m;
        const tr = m.toolResults[idx];
        if (!tr?.pending || !tr.result.needsConfirmation) return m;
        const next = [...m.toolResults];
        next[idx] = {
          tool: tr.tool,
          result: {
            ...tr.result,
            summary: "Saving...",
            needsConfirmation: false,
          },
        };
        return { ...m, toolResults: next };
      }),
    );

    const r = runTool(tool, pending.args, {
      state: stateRef.current,
      set,
      settings,
    });
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.toolResults) return m;
        const next = [...m.toolResults];
        next[idx] = { tool, result: { ...r, needsConfirmation: false } };
        return { ...m, toolResults: next };
      }),
    );
  };

  const cancelPending = (msgId: string, idx: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.toolResults) return m;
        const tr = m.toolResults[idx];
        if (!tr.pending || !tr.result.needsConfirmation) return m;
        const next = [...m.toolResults];
        next[idx] = {
          tool: tr.tool,
          result: { ok: false, summary: "Cancelled", needsConfirmation: false },
        };
        return { ...m, toolResults: next };
      }),
    );
  };
  const undoAction = (auditId: string) =>
    undoAuditEntry(auditId, stateRef.current, set);
  const providerName =
    settings.aiProvider === "gemini"
      ? "Gemini"
      : settings.aiProvider === "legacy-lovable"
        ? "Legacy"
        : "Groq";
  const providerModel =
    settings.aiProvider === "gemini"
      ? `Gemini ${settings.geminiModel === "gemini-2.5-flash" ? "2.5 Flash" : "backup"}`
      : settings.groqModel === "llama-3.1-8b-instant"
        ? "Groq Llama 3.1 8B"
        : settings.groqModel === "llama-3.3-70b-versatile"
          ? "Groq Llama 3.3 70B"
          : "Groq Qwen 3 32B";

  const closePanel = () => {
    setVoiceOpen(false);
    window.speechSynthesis?.cancel();
    set((s) => ({
      ...s,
      jarvisSettings: { ...s.jarvisSettings, voiceModeEnabled: false },
    }));
    setOpen(false);
  };

  const startVoice = () => {
    set((s) => ({
      ...s,
      jarvisSettings: { ...s.jarvisSettings, voiceModeEnabled: true },
    }));
    setVoiceOpen(true);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed z-20 right-4 bottom-[calc(96px+env(safe-area-inset-bottom))] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-95 transition-transform"
        style={{
          background: "var(--section)",
          boxShadow:
            "0 10px 40px -5px color-mix(in oklab, var(--section) 60%, transparent)",
        }}
        aria-label="Open Jarvis"
      >
        <Sparkles size={22} />
      </button>

      <BottomSheet
        open={open}
        onClose={closePanel}
        title="Jarvis"
        height="tall"
      >
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${sending ? "animate-pulse" : ""}`}
              style={{
                background: sending
                  ? "var(--section)"
                  : "var(--success, #10b981)",
              }}
            />
            {sending ? "Thinking..." : "Ready"}
          </span>
          <span className="ml-auto capitalize">
            {providerName} / L{settings.permission}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="space-y-3 max-h-[45dvh] overflow-y-auto pb-2"
        >
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div
                className="inline-flex w-12 h-12 items-center justify-center rounded-2xl mb-3"
                style={{
                  background: "var(--section-soft)",
                  color: "var(--section)",
                }}
              >
                <Sparkles size={22} />
              </div>
              <p className="text-sm text-muted-foreground">
                Tell Jarvis what you logged, ate, or how you feel. Or ask
                anything.
              </p>
            </div>
          )}
          {messages.map((m) => {
            const visibleToolResults =
              m.id === latestToolMessageId ? m.toolResults : undefined;
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                {m.content && (
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "text-white" : "bg-[var(--surface-2)]"}`}
                    style={
                      m.role === "user"
                        ? { background: "var(--section)" }
                        : undefined
                    }
                  >
                    {m.content}
                  </div>
                )}
                {m.voiceTranscript && (
                  <div className="w-full max-w-[85%] rounded-2xl border border-border bg-[var(--surface-2)] p-3">
                    <button
                      onClick={() =>
                        setExpandedTranscriptId((id) =>
                          id === m.voiceTranscript?.id
                            ? null
                            : (m.voiceTranscript?.id ?? null),
                        )
                      }
                      className="flex w-full items-center gap-2 text-left text-sm font-medium"
                    >
                      <History size={16} style={{ color: "var(--section)" }} />
                      <span>View Full Transcript</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {m.voiceTranscript.entries.length} lines
                      </span>
                    </button>
                    {expandedTranscriptId === m.voiceTranscript.id && (
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-border pt-3">
                        {m.voiceTranscript.entries.map((entry) => (
                          <div key={entry.id} className="text-xs">
                            <span className="font-semibold capitalize text-muted-foreground">
                              {entry.role === "assistant"
                                ? "Jarvis"
                                : entry.role}
                              :
                            </span>{" "}
                            <span>{entry.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {visibleToolResults?.map((tr, i) => (
                  <ConfirmCard
                    key={i}
                    tool={tr.tool}
                    result={tr.result}
                    onConfirm={() => applyPending(m.id, i)}
                    onCancel={() => cancelPending(m.id, i)}
                    onUndo={
                      tr.result.auditId
                        ? () => undoAction(tr.result.auditId!)
                        : undefined
                    }
                  />
                ))}
              </div>
            );
          })}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Jarvis is thinking...
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-1 px-1">
          {SUGGESTED.map((s) => (
            <Chip key={s} onClick={() => send(s)}>
              {s}
            </Chip>
          ))}
        </div>

        <div
          className="flex gap-2 sticky bottom-0 pb-2 pt-1"
          style={{ background: "var(--surface)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
            placeholder="Talk to Jarvis..."
            className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)]"
          />
          <button
            onClick={startVoice}
            disabled={settings.voiceInputEnabled === false}
            title="Start Jarvis voice conversation"
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--surface-2)] text-muted-foreground disabled:opacity-50"
            aria-label="Start Jarvis voice conversation"
          >
            <Mic size={18} />
          </button>
          <button
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--section)" }}
          >
            <Send size={18} />
          </button>
        </div>
        {messages.length > 0 && (
          <div className="mt-2">
            <GhostButton
              className="w-full text-sm"
              onClick={() => setMessages([])}
            >
              Clear conversation
            </GhostButton>
          </div>
        )}
        {voiceOpen && (
          <VoiceConversation
            settings={settings}
            providerModel={providerModel}
            onSend={send}
            activeWorkout={
              state.activeWorkout
                ? {
                    name: state.activeWorkout.name,
                    exercise: state.activeWorkout.exercises.find(
                      (exercise) => !exercise.completed,
                    )?.exerciseId,
                    setNumber:
                      (state.activeWorkout.exercises.find(
                        (exercise) => !exercise.completed,
                      )?.sets.length ?? 0) + 1,
                  }
                : null
            }
            onEnd={(entries) => {
              const transcript: VoiceTranscript = {
                id: uid(),
                startedAt: entries[0]?.createdAt ?? Date.now(),
                endedAt: Date.now(),
                providerModel,
                entries,
              };
              saveVoiceTranscript(
                transcript,
                settings.saveVoiceTranscripts !== false,
                settings.voiceTranscriptRetentionDays ?? 30,
              );
              if (entries.length) {
                setMessages((previous) => [
                  ...previous,
                  {
                    id: uid(),
                    role: "assistant",
                    content: "Voice conversation ended.",
                    voiceTranscript: transcript,
                    createdAt: Date.now(),
                  },
                ]);
              }
              setVoiceOpen(false);
              set((s) => ({
                ...s,
                jarvisSettings: {
                  ...s.jarvisSettings,
                  voiceModeEnabled: false,
                },
              }));
            }}
            onTextFallback={(entries) => {
              if (entries.length) {
                const transcript: VoiceTranscript = {
                  id: uid(),
                  startedAt: entries[0]?.createdAt ?? Date.now(),
                  endedAt: Date.now(),
                  providerModel,
                  entries,
                };
                saveVoiceTranscript(
                  transcript,
                  settings.saveVoiceTranscripts !== false,
                  settings.voiceTranscriptRetentionDays ?? 30,
                );
                setMessages((previous) => [
                  ...previous,
                  {
                    id: uid(),
                    role: "assistant",
                    content:
                      "Voice conversation paused. Continue by typing below.",
                    voiceTranscript: transcript,
                    createdAt: Date.now(),
                  },
                ]);
              }
              setVoiceOpen(false);
              set((s) => ({
                ...s,
                jarvisSettings: {
                  ...s.jarvisSettings,
                  voiceModeEnabled: false,
                },
              }));
            }}
            onSettingsChange={(patch) =>
              set((s) => ({
                ...s,
                jarvisSettings: { ...s.jarvisSettings, ...patch },
              }))
            }
          />
        )}
      </BottomSheet>
    </>
  );
}

function humanizeArgs(tool: string, args: Record<string, unknown>): string {
  switch (tool) {
    case "logBodyWeight":
      return `Log bodyweight: ${args.weightLb} lb`;
    case "logSupplement":
      return `Log supplement: ${args.name}${args.dose ? ` (${args.dose})` : ""}`;
    case "logDailyCheckIn":
      return `Daily check-in - energy ${args.energy}, soreness ${args.soreness}, stress ${args.stress}, motivation ${args.motivation}`;
    case "updateUserGoalsProfile":
      return `Update profile: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    case "updateJarvisSettings":
      return `Update Jarvis settings: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    case "logMeal":
      return `Log ${args.mealType ?? "meal"}: ${args.name ?? "meal"}`;
    case "logUsualMeal":
      return `Log usual ${args.slot ?? "meal"}`;
    case "saveUsualMeal":
      return `Save usual ${args.slot}: ${args.name}`;
    case "createWorkoutDraft":
    case "logWorkout":
      return `Review workout: ${args.name ?? args.workoutType ?? "Workout"}`;
    case "logCardio":
      return `Log cardio: ${args.type ?? "cardio"}${args.minutes ? ` for ${args.minutes} min` : ""}`;
    case "updateMeal":
      return "Edit meal";
    case "deleteMeal":
      return "Delete meal";
    case "updateDailyCheckIn":
      return `Update today's check-in: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    default:
      return "Review requested action";
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
  activeWorkout,
  onSend,
  onEnd,
  onTextFallback,
  onSettingsChange,
}: {
  settings: ReturnType<typeof useStore>["state"]["jarvisSettings"];
  providerModel: string;
  activeWorkout: { name: string; exercise?: string; setNumber: number } | null;
  onSend: (
    text: string,
    options?: { voiceResponseLength?: "short" | "normal" | "detailed" },
  ) => Promise<string | undefined>;
  onEnd: (entries: VoiceTranscriptEntry[]) => void;
  onTextFallback: (entries: VoiceTranscriptEntry[]) => void;
  onSettingsChange: (
    patch: Partial<ReturnType<typeof useStore>["state"]["jarvisSettings"]>,
  ) => void;
}) {
  const [phase, setPhase] = useState<VoicePhase>("paused");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [supportNotice, setSupportNotice] = useState("");
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [showWorkout, setShowWorkout] = useState(Boolean(activeWorkout));
  const [entries, setEntries] = useState<VoiceTranscriptEntry[]>([]);
  const [userTalking, setUserTalking] = useState(false);
  const [closePending, setClosePending] = useState(false);

  const settingsRef = useRef(settings);
  const entriesRef = useRef<VoiceTranscriptEntry[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const activeRef = useRef(true);
  const phaseRef = useRef<VoicePhase>("paused");
  const finalTextRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentTranscriptsRef = useRef(new Map<string, number>());
  const errorCountRef = useRef(0);
  const voiceTurnsRef = useRef(0);
  const aiCallsRef = useRef(0);
  const lastSpokenRef = useRef("");
  const lastFullReplyRef = useRef("");
  const closePendingRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});
  const handleLocalCommandRef = useRef<(text: string) => boolean>(() => false);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const visualFrameRef = useRef<number | null>(null);
  const volumeRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const talkingRef = useRef(false);
  const talkingUpdateRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const updatePhase = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const addEntry = useCallback(
    (role: VoiceTranscriptEntry["role"], text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const entry: VoiceTranscriptEntry = {
        id: uid(),
        role,
        text: clean,
        createdAt: Date.now(),
      };
      entriesRef.current = [...entriesRef.current, entry];
      setEntries(entriesRef.current);
    },
    [],
  );

  const updateVoiceSettings = useCallback(
    (
      patch: Partial<ReturnType<typeof useStore>["state"]["jarvisSettings"]>,
    ) => {
      settingsRef.current = { ...settingsRef.current, ...patch };
      onSettingsChange(patch);
    },
    [onSettingsChange],
  );

  const vibrate = useCallback((pattern: number | number[]) => {
    if (settingsRef.current.voiceHaptics === false) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Haptics are optional.
    }
  }, []);

  const clearVoiceTimers = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    silenceTimerRef.current = null;
    restartTimerRef.current = null;
    inactivityTimerRef.current = null;
  }, []);

  const stopRecognition = useCallback((abort = false) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    silenceTimerRef.current = null;
    restartTimerRef.current = null;
    try {
      if (abort) recognitionRef.current?.abort();
      else recognitionRef.current?.stop();
    } catch {
      // Recognition may already be stopped.
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const wakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    try {
      await wakeLock?.release();
    } catch {
      // Wake Lock is optional.
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (settingsRef.current.voiceKeepAwake === false || document.hidden) return;
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
      };
    };
    if (!nav.wakeLock || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch {
      // Fail silently on unsupported or denied Wake Lock.
    }
  }, []);

  const stopAudioMeter = useCallback(async () => {
    if (analyserFrameRef.current)
      cancelAnimationFrame(analyserFrameRef.current);
    analyserFrameRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    try {
      await context?.close();
    } catch {
      // The context may already be closed.
    }
    volumeRef.current = 0;
    setUserTalking(false);
  }, []);

  const cleanupResources = useCallback(() => {
    activeRef.current = false;
    clearVoiceTimers();
    stopRecognition(true);
    window.speechSynthesis?.cancel();
    if (visualFrameRef.current) cancelAnimationFrame(visualFrameRef.current);
    visualFrameRef.current = null;
    void stopAudioMeter();
    void releaseWakeLock();
  }, [clearVoiceTimers, releaseWakeLock, stopAudioMeter, stopRecognition]);

  const ensureAudioMeter = useCallback(async () => {
    if (audioStreamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStreamRef.current = stream;

    if (typeof AudioContext === "undefined") return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.76;
    context.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = context;
    analyserRef.current = analyser;
    const samples = new Uint8Array(analyser.frequencyBinCount);

    const sampleVolume = () => {
      if (!activeRef.current || !analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(samples);
      let energy = 0;
      for (const sample of samples) {
        const centered = (sample - 128) / 128;
        energy += centered * centered;
      }
      const volume = Math.min(1, Math.sqrt(energy / samples.length) * 5);
      volumeRef.current = volume;
      const talking = phaseRef.current === "listening" && volume > 0.07;
      const now = performance.now();
      if (
        talking !== talkingRef.current &&
        now - talkingUpdateRef.current > 100
      ) {
        talkingRef.current = talking;
        talkingUpdateRef.current = now;
        setUserTalking(talking);
      }
      analyserFrameRef.current = requestAnimationFrame(sampleVolume);
    };
    sampleVolume();
  }, []);

  const scheduleInactivityPause = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (!activeRef.current || phaseRef.current !== "listening") return;
      stopRecognition(true);
      updatePhase("paused");
      const notice = "I paused voice mode after inactivity.";
      addEntry("system", notice);
      setReply(notice);
      const synthesis = window.speechSynthesis;
      if (
        synthesis &&
        typeof SpeechSynthesisUtterance !== "undefined" &&
        settingsRef.current.spokenResponses !== false &&
        !settingsRef.current.voiceOutputMuted
      ) {
        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(notice);
        utterance.rate = 1;
        utterance.onend = () => updatePhase("paused");
        synthesis.speak(utterance);
      }
    }, 120_000);
  }, [addEntry, stopRecognition, updatePhase]);

  const speak = useCallback(
    (
      text: string,
      options: { resumeAfter?: boolean; remember?: boolean } = {},
    ) => {
      const clean = text.trim();
      const resumeAfter =
        options.resumeAfter ??
        settingsRef.current.autoListenAfterReply !== false;
      if (!clean) {
        if (resumeAfter) startListeningRef.current();
        else updatePhase("paused");
        return;
      }
      if (options.remember !== false) lastSpokenRef.current = clean;
      const synthesis = window.speechSynthesis;
      stopRecognition(true);

      if (
        settingsRef.current.spokenResponses === false ||
        settingsRef.current.voiceOutputMuted
      ) {
        if (resumeAfter) startListeningRef.current();
        else updatePhase("paused");
        return;
      }
      if (!synthesis || typeof SpeechSynthesisUtterance === "undefined") {
        const notice = "Spoken replies are not supported in this browser.";
        setSupportNotice(notice);
        addEntry("system", notice);
        if (resumeAfter) startListeningRef.current();
        else updatePhase("paused");
        return;
      }

      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      const voices = synthesis.getVoices();
      const selected = voices.find(
        (voice) => voice.name === settingsRef.current.voiceName,
      );
      if (selected) utterance.voice = selected;
      utterance.rate =
        settingsRef.current.voiceRateMode === "slow"
          ? 0.85
          : settingsRef.current.voiceRateMode === "fast"
            ? 1.15
            : 1;
      utterance.onstart = () => {
        updatePhase("speaking");
        vibrate(20);
      };
      utterance.onend = () => {
        if (!activeRef.current) return;
        if (resumeAfter) startListeningRef.current();
        else updatePhase("paused");
      };
      utterance.onerror = () => {
        if (!activeRef.current) return;
        const notice = "Spoken replies are not supported in this browser.";
        setSupportNotice(notice);
        addEntry("system", notice);
        if (resumeAfter) startListeningRef.current();
        else updatePhase("paused");
      };
      synthesis.speak(utterance);
    },
    [addEntry, stopRecognition, updatePhase, vibrate],
  );

  const localReply = useCallback(
    (
      text: string,
      options: { resumeAfter?: boolean; remember?: boolean } = {},
    ) => {
      setReply(text);
      addEntry("assistant", text);
      speak(text, options);
    },
    [addEntry, speak],
  );

  const shortenLocally = useCallback((text: string) => {
    const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
    const compact = firstSentence || text.trim();
    return compact.length <= 150 ? compact : `${compact.slice(0, 147)}...`;
  }, []);

  const finishVoice = useCallback(() => {
    cleanupResources();
    onEnd(entriesRef.current);
  }, [cleanupResources, onEnd]);

  const useTextFallback = useCallback(() => {
    cleanupResources();
    onTextFallback(entriesRef.current);
  }, [cleanupResources, onTextFallback]);

  const requestClose = useCallback(() => {
    if (closePendingRef.current) {
      finishVoice();
      return;
    }
    closePendingRef.current = true;
    setClosePending(true);
    localReply("End voice mode?", { resumeAfter: true });
  }, [finishVoice, localReply]);

  const processTranscript = useCallback(
    async (rawText: string) => {
      const text = rawText.trim().replace(/\s+/g, " ");
      if (!text || !activeRef.current || phaseRef.current === "processing") {
        return;
      }

      const key = text.toLocaleLowerCase();
      const now = Date.now();
      for (const [oldKey, timestamp] of recentTranscriptsRef.current) {
        if (now - timestamp > 4_000) {
          recentTranscriptsRef.current.delete(oldKey);
        }
      }
      if (recentTranscriptsRef.current.has(key)) {
        recordVoiceDiagnostics({
          duplicateTranscriptPrevented: true,
          lastTranscript: text,
        });
        setError("Duplicate transcript ignored.");
        restartTimerRef.current = setTimeout(
          () => startListeningRef.current(),
          500,
        );
        return;
      }
      recentTranscriptsRef.current.set(key, now);
      addEntry("user", text);
      voiceTurnsRef.current += 1;
      setTranscript(text);
      setError("");
      recordVoiceDiagnostics({
        voiceTurnsThisSession: voiceTurnsRef.current,
        aiCallsThisSession: aiCallsRef.current,
        lastTranscript: text,
        duplicateTranscriptPrevented: false,
      });

      if (handleLocalCommandRef.current(text)) return;

      updatePhase("processing");
      stopRecognition();
      const responseMode = settingsRef.current.voiceResponseLength ?? "normal";
      const response = await onSend(text, {
        voiceResponseLength: responseMode,
      });
      if (!activeRef.current) return;

      let lastDiag: AiDiagnostics | undefined;
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(AI_DIAGNOSTICS_STORAGE) ?? "{}",
        ) as { calls?: AiDiagnostics[] };
        lastDiag = stored.calls?.at(-1);
      } catch {
        // Provider diagnostics are optional.
      }
      aiCallsRef.current +=
        1 + (lastDiag?.retryCount ?? 0) + (lastDiag?.fallbackCount ?? 0);

      const fullReply = response?.trim() || "Done.";
      lastFullReplyRef.current = fullReply;
      setReply(fullReply);
      addEntry("assistant", fullReply);
      const shouldShorten =
        responseMode === "short" ||
        (Boolean(activeWorkout) && responseMode !== "detailed");
      const spokenReply = shouldShorten ? shortenLocally(fullReply) : fullReply;
      if (/want me to (save|log)|confirm/i.test(fullReply)) {
        vibrate([20, 40, 20]);
      }
      recordVoiceDiagnostics({
        voiceTurnsThisSession: voiceTurnsRef.current,
        aiCallsThisSession: aiCallsRef.current,
        lastProviderModel: lastDiag?.actualModel ?? providerModel,
        autoRouting: Boolean(lastDiag?.routed),
        fallback: Boolean(lastDiag?.fallback),
      });
      speak(spokenReply);
    },
    [
      activeWorkout,
      addEntry,
      onSend,
      providerModel,
      shortenLocally,
      speak,
      stopRecognition,
      updatePhase,
      vibrate,
    ],
  );

  const submitFinal = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (settingsRef.current.confirmTranscriptBeforeSend) {
        setTranscript(text.trim());
        updatePhase("paused");
        return;
      }
      void processTranscript(text);
    },
    [processTranscript, updatePhase],
  );

  const startListening = useCallback(async () => {
    if (!activeRef.current || settingsRef.current.voiceInputEnabled === false) {
      return;
    }
    window.speechSynthesis?.cancel();
    stopRecognition(true);
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      const message =
        "Voice input is not supported in this browser. Type your message instead.";
      setError(message);
      addEntry("system", message);
      updatePhase("error");
      vibrate([40, 40, 40]);
      return;
    }

    try {
      await ensureAudioMeter();
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
        vibrate(12);
        scheduleInactivityPause();
      };
      recognition.onresult = (event) => {
        scheduleInactivityPause();
        let finalChunk = "";
        for (
          let index = event.resultIndex;
          index < event.results.length;
          index += 1
        ) {
          const result = event.results[index];
          if (result.isFinal) {
            finalChunk += `${result[0]?.transcript ?? ""} `;
          }
        }
        if (!finalChunk.trim()) return;
        finalTextRef.current = `${finalTextRef.current} ${finalChunk}`.trim();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(
          () => {
            const completed = finalTextRef.current;
            finalTextRef.current = "";
            silenceTimerRef.current = null;
            try {
              recognition.stop();
            } catch {
              // Recognition may already be stopped.
            }
            submitFinal(completed);
          },
          Math.max(500, settingsRef.current.voiceSilenceDelayMs ?? 1200),
        );
      };
      recognition.onerror = (event) => {
        if (!activeRef.current || event.error === "aborted") return;
        errorCountRef.current += 1;
        const message =
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Microphone permission is blocked. Enable it in your browser settings."
            : "Voice input stopped unexpectedly. Restart listening.";
        setError(message);
        addEntry("system", message);
        updatePhase(errorCountRef.current >= 3 ? "paused" : "error");
        vibrate([40, 40, 40]);
      };
      recognition.onend = () => {
        if (
          !activeRef.current ||
          phaseRef.current !== "listening" ||
          silenceTimerRef.current ||
          finalTextRef.current
        ) {
          return;
        }
        restartTimerRef.current = setTimeout(
          () => startListeningRef.current(),
          400,
        );
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (caught) {
      const denied =
        caught instanceof DOMException &&
        (caught.name === "NotAllowedError" || caught.name === "SecurityError");
      const message = denied
        ? "Microphone permission is blocked. Enable it in your browser settings."
        : "Voice input stopped unexpectedly. Restart listening.";
      setError(message);
      addEntry("system", message);
      updatePhase("error");
      vibrate([40, 40, 40]);
    }
  }, [
    addEntry,
    ensureAudioMeter,
    scheduleInactivityPause,
    stopRecognition,
    submitFinal,
    updatePhase,
    vibrate,
  ]);

  useEffect(() => {
    startListeningRef.current = () => {
      void startListening();
    };
  }, [startListening]);

  const handleLocalCommand = useCallback(
    (rawText: string) => {
      const normalized = rawText
        .toLocaleLowerCase()
        .replace(/[.!?]+$/g, "")
        .trim();
      const command = normalized.replace(/^jarvis[, ]+/, "");

      if (closePendingRef.current) {
        if (/^(yes|confirm|end|close|stop)$/.test(command)) {
          finishVoice();
          return true;
        }
        if (/^(cancel|no|stay|keep listening)$/.test(command)) {
          closePendingRef.current = false;
          setClosePending(false);
          localReply("Okay. Voice mode is still on.");
          return true;
        }
      }

      if (/^(close|end voice|stop voice mode|end voice mode)$/.test(command)) {
        requestClose();
        return true;
      }
      if (/^(show transcript|view transcript)$/.test(command)) {
        setTranscriptVisible(true);
        setTranscriptExpanded(false);
        localReply("Transcript shown.");
        return true;
      }
      if (/^(view full transcript)$/.test(command)) {
        setTranscriptVisible(true);
        setTranscriptExpanded(true);
        localReply("Full transcript shown.");
        return true;
      }
      if (/^(hide transcript)$/.test(command)) {
        setTranscriptVisible(false);
        setTranscriptExpanded(false);
        localReply("Transcript hidden.");
        return true;
      }
      if (/^(pause|stop listening)$/.test(command)) {
        stopRecognition(true);
        updatePhase("paused");
        localReply("Paused.", { resumeAfter: false });
        return true;
      }
      if (/^(resume|start listening)$/.test(command)) {
        closePendingRef.current = false;
        setClosePending(false);
        startListeningRef.current();
        return true;
      }
      if (command === "mute") {
        updateVoiceSettings({ voiceOutputMuted: true });
        setReply("Muted.");
        addEntry("assistant", "Muted.");
        startListeningRef.current();
        return true;
      }
      if (command === "unmute") {
        updateVoiceSettings({ voiceOutputMuted: false });
        localReply("Unmuted.");
        return true;
      }
      if (command === "speak slower") {
        updateVoiceSettings({ voiceRateMode: "slow" });
        localReply("I'll speak slower.");
        return true;
      }
      if (command === "speak faster") {
        updateVoiceSettings({ voiceRateMode: "fast" });
        localReply("I'll speak faster.");
        return true;
      }
      if (command === "normal speed") {
        updateVoiceSettings({ voiceRateMode: "normal" });
        localReply("Normal speed.");
        return true;
      }
      if (command === "repeat that") {
        if (lastSpokenRef.current) {
          speak(lastSpokenRef.current, { remember: false });
        } else {
          localReply("There isn't a previous answer to repeat.");
        }
        return true;
      }
      if (command === "say that shorter") {
        const shorter = shortenLocally(
          lastFullReplyRef.current || lastSpokenRef.current,
        );
        if (shorter) localReply(shorter);
        else localReply("There isn't a previous answer to shorten.");
        return true;
      }
      if (
        /^(give me more detail|longer response|detailed responses)$/.test(
          command,
        )
      ) {
        updateVoiceSettings({ voiceResponseLength: "detailed" });
        localReply("Detailed responses on.");
        return true;
      }
      if (/^(short responses|shorter responses)$/.test(command)) {
        updateVoiceSettings({ voiceResponseLength: "short" });
        localReply("Short responses on.");
        return true;
      }
      if (/^(normal responses)$/.test(command)) {
        updateVoiceSettings({ voiceResponseLength: "normal" });
        localReply("Normal responses on.");
        return true;
      }
      if (command === "show workout") {
        setShowWorkout(true);
        localReply(activeWorkout ? "Workout shown." : "No workout is active.");
        return true;
      }
      if (command === "hide workout") {
        setShowWorkout(false);
        localReply("Workout hidden.");
        return true;
      }
      return false;
    },
    [
      activeWorkout,
      addEntry,
      finishVoice,
      localReply,
      requestClose,
      shortenLocally,
      speak,
      stopRecognition,
      updatePhase,
      updateVoiceSettings,
    ],
  );

  useEffect(() => {
    handleLocalCommandRef.current = handleLocalCommand;
  }, [handleLocalCommand]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      if (!activeRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * pixelRatio));
      const height = Math.max(1, Math.floor(rect.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      const color =
        phaseRef.current === "listening"
          ? "#a855f7"
          : phaseRef.current === "speaking"
            ? "#3b82f6"
            : phaseRef.current === "error"
              ? "#ef4444"
              : phaseRef.current === "paused"
                ? "#cbd5e1"
                : "#f8fafc";
      const barCount = 45;
      const gap = 3;
      const barWidth = Math.max(
        2,
        (rect.width - gap * (barCount - 1)) / barCount,
      );
      const center = rect.height / 2;
      const time = performance.now() / 240;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = phaseRef.current === "paused" ? 4 : 12;
      context.globalAlpha = phaseRef.current === "paused" ? 0.42 : 0.92;

      for (let index = 0; index < barCount; index += 1) {
        const distance = Math.abs(index - (barCount - 1) / 2);
        const envelope = 1 - (distance / (barCount / 2)) * 0.55;
        let energy = 0.13;
        if (phaseRef.current === "listening") {
          energy = 0.12 + volumeRef.current * 1.25;
        } else if (phaseRef.current === "speaking") {
          energy =
            0.34 +
            (Math.sin(time + index * 0.58) + 1) * 0.22 +
            (Math.sin(time * 0.63 + index * 0.22) + 1) * 0.09;
        } else if (phaseRef.current === "processing") {
          energy = 0.2 + (Math.sin(time * 1.25 - distance * 0.2) + 1) * 0.2;
        } else if (phaseRef.current === "error") {
          energy = 0.2 + (Math.sin(time * 2.2 + index * 0.8) + 1) * 0.13;
        }
        const jitter =
          phaseRef.current === "listening"
            ? (Math.sin(time * 1.8 + index * 0.7) + 1) * 0.08
            : 0;
        const barHeight = Math.max(
          4,
          Math.min(
            rect.height * 0.9,
            rect.height * (energy + jitter) * envelope,
          ),
        );
        const x = index * (barWidth + gap);
        context.beginPath();
        context.roundRect(
          x,
          center - barHeight / 2,
          barWidth,
          barHeight,
          barWidth / 2,
        );
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      visualFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (visualFrameRef.current) {
        cancelAnimationFrame(visualFrameRef.current);
      }
      visualFrameRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    recordVoiceDiagnostics({
      voiceTurnsThisSession: 0,
      aiCallsThisSession: 0,
      duplicateTranscriptPrevented: false,
      transcriptStorage:
        settingsRef.current.saveVoiceTranscripts === false ? "off" : "on",
      transcriptRetention:
        settingsRef.current.voiceTranscriptRetentionDays === 0
          ? "forever"
          : `${settingsRef.current.voiceTranscriptRetentionDays ?? 30} days`,
    });
    vibrate(20);
    void requestWakeLock();
    void startListening();

    const handleVisibility = () => {
      if (!document.hidden) void requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("visibilitychange", handleVisibility);
      cleanupResources();
    };
  }, [cleanupResources, requestWakeLock, startListening, vibrate]);

  const handleOrbTap = () => {
    if (phase === "listening") {
      stopRecognition(true);
      updatePhase("paused");
      return;
    }
    if (phase === "paused" || phase === "error") {
      void startListening();
      return;
    }
    if (phase === "speaking") {
      window.speechSynthesis?.cancel();
      void startListening();
    }
  };

  const stateLabel =
    phase === "listening"
      ? userTalking
        ? "Listening · You're speaking"
        : "Listening"
      : phase === "processing"
        ? "Processing"
        : phase === "speaking"
          ? "Speaking"
          : phase === "error"
            ? "Error"
            : "Paused";

  const stateColor =
    phase === "listening"
      ? "#a855f7"
      : phase === "speaking"
        ? "#3b82f6"
        : phase === "error"
          ? "#ef4444"
          : phase === "paused"
            ? "#cbd5e1"
            : "#f8fafc";

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col overflow-hidden bg-[#050508] text-white"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        backgroundImage:
          "radial-gradient(circle at 50% 38%, color-mix(in oklab, var(--section) 18%, transparent) 0%, transparent 38%), radial-gradient(circle at 20% 90%, rgba(59,130,246,.10), transparent 34%), linear-gradient(180deg, #090711 0%, #050508 55%, #040407 100%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Jarvis voice mode"
    >
      <div className="flex items-center gap-3 px-4 sm:px-6">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 backdrop-blur">
          {providerModel}
        </span>
        <span
          className="ml-auto text-xs font-semibold tracking-[0.18em] uppercase"
          style={{ color: stateColor }}
        >
          {stateLabel}
        </span>
        <button
          onClick={requestClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={
            closePending ? "Confirm end voice mode" : "End voice mode"
          }
        >
          <X size={17} />
        </button>
      </div>

      {closePending && (
        <div className="mx-auto mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur">
          Say “yes” to end or “cancel” to stay.
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        {showWorkout && activeWorkout && (
          <div className="absolute top-5 left-1/2 w-[min(88vw,28rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center backdrop-blur-md">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">
              Active workout
            </p>
            <p className="mt-1 text-sm font-semibold">{activeWorkout.name}</p>
            {activeWorkout.exercise && (
              <p className="mt-0.5 text-xs text-white/55">
                {activeWorkout.exercise} · Set {activeWorkout.setNumber}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleOrbTap}
          disabled={phase === "processing"}
          className="group relative flex h-52 w-52 items-center justify-center rounded-full outline-none transition-transform active:scale-[0.98] disabled:cursor-wait sm:h-64 sm:w-64"
          aria-label={
            phase === "listening"
              ? "Pause listening"
              : phase === "speaking"
                ? "Interrupt Jarvis and listen"
                : phase === "processing"
                  ? "Jarvis is processing"
                  : "Resume listening"
          }
        >
          <span
            className="absolute inset-5 rounded-full opacity-25 blur-2xl transition-colors duration-500"
            style={{ background: stateColor }}
          />
          <span
            className="absolute inset-9 rounded-full border transition-all duration-500"
            style={{
              borderColor: `${stateColor}66`,
              boxShadow: `0 0 60px ${stateColor}33, inset 0 0 36px ${stateColor}1f`,
              transform:
                phase === "listening" && userTalking
                  ? `scale(${1 + volumeRef.current * 0.12})`
                  : "scale(1)",
            }}
          />
          <span
            className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-xl transition-colors duration-500 sm:h-32 sm:w-32"
            style={{
              boxShadow: `0 0 50px ${stateColor}40, inset 0 0 28px ${stateColor}20`,
            }}
          >
            {phase === "processing" ? (
              <Loader2 className="animate-spin" color={stateColor} size={38} />
            ) : phase === "speaking" ? (
              <Volume2 color={stateColor} size={38} />
            ) : phase === "error" ? (
              <MicOff color={stateColor} size={38} />
            ) : (
              <Mic color={stateColor} size={38} />
            )}
          </span>
        </button>

        <canvas
          ref={canvasRef}
          className="mt-2 h-28 w-[min(92vw,34rem)]"
          aria-label="Voice activity waveform"
        />

        <div className="mt-3 min-h-12 text-center">
          <p className="text-lg font-semibold tracking-tight">{stateLabel}</p>
          <p className="mt-1 text-xs text-white/40">
            {phase === "listening"
              ? "Speak naturally · tap to pause"
              : phase === "speaking"
                ? "Tap to interrupt"
                : phase === "processing"
                  ? "Jarvis is working"
                  : phase === "error"
                    ? "Tap the orb to retry"
                    : "Tap the orb to resume"}
          </p>
        </div>

        {error && (
          <p className="mt-3 max-w-md text-center text-sm text-red-400">
            {error}
          </p>
        )}
        {supportNotice && (
          <p className="mt-2 max-w-md text-center text-xs text-white/45">
            {supportNotice}
          </p>
        )}
      </div>

      {transcriptVisible && (
        <div
          className={`mx-4 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl transition-all sm:mx-auto sm:w-[min(92vw,42rem)] ${
            transcriptExpanded ? "max-h-[58dvh]" : "max-h-[32dvh]"
          }`}
        >
          <div className="flex items-center border-b border-white/10 px-4 py-3">
            <History size={15} className="text-white/45" />
            <span className="ml-2 text-xs font-semibold tracking-wide text-white/70">
              Voice transcript
            </span>
            <button
              onClick={() => setTranscriptExpanded((value) => !value)}
              className="ml-auto text-[11px] text-white/45 hover:text-white/80"
            >
              {transcriptExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
          <div className="max-h-[inherit] space-y-3 overflow-y-auto px-4 py-3">
            {entries.length === 0 ? (
              <p className="text-xs text-white/35">
                Conversation will appear here.
              </p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="text-sm leading-relaxed">
                  <span
                    className="mr-2 text-[10px] font-bold tracking-wider uppercase"
                    style={{
                      color:
                        entry.role === "user"
                          ? "#c084fc"
                          : entry.role === "assistant"
                            ? "#60a5fa"
                            : "#f87171",
                    }}
                  >
                    {entry.role === "assistant" ? "Jarvis" : entry.role}
                  </span>
                  <span className="text-white/75">{entry.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {phase === "paused" &&
        settingsRef.current.confirmTranscriptBeforeSend &&
        transcript && (
          <div className="mx-auto mb-3 flex max-w-lg items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="min-w-0 flex-1 truncate text-sm text-white/70">
              {transcript}
            </p>
            <button
              onClick={() => void processTranscript(transcript)}
              className="rounded-full px-4 py-2 text-xs font-semibold text-black"
              style={{ background: "#f8fafc" }}
            >
              Send
            </button>
          </div>
        )}

      <div className="flex items-center justify-center gap-2 px-4">
        <button
          onClick={() => setTranscriptVisible((value) => !value)}
          className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/55 hover:bg-white/10 hover:text-white"
          aria-label={transcriptVisible ? "Hide transcript" : "Show transcript"}
        >
          {transcriptVisible ? <EyeOff size={15} /> : <Eye size={15} />}
          <span className="hidden min-[360px]:inline">
            {transcriptVisible ? "Hide" : "Transcript"}
          </span>
        </button>
        <button
          onClick={() =>
            updateVoiceSettings({
              voiceOutputMuted: !settingsRef.current.voiceOutputMuted,
            })
          }
          className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/55 hover:bg-white/10 hover:text-white"
          aria-label={
            settingsRef.current.voiceOutputMuted
              ? "Unmute spoken replies"
              : "Mute spoken replies"
          }
        >
          {settingsRef.current.voiceOutputMuted ? (
            <VolumeX size={15} />
          ) : (
            <Volume2 size={15} />
          )}
          <span className="hidden min-[360px]:inline">
            {settingsRef.current.voiceOutputMuted ? "Unmute" : "Mute"}
          </span>
        </button>
        <button
          onClick={useTextFallback}
          className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/55 hover:bg-white/10 hover:text-white"
        >
          <Keyboard size={15} />
          <span className="hidden min-[360px]:inline">Type</span>
        </button>
        {(phase === "error" || phase === "paused") && (
          <button
            onClick={() => void startListening()}
            className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/55 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={15} />
            <span className="hidden min-[360px]:inline">Retry</span>
          </button>
        )}
      </div>

      <p className="mt-3 px-4 text-center text-[10px] text-white/25">
        Voice mode works best in Chrome or Edge.
      </p>
    </div>
  );
}
