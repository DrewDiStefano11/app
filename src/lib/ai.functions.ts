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
      const toolCalls = (msg?.tool_calls ?? []).map(tc => ({
        id: tc.id,
        name: tc.function.name,
        argsJson: tc.function.arguments || "{}",
      }));
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

interface EstimateTextInput {
  text: string;
  mealType?: string;
  detail?: "simple" | "normal" | "detailed";
  learnedHints?: string;
}

/** Text-based food macro estimation. Returns structured items + totals. */
export const estimateFoodFromText = createServerFn({ method: "POST" })
  .inputValidator((data: EstimateTextInput) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "AI not configured." };
    if (!data.text?.trim()) return { ok: false as const, error: "No food text provided." };

    const detail = data.detail ?? "normal";
    const system = `You are a nutrition estimation assistant. Estimate calories and macros from a natural-language meal description.
Respond ONLY with a compact JSON object (no prose, no markdown, no code fences) with this exact shape:
{"name": string, "mealType": "breakfast"|"lunch"|"dinner"|"snack"|"pre-workout"|"post-workout", "items": [{"name": string, "qty": string, "calories": number, "protein": number, "carbs": number, "fat": number}], "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "low"|"medium"|"high", "assumptions": [string]}
Rules:
- "items" totals MUST equal the top-level totals.
- Numbers are kcal (calories) and grams (protein/carbs/fat/fiber).
- If portion is missing, assume a reasonable default and add a short note to "assumptions" (e.g. "assumed 5 oz cooked chicken").
- confidence: "high" only when portions are stated exactly; "medium" with reasonable defaults; "low" when very vague.
- Detail: ${detail}. ${detail === "detailed" ? "Show every assumption." : detail === "simple" ? "One concise assumption per item max." : "List assumptions concisely."}
${data.learnedHints ? `\nUser's known portions/preferences:\n${data.learnedHints}` : ""}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: data.mealType ? `Meal type: ${data.mealType}\n\n${data.text}` : data.text },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        if (res.status === 429) return { ok: false as const, error: "Rate limit. Try again shortly." };
        if (res.status === 402) return { ok: false as const, error: "AI credits exhausted." };
        const txt = await res.text();
        return { ok: false as const, error: `AI error: ${txt.slice(0, 200)}` };
      }
      const json = await res.json() as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      try {
        const p = JSON.parse(cleaned) as Record<string, unknown>;
        const items = Array.isArray(p.items) ? (p.items as Record<string, unknown>[]).map(it => ({
          name: String(it.name ?? "item"),
          qty: typeof it.qty === "string" ? it.qty : undefined,
          calories: Math.round(Number(it.calories) || 0),
          protein: Math.round(Number(it.protein) || 0),
          carbs: Math.round(Number(it.carbs) || 0),
          fat: Math.round(Number(it.fat) || 0),
        })) : [];
        return { ok: true as const, estimate: {
          name: String(p.name ?? data.text.slice(0, 40)),
          mealType: String(p.mealType ?? data.mealType ?? "snack"),
          items,
          calories: Math.round(Number(p.calories) || items.reduce((a, i) => a + i.calories, 0)),
          protein: Math.round(Number(p.protein) || items.reduce((a, i) => a + i.protein, 0)),
          carbs: Math.round(Number(p.carbs) || items.reduce((a, i) => a + i.carbs, 0)),
          fat: Math.round(Number(p.fat) || items.reduce((a, i) => a + i.fat, 0)),
          fiber: Math.round(Number(p.fiber) || 0),
          confidence: (p.confidence as "low" | "medium" | "high") ?? "medium",
          assumptions: Array.isArray(p.assumptions) ? (p.assumptions as unknown[]).map(String) : [],
        } };
      } catch {
        return { ok: false as const, error: "Couldn't parse AI estimate." };
      }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "AI request failed" };
    }
  });



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
