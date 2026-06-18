import { createServerFn } from "@tanstack/react-start";

interface ChatInput {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  mode?: "quick" | "detailed";
  context?: string;
  /** Optional OpenAI-format tool descriptors. When present, Jarvis tool-calling is enabled. */
  tools?: { name: string; description: string; parameters: Record<string, unknown> }[];
  /** Optional system prompt override (Jarvis injects persona/permissions). */
  systemOverride?: string;
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((data: ChatInput) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: false as const, error: "AI not configured. Add LOVABLE_API_KEY to enable the coach." };
    }
    const system = data.systemOverride ?? `You are FitCore AI, a concise, practical fitness coach inside the user's personal fitness app.
- Be conservative and evidence-based. Do not make medical claims; for injuries or health issues, recommend professional evaluation.
- Mode: ${data.mode ?? "quick"}. ${data.mode === "detailed" ? "Give a structured, in-depth answer." : "Keep it short and actionable (under 120 words)."}
- Never suggest mutating the user's logged data; instead, suggest actions the user can confirm.
${data.context ? `\nUser context:\n${data.context}` : ""}`;

    try {
      const body: Record<string, unknown> = {
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
      };
      if (data.tools && data.tools.length) {
        body.tools = data.tools.map(t => ({ type: "function", function: t }));
        body.tool_choice = "auto";
      }
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 429) return { ok: false as const, error: "Rate limit reached. Try again in a moment." };
        if (res.status === 402) return { ok: false as const, error: "AI credits exhausted. Add credits in your workspace billing." };
        const txt = await res.text();
        return { ok: false as const, error: `AI error: ${txt.slice(0, 200)}` };
      }
      const json = await res.json() as { choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] };
      const msg = json.choices?.[0]?.message;
      const content = msg?.content ?? "";
      const toolCalls = (msg?.tool_calls ?? []).map(tc => {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
        return { id: tc.id, name: tc.function.name, arguments: args };
      });
      return { ok: true as const, content, toolCalls };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "AI request failed" };
    }
  });

interface EstimateInput {
  /** data URL (data:image/jpeg;base64,...) */
  imageDataUrl: string;
  hint?: string;
}

export const estimateMealMacros = createServerFn({ method: "POST" })
  .inputValidator((data: EstimateInput) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: false as const, error: "AI not connected. Lovable Cloud / AI Gateway key required to enable photo macro estimation." };
    }
    if (!data.imageDataUrl?.startsWith("data:image/")) {
      return { ok: false as const, error: "Invalid image. Please retake the photo." };
    }

    const system = `You are a nutrition vision assistant. Look at the food photo and return a JSON estimate.
Respond ONLY with a compact JSON object — no prose, no markdown, no code fences — with keys:
{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "low"|"medium"|"high", "notes": string}
Numbers are grams (protein/carbs/fat) and kcal (calories) for the full plate visible. Be conservative if portion is ambiguous.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: [
              { type: "text", text: data.hint ? `Hint: ${data.hint}` : "Estimate macros for this meal." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ] },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        if (res.status === 429) return { ok: false as const, error: "Rate limit reached. Try again shortly." };
        if (res.status === 402) return { ok: false as const, error: "AI credits exhausted. Add credits in your workspace billing." };
        const txt = await res.text();
        return { ok: false as const, error: `AI error: ${txt.slice(0, 200)}` };
      }
      const json = await res.json() as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      try {
        const parsed = JSON.parse(cleaned) as {
          name?: string; calories?: number; protein?: number; carbs?: number; fat?: number;
          confidence?: string; notes?: string;
        };
        return { ok: true as const, estimate: {
          name: parsed.name ?? "Meal",
          calories: Math.round(parsed.calories ?? 0),
          protein: Math.round(parsed.protein ?? 0),
          carbs: Math.round(parsed.carbs ?? 0),
          fat: Math.round(parsed.fat ?? 0),
          confidence: (parsed.confidence ?? "medium") as "low" | "medium" | "high",
          notes: parsed.notes ?? "",
        } };
      } catch {
        return { ok: false as const, error: "Couldn't parse AI estimate. Try a clearer photo." };
      }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "AI request failed" };
    }
  });
