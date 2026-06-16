import { createServerFn } from "@tanstack/react-start";

interface ChatInput {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  mode?: "quick" | "detailed";
  context?: string;
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((data: ChatInput) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: false as const, error: "AI not configured. Add LOVABLE_API_KEY to enable the coach." };
    }
    const system = `You are FitCore AI, a concise, practical fitness coach inside the user's personal fitness app.
- Be conservative and evidence-based. Do not make medical claims; for injuries or health issues, recommend professional evaluation.
- Mode: ${data.mode ?? "quick"}. ${data.mode === "detailed" ? "Give a structured, in-depth answer." : "Keep it short and actionable (under 120 words)."}
- Never suggest mutating the user's logged data; instead, suggest actions the user can confirm.
${data.context ? `\nUser context:\n${data.context}` : ""}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });
      if (!res.ok) {
        if (res.status === 429) return { ok: false as const, error: "Rate limit reached. Try again in a moment." };
        if (res.status === 402) return { ok: false as const, error: "AI credits exhausted. Add credits in your workspace billing." };
        const txt = await res.text();
        return { ok: false as const, error: `AI error: ${txt.slice(0, 200)}` };
      }
      const json = await res.json() as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content ?? "";
      return { ok: true as const, content };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "AI request failed" };
    }
  });
