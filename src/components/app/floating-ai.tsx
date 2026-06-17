import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { BottomSheet } from "./sheet";
import { Chip, GhostButton } from "./ui";
import { useStore, uid } from "@/lib/store";
import { aiChat } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";

const SUGGESTED = [
  "What should I train today?",
  "Why is my bench stuck?",
  "Quick high-protein meal idea",
  "Should I deload this week?",
  "Summarize my week",
];

const LOCAL_FALLBACKS: Record<string, string> = {
  default: "I'm offline right now. Try logging a workout, meal, or recovery check-in to get specific feedback when AI is back online.",
  "what should i train today?": "If yesterday was a push day, train pull or legs today. Hit 1 compound (rows or squats) + 2 accessories. Keep RPE 7-8 and rest 90-120s on heavy work.",
  "why is my bench stuck?": "Common causes: weak triceps (add CGBP / pushdowns), weak setup (arch + leg drive), inconsistent rest, or under-eating. Try a pause-bench variation and ensure protein ≥ 1g/lb.",
  "quick high-protein meal idea": "6 oz chicken + 1 cup rice + broccoli ≈ 540 kcal / 56g P. Or 1 cup Greek yogurt + scoop whey + berries ≈ 280 kcal / 46g P.",
  "should i deload this week?": "Deload if any 2 apply: 2+ weeks of declining performance, persistent joint soreness, poor sleep, low motivation. Drop volume 40% and intensity 10-15% for one week.",
  "summarize my week": "Open the Progress tab to see your week's training volume, average sleep, and bodyweight trend.",
};

export function FloatingAi({ section, contextSummary }: { section: string; contextSummary: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { state, set } = useStore();
  const chatFn = useServerFn(aiChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, state.aiMessages.length]);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("fitcore:open-ai", h);
    return () => window.removeEventListener("fitcore:open-ai", h);
  }, []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);
    const userMsg = { id: uid(), role: "user" as const, content, createdAt: Date.now() };
    set(s => ({ ...s, aiMessages: [...s.aiMessages, userMsg] }));

    try {
      const recent = [...state.aiMessages.slice(-8), userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await chatFn({ data: { messages: recent, mode, context: contextSummary } });
      const reply = res.ok
        ? res.content
        : (LOCAL_FALLBACKS[content.toLowerCase()] ?? `${LOCAL_FALLBACKS.default}\n\n(${res.error})`);
      set(s => ({ ...s, aiMessages: [...s.aiMessages, { id: uid(), role: "assistant", content: reply, createdAt: Date.now() }] }));
    } catch (err) {
      const fallback = LOCAL_FALLBACKS[content.toLowerCase()] ?? LOCAL_FALLBACKS.default;
      set(s => ({ ...s, aiMessages: [...s.aiMessages, { id: uid(), role: "assistant", content: fallback, createdAt: Date.now() }] }));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed z-20 right-4 bottom-[calc(96px+env(safe-area-inset-bottom))] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-95 transition-transform"
        style={{ background: "var(--section)", boxShadow: "0 10px 40px -5px color-mix(in oklab, var(--section) 60%, transparent)" }}
        aria-label="Open AI coach">
        <Sparkles size={22} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="FitCore AI" height="tall">
        <div className="flex gap-2 mb-3">
          <Chip active={mode === "quick"} onClick={() => setMode("quick")}>Quick Answer</Chip>
          <Chip active={mode === "detailed"} onClick={() => setMode("detailed")}>Detailed Coach</Chip>
          <span className="ml-auto text-xs text-muted-foreground self-center capitalize">{section} context</span>
        </div>

        <div ref={scrollRef} className="space-y-3 max-h-[45dvh] overflow-y-auto pb-2">
          {state.aiMessages.length === 0 && (
            <div className="text-center py-6">
              <div className="inline-flex w-12 h-12 items-center justify-center rounded-2xl mb-3" style={{ background: "var(--section-soft)", color: "var(--section)" }}>
                <Sparkles size={22} />
              </div>
              <p className="text-sm text-muted-foreground">Ask anything about training, nutrition, recovery or your progress.</p>
            </div>
          )}
          {state.aiMessages.map(m => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "text-white" : "bg-[var(--surface-2)]"}`}
                style={m.role === "user" ? { background: "var(--section)" } : undefined}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Thinking...</div>}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-1 px-1">
          {SUGGESTED.map(s => <Chip key={s} onClick={() => send(s)}>{s}</Chip>)}
        </div>

        <div className="flex gap-2 sticky bottom-0 pb-2 pt-1" style={{ background: "var(--surface)" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(input); }}
            placeholder="Ask your coach..." className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)]" />
          <button onClick={() => send(input)} disabled={sending || !input.trim()}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--section)" }}>
            <Send size={18} />
          </button>
        </div>
        {state.aiMessages.length > 0 && (
          <div className="mt-2"><GhostButton className="w-full text-sm" onClick={() => set(s => ({ ...s, aiMessages: [] }))}>Clear conversation</GhostButton></div>
        )}
      </BottomSheet>
    </>
  );
}
