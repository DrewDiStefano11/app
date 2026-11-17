import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Loader2, Mic } from "lucide-react";
import { BottomSheet } from "../sheet";
import { Chip, GhostButton } from "../ui";
import { jarvisProviderKeys } from "@/lib/jarvis/provider-keys";
import { useStore, uid } from "@/lib/store";
import { aiChat } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { reserveJarvisCloudTextRequest } from "@/lib/jarvis/cloud-usage";
import { mealItemTotals, type JarvisMealItem } from "@/lib/jarvis/meal-math";
import { interpretJarvisText, type JarvisTextContext } from "@/lib/jarvis/text-commands";
import { canProposeJarvisMutation } from "@/lib/jarvis/action-schemas";
import { isReadOnlyJarvisTool, TOOL_SPECS, runTool, undoAuditEntry, type ToolResult } from "@/lib/jarvis/tools";
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
  toolResults?: { tool: string; result: ToolResult; pending?: { draftId: string; args: Record<string, unknown>; base: ReturnType<typeof useStore>["state"]; reviewedAt: Date } }[];
  createdAt: number;
  local?: boolean;
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

const AI_DIAGNOSTICS_STORAGE = "fitcore.jarvis.aiDiagnostics.v1";


function normalizedKeyMode(mode: ReturnType<typeof useStore>["state"]["jarvisSettings"]["geminiKeyMode"]): "local" | "environment" {
  return mode === "environment" ? "environment" : "local";
}

function recordDiagnostics(diag?: AiDiagnostics) {
  if (!diag || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(AI_DIAGNOSTICS_STORAGE);
    const previous = raw ? JSON.parse(raw) as { calls?: AiDiagnostics[] } | null : null;
    const history = Array.isArray(previous?.calls) ? previous.calls : [];
    const calls = [...history, { ...diag, timestamp: diag.timestamp ?? Date.now() }].slice(-50);
    window.localStorage.setItem(AI_DIAGNOSTICS_STORAGE, JSON.stringify({ calls }));
    window.dispatchEvent(new CustomEvent("fitcore:jarvis-ai-diagnostics"));
  } catch {
    // Provider diagnostics are optional when browser storage is unavailable.
  }
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
  if (toolResults?.length) return "";
  const trimmed = content.trim();
  return TOOL_SPECS.some(tool => tool.name === trimmed) ? "" : trimmed;
}

function jarvisSystemPrompt(state: ReturnType<typeof useStore>["state"], section: string): string {
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
    3: "Permission: PROPOSE CHANGES. Every data write requires user confirmation.",
    4: "Permission: PROPOSE CHANGES. Every data write requires user confirmation.",
  }[s.permission];
  return [
    "You are Jarvis, the AI control layer for the user's FitCore fitness app.",
    "You ONLY mutate app data via the provided tools. Never claim to log something without a tool call.",
    "A data write is pending until the user approves it and FitCore confirms the save.",
    "Do not repeat, replay, or confirm an older user action from previous turns. Only act on the current user message.",
    "FOOD: For natural-language meals, call logMeal with an item per food, estimated quantities and kcal, protein, carbs, and fat per item. Include assumptions and mark vague portions low confidence. Never claim a nutrition estimate is verified.",
    "USUAL MEALS: If the user says my usual/normal X, call logUsualMeal with the matching slot. If the usual is missing, ask a short follow-up.",
    "SUPPLEMENTS: 'Log creatine' -> logSupplement. Use getSupplementStatus to answer whether supplements were taken today.",
    "BODYWEIGHT: 'Log 185.4 lb' -> logBodyWeight with originalText.",
    "WORKOUTS: Only use logWorkout for an explicitly completed separate workout with actual measurements. Planned set targets are never completed sets. Ask about missing details. Cardio goes through logCardio.",
    "ACTIVE WORKOUT: Use getActiveWorkout, logExerciseSet, updateActiveWorkout, suggestActiveWorkoutChange, finishActiveWorkout, and related tools. Ask before editing unless settings allow.",
    "If the user says yes/log that after something already saved, do not call a duplicate logging tool; answer that it is already logged.",
    "When uncertain, ask one short follow-up question. Never diagnose. Red-flag symptoms -> recommend medical care.",
    personaLine, styleLine, permLine,
    `Section: ${section}.`,
    "Use tool results for logged facts. If you have no verified result, say what is missing.",
  ].filter(Boolean).join("\n");
}

export function JarvisPanel({ section }: { section: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<RenderedMsg[]>([]);
  const { state, set } = useStore();
  const stateRef = useRef(state);
  const sendingRef = useRef(false);
  const conversation = useRef<JarvisTextContext>({});
  const resolvedDrafts = useRef(new WeakSet<object>());
  const chatFn = useServerFn(aiChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [open, messages.length]);
  useEffect(() => {
    const h = (event: Event) => {
      const detail = (event as CustomEvent<JarvisTextContext["focusedExercise"]>).detail;
      conversation.current.focusedExercise = detail ?? undefined;
      setOpen(true);
    };
    window.addEventListener("fitcore:open-ai", h);
    window.addEventListener("fitcore:open-jarvis", h);
    return () => { window.removeEventListener("fitcore:open-ai", h); window.removeEventListener("fitcore:open-jarvis", h); };
  }, []);

  const settings = state.jarvisSettings;
  const latestToolMessageId = [...messages].reverse().find(m => m.toolResults?.length)?.id;

  const reviewTool = useCallback((tool: string, args: Record<string, unknown>) => {
    const live = stateRef.current;
    const reviewedAt = new Date();
    const result = runTool(tool, args, { state: live, set, settings: live.jarvisSettings, now: reviewedAt });
    if (!result.needsConfirmation) return { tool, result };
    const draftId = uid();
    return {
      tool,
      result: {
        ...result,
        summary: ["addPlannedExerciseSet", "logUsualMeal", "logCaloriesOnly", "saveUsualMeal", "deleteUsualMeal", "logSleep", "logCardio", "updateBodyWeight", "logExerciseSet", "updateExerciseSet", "deleteExerciseSet", "updateMeal", "correctMealPortion", "deleteMeal", "updateWorkout", "updateActiveWorkout", "undoLastAction", "startRestTimer", "startScheduledWorkout"].includes(tool) ? result.summary : humanizeArgs(tool, args),
      },
      pending: { draftId, args: { ...(["logUsualMeal", "logWorkout"].includes(tool) ? args : result.data as Record<string, unknown>), draftId }, base: live, reviewedAt },
    };
  }, [set]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    if (!settings.enabled) {
      setInput(value => value || content);
      setMessages(m => [...m, { id: uid(), role: "assistant", content: "Jarvis is disabled. Enable it in Settings > Jarvis AI.", createdAt: Date.now() }]);
      sendingRef.current = false;
      return;
    }
    const live = stateRef.current;
    const context = conversation.current;
    const local = !live.demoMode && interpretJarvisText(content, live, new Date(), context);
    conversation.current = { focusedExercise: context.focusedExercise, lastMealId: context.lastMealId, ...(local ? local.nextContext : {}) };
    if (local) {
      setInput("");
      const createdAt = Date.now();
      const reply = "reply" in local
        ? { content: local.reply }
        : { content: "", toolResults: [reviewTool(local.tool, local.args)] };
      setMessages(previous => [
        ...stripToolCards(previous),
        { id: uid(), role: "user", content, createdAt, local: true },
        { ...reply, id: uid(), role: "assistant", createdAt, local: true },
      ]);
      sendingRef.current = false;
      return;
    }
    if (settings.allowCloudText !== true || stateRef.current.demoMode) {
      setInput(value => value || content);
      setMessages(m => [...m, {
        id: uid(), role: "assistant", createdAt: Date.now(),
        content: stateRef.current.demoMode
          ? "Cloud text is unavailable in demo mode."
          : "To send this message, enable cloud text in Settings > Jarvis AI.",
      }]);
      sendingRef.current = false;
      return;
    }
    const limit = reserveJarvisCloudTextRequest(window.localStorage);
    if (limit) {
      setInput(value => value || content);
      setMessages(previous => [...previous, { id: uid(), role: "assistant", content: limit, createdAt: Date.now() }]);
      sendingRef.current = false;
      return;
    }
    setInput("");
    setSending(true);
    const userMsg: RenderedMsg = { id: uid(), role: "user", content, createdAt: Date.now() };
    setMessages(m => [...stripToolCards(m), userMsg]);
    const restoreCloudDraft = (error: string) => {
      setInput(value => value || content);
      setMessages(previous => [
        ...previous.filter(message => message.id !== userMsg.id),
        { id: uid(), role: "assistant", content: error, createdAt: Date.now() },
      ]);
    };

    try {
      const recent = [...messages.filter(message => message.role === "user" && !message.local).slice(-4), userMsg]
        .map(message => ({ role: "user" as const, content: message.content.slice(0, 4_096) }));
      const tools = TOOL_SPECS.filter(tool => isReadOnlyJarvisTool(tool.name)
        || (settings.permission >= 2 && canProposeJarvisMutation(tool.name)));
      const sysPrompt = jarvisSystemPrompt(stateRef.current, section);
      const savedGeminiKey = jarvisProviderKeys.read("gemini").key;
      const savedGroqKey = jarvisProviderKeys.read("groq").key;
      const provider = settings.aiProvider ?? "groq";
      const res = await chatFn({ data: {
        messages: recent,
        mode: settings.responseStyle === "detailed" ? "detailed" : "quick",
        systemOverride: sysPrompt,
        tools,
        provider,
        geminiKeyMode: normalizedKeyMode(settings.geminiKeyMode),
        geminiModel: settings.geminiModel,
        userGeminiApiKey: (provider === "gemini" || settings.allowGeminiFallback) && savedGeminiKey ? savedGeminiKey : undefined,
        groqKeyMode: normalizedKeyMode(settings.groqKeyMode),
        groqModel: settings.groqModel,
        userGroqApiKey: provider === "groq" && savedGroqKey ? savedGroqKey : undefined,
        autoModelRouting: settings.autoModelRouting !== false,
        autoAiFallback: settings.autoAiFallback === true,
        allowGeminiFallback: Boolean(settings.allowGeminiFallback),
      } }) as ChatResp;
      recordDiagnostics(res.diagnostics);

      if (!res.ok) {
        restoreCloudDraft(`Warning: ${res.error}`);
        return;
      }

      const toolResults: RenderedMsg["toolResults"] = [];
      const staged = new Set<string>();
      for (const tc of res.toolCalls ?? []) {
        if (!tools.some(tool => tool.name === tc.name)) continue;
        const args = JSON.parse(tc.argsJson) as Record<string, unknown>;
        const toolArgs = { ...args };
        delete toolArgs.draftId;
        if (tc.name === "undoLastAction") delete toolArgs.targetAuditId;
        const fingerprint = `${tc.name}:${JSON.stringify(Object.entries(toolArgs).sort(([a], [b]) => a.localeCompare(b)))}`;
        if (staged.has(fingerprint)) continue;
        staged.add(fingerprint);

        if (stateRef.current.jarvisSettings.allowCloudText !== true) break;
        toolResults.push(reviewTool(tc.name, toolArgs));
      }

      const assistantContent = friendlyAssistantContent(res.toolCalls?.length ? "" : res.content, toolResults) || (toolResults.length ? "" : "I couldn't complete that request.");
      setMessages(m => [...m, { id: uid(), role: "assistant", content: assistantContent, toolResults, createdAt: Date.now() }]);
    } catch {
      restoreCloudDraft("Jarvis could not complete the request. Try again.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [settings, chatFn, messages, reviewTool, section]);

  useEffect(() => {
    const handleCompose = (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text?.trim();
      if (!text) return;
      setOpen(true);
      void send(text);
    };
    window.addEventListener("fitcore:jarvis-compose", handleCompose);
    return () => window.removeEventListener("fitcore:jarvis-compose", handleCompose);
  }, [send]);

  const applyPending = (msgId: string, idx: number, editedItems?: JarvisMealItem[]) => {
    const msg = messages.find(m => m.id === msgId);
    const existing = msg?.toolResults?.[idx];
    if (!existing?.pending || !existing.result.needsConfirmation) return;

    const { tool, pending } = existing;
    if (resolvedDrafts.current.has(pending)) return;
    resolvedDrafts.current.add(pending);
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.toolResults) return m;
      const tr = m.toolResults[idx];
      if (!tr?.pending || !tr.result.needsConfirmation) return m;
      const next = [...m.toolResults];
      next[idx] = { tool: tr.tool, result: { ...tr.result, summary: "Saving...", needsConfirmation: false } };
      return { ...m, toolResults: next };
    }));

    const current = stateRef.current;
    const mealPortionEdited = (tool === "logMeal" || tool === "logReferenceMeal") && editedItems !== undefined;
    const args = mealPortionEdited
      ? { ...pending.args, ...mealItemTotals(editedItems), items: editedItems }
      : pending.args;
    const sameReviewDay = !["startScheduledWorkout", "logDailyCheckIn", "updateDailyCheckIn"].includes(tool)
      || pending.reviewedAt.toDateString() === new Date().toDateString();
    const r = pending.base === current && sameReviewDay
      ? runTool(tool, args, { state: current, set, settings: current.jarvisSettings, confirmed: true, mealPortionEdited })
      : { ok: false, summary: "FitCore changed since this review. Ask again to review the current data." };
    if (r.ok && r.auditId && ["logMeal", "logReferenceMeal", "logUsualMeal", "correctMealPortion"].includes(tool)) {
      const saved = r.data as { id?: string } | undefined;
      if (saved?.id) conversation.current.lastMealId = saved.id;
    }
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.toolResults) return m;
      const next = [...m.toolResults];
      next[idx] = { tool, result: { ...r, needsConfirmation: false } };
      return { ...m, toolResults: next };
    }));
  };

  const cancelPending = (msgId: string, idx: number) => {
    const pending = messages.find(message => message.id === msgId)?.toolResults?.[idx]?.pending;
    if (pending) resolvedDrafts.current.add(pending);
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

  return (
    <>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Jarvis" height="tall">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-2)]">
            <span className={`w-1.5 h-1.5 rounded-full ${sending ? "animate-pulse" : ""}`} style={{ background: sending ? "var(--section)" : "var(--success, #10b981)" }} />
            {sending ? "Thinking..." : "Ready"}
          </span>
          <span className="ml-auto capitalize">{providerName} / {settings.permission < 2 ? "Read only" : "Review before saving"}</span>
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
                    onConfirm={items => applyPending(m.id, i, items)}
                    onCancel={() => cancelPending(m.id, i)}
                    onUndo={tr.result.auditId && tr.tool !== "undoLastAction" ? () => undoAction(tr.result.auditId!) : undefined} />
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
            aria-label="Jarvis message" placeholder="Talk to Jarvis..." className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)]" />
          <button disabled title="Voice mode - coming in Phase 6" className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--surface-2)] text-muted-foreground opacity-60">
            <Mic size={18} />
          </button>
          <button aria-label="Send message to Jarvis" onClick={() => send(input)} disabled={sending || !input.trim()}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--section)" }}>
            <Send size={18} />
          </button>
        </div>
        {messages.length > 0 && (
          <div className="mt-2"><GhostButton className="w-full text-sm" onClick={() => { conversation.current = {}; setMessages([]); }}>Clear conversation</GhostButton></div>
        )}
      </BottomSheet>
    </>
  );
}

function humanizeArgs(tool: string, args: Record<string, unknown>): string {
  switch (tool) {
    case "finishActiveWorkout": return "Finish and save the active workout";
    case "logBodyWeight": return `Log bodyweight: ${args.weightLb} lb`;
    case "logSupplement": return `Log supplement: ${args.name}${args.dose ? ` (${args.dose})` : ""}`;
    case "logDailyCheckIn": return `Daily check-in - energy ${args.energy}, soreness ${args.soreness}, stress ${args.stress}, motivation ${args.motivation}`;
    case "updateUserGoalsProfile": return `Update profile: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    case "updateJarvisSettings": return `Update Jarvis settings: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    case "logReferenceMeal":
    case "logMeal": return `Log ${args.mealType ?? "meal"}: ${args.name ?? "meal"}`;
    case "logUsualMeal": return `Log usual ${args.slot ?? "meal"}`;
    case "createWorkoutDraft":
    case "logWorkout": return `Review workout: ${args.name ?? args.workoutType ?? "Workout"}`;
    case "updateDailyCheckIn": return `Update today's check-in: ${Object.keys((args.patch as object) ?? {}).join(", ")}`;
    default: return "Review requested action";
  }
}

export { SourceBadge };

// Kept as a no-op export so existing mounts remain compatible while global undo UI is disabled.
export function JarvisUndoSnackbar() {
  return null;
}
