import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Loader2, Mic, Undo2, X } from "lucide-react";
import { BottomSheet } from "../sheet";
import { Chip, GhostButton } from "../ui";
import { useStore, uid } from "@/lib/store";
import { aiChat } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { TOOL_SPECS, runTool, undoAuditEntry, type ToolResult } from "@/lib/jarvis/tools";
import { ConfirmCard } from "./confirm-card";
import { SourceBadge } from "./source-badge";

type ChatResp = { ok: true; content: string; toolCalls?: { id: string; name: string; argsJson: string }[] } | { ok: false; error: string };

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

function readSavedGeminiKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GEMINI_KEY_STORAGE) ?? "";
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
  const { state, set } = useStore();
  const stateRef = useRef(state);
  const chatFn = useServerFn(aiChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [open, messages.length]);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("fitcore:open-ai", h);
    window.addEventListener("fitcore:open-jarvis", h);
    return () => { window.removeEventListener("fitcore:open-ai", h); window.removeEventListener("fitcore:open-jarvis", h); };
  }, []);

  const settings = state.jarvisSettings;

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    if (!settings.enabled) {
      setMessages(m => [...m, { id: uid(), role: "assistant", content: "Jarvis is disabled. Enable it in Settings > Jarvis AI.", createdAt: Date.now() }]);
      return;
    }
    setInput("");
    setSending(true);
    const userMsg: RenderedMsg = { id: uid(), role: "user", content, createdAt: Date.now() };
    setMessages(m => [...m, userMsg]);

    try {
      const recent = [...messages.slice(-8), userMsg].map(m => ({ role: m.role, content: m.content }));
      const tools = settings.permission === 1 ? TOOL_SPECS.filter(t => t.name.startsWith("get")) : TOOL_SPECS;
      const sysPrompt = jarvisSystemPrompt(stateRef.current, section, contextSummary);
      const res = await chatFn({ data: {
        messages: recent,
        mode: settings.responseStyle === "detailed" ? "detailed" : "quick",
        systemOverride: sysPrompt,
        tools,
        provider: settings.aiProvider,
        geminiKeyMode: settings.geminiKeyMode,
        userGeminiApiKey: settings.aiProvider === "gemini" && settings.geminiKeyMode === "user" ? readSavedGeminiKey() : undefined,
      } }) as ChatResp;

      if (!res.ok) {
        setMessages(m => [...m, { id: uid(), role: "assistant", content: `Warning: ${res.error}`, createdAt: Date.now() }]);
        return;
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

      setMessages(m => [...m, { id: uid(), role: "assistant", content: res.content || (toolResults.length ? "" : "(no reply)"), toolResults, createdAt: Date.now() }]);
    } catch (err) {
      setMessages(m => [...m, { id: uid(), role: "assistant", content: `Warning: ${err instanceof Error ? err.message : "Jarvis failed"}`, createdAt: Date.now() }]);
    } finally {
      setSending(false);
    }
  }, [sending, settings, messages, chatFn, set, section, contextSummary]);

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

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed z-20 right-4 bottom-[calc(96px+env(safe-area-inset-bottom))] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-95 transition-transform"
        style={{ background: "var(--section)", boxShadow: "0 10px 40px -5px color-mix(in oklab, var(--section) 60%, transparent)" }}
        aria-label="Open Jarvis">
        <Sparkles size={22} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Jarvis" height="tall">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)]">
            <span className={`w-1.5 h-1.5 rounded-full ${sending ? "animate-pulse" : ""}`} style={{ background: sending ? "var(--section)" : "var(--success, #10b981)" }} />
            {sending ? "Thinking..." : "Ready"}
          </span>
          <span className="ml-auto capitalize">{settings.aiProvider === "gemini" ? "Gemini" : "Legacy"} / L{settings.permission}</span>
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
          {messages.map(m => (
            <div key={m.id} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.content && (
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "text-white" : "bg-[var(--surface-2)]"}`}
                  style={m.role === "user" ? { background: "var(--section)" } : undefined}>
                  {m.content}
                </div>
              )}
              {m.toolResults?.map((tr, i) => (
                <ConfirmCard key={i} tool={tr.tool} result={tr.result}
                  onConfirm={() => applyPending(m.id, i)}
                  onCancel={() => cancelPending(m.id, i)}
                  onUndo={tr.result.auditId ? () => undoAction(tr.result.auditId!) : undefined} />
              ))}
            </div>
          ))}
          {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Jarvis is thinking...</div>}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-1 px-1">
          {SUGGESTED.map(s => <Chip key={s} onClick={() => send(s)}>{s}</Chip>)}
        </div>

        <div className="flex gap-2 sticky bottom-0 pb-2 pt-1" style={{ background: "var(--surface)" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(input); }}
            placeholder="Talk to Jarvis..." className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)]" />
          <button disabled title="Voice mode - coming in Phase 6" className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--surface-2)] text-muted-foreground opacity-60">
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
    default: return tool;
  }
}

export { SourceBadge };

export function JarvisUndoSnackbar() {
  const { state, set } = useStore();
  const [shown, setShown] = useState<string | null>(null);
  const last = state.jarvisAudit[0];
  useEffect(() => {
    if (!last || last.undone || last.status !== "logged") return;
    if (last.id === shown) return;
    setShown(last.id);
    const t = window.setTimeout(() => setShown(null), 5000);
    return () => window.clearTimeout(t);
  }, [last?.id, last?.status, last?.undone, shown]);
  if (!shown || !last || last.id !== shown) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(132px+env(safe-area-inset-bottom))] z-30 px-3 py-2.5 rounded-xl bg-foreground text-background shadow-2xl flex items-center gap-2 text-sm max-w-[92%]">
      <span className="truncate">Saved: {last.summary}</span>
      <button onClick={() => { undoAuditEntry(last.id, state, set); setShown(null); }} className="font-semibold flex items-center gap-1 underline-offset-2 hover:underline shrink-0" aria-label="Undo last Jarvis action">
        <Undo2 size={14} /> Undo
      </button>
      <button onClick={() => setShown(null)} className="p-1 rounded-md hover:bg-background/10 shrink-0" aria-label="Dismiss undo notification">
        <X size={14} />
      </button>
    </div>
  );
}
