import { createServerFn } from "@tanstack/react-start";

type AiProvider = "gemini" | "legacy-lovable";
type GeminiKeyMode = "environment" | "user";

interface ToolDescriptor {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ChatInput {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  mode?: "quick" | "detailed";
  context?: string;
  tools?: ToolDescriptor[];
  systemOverride?: string;
  provider?: AiProvider;
  geminiKeyMode?: GeminiKeyMode;
  userGeminiApiKey?: string;
}

interface ConnectionTestInput {
  provider?: AiProvider;
  geminiKeyMode?: GeminiKeyMode;
  userGeminiApiKey?: string;
}

interface EstimateInput {
  imageDataUrl: string;
  hint?: string;
  provider?: AiProvider;
  geminiKeyMode?: GeminiKeyMode;
  userGeminiApiKey?: string;
}

interface EstimateTextInput {
  text: string;
  mealType?: string;
  detail?: "simple" | "normal" | "detailed";
  learnedHints?: string;
  provider?: AiProvider;
  geminiKeyMode?: GeminiKeyMode;
  userGeminiApiKey?: string;
}

interface NormalizedChatResponse {
  ok: true;
  content: string;
  toolCalls: { id: string; name: string; argsJson: string }[];
}

const GEMINI_MODEL = "gemini-3.5-flash";
const LOVABLE_MODEL = "google/gemini-3-flash-preview";

function hasValue(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function cleanKey(v: unknown) {
  return hasValue(v) ? v.trim() : "";
}

function safeProvider(input?: AiProvider): AiProvider {
  return input === "legacy-lovable" ? "legacy-lovable" : "gemini";
}

function resolveGeminiKey(input: { geminiKeyMode?: GeminiKeyMode; userGeminiApiKey?: string }) {
  const envKey = cleanKey(process.env.GEMINI_API_KEY) || cleanKey(process.env.GOOGLE_API_KEY);
  const userKey = cleanKey(input.userGeminiApiKey);
  if (input.geminiKeyMode === "user" && userKey) return { key: userKey, source: "user" as const };
  if (envKey) return { key: envKey, source: "environment" as const };
  if (userKey) return { key: userKey, source: "user" as const };
  return { key: "", source: "none" as const };
}

function defaultSystem(data: ChatInput) {
  return data.systemOverride ?? `You are FitCore AI, a concise, practical fitness coach inside the user's personal fitness app.
- Be conservative and evidence-based. Do not make medical claims; for injuries or health issues, recommend professional evaluation.
- Mode: ${data.mode ?? "quick"}. ${data.mode === "detailed" ? "Give a structured, in-depth answer." : "Keep it short and actionable (under 120 words)."}
- Never suggest mutating the user's logged data; instead, suggest actions the user can confirm.
${data.context ? `\nUser context:\n${data.context}` : ""}`;
}

function stripUnsupportedSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(stripUnsupportedSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (["additionalProperties", "$schema"].includes(key)) continue;
    out[key] = stripUnsupportedSchema(value);
  }
  return out;
}

function toGeminiContents(messages: ChatInput["messages"]) {
  return messages
    .filter(m => m.role !== "system" && m.content.trim())
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function parseGeminiResponse(json: unknown): NormalizedChatResponse {
  const root = json as { candidates?: { content?: { parts?: { text?: string; functionCall?: { id?: string; name?: string; args?: unknown } }[] } }[] };
  const parts = root.candidates?.[0]?.content?.parts ?? [];
  const content = parts.map(p => p.text ?? "").filter(Boolean).join("\n");
  const toolCalls = parts.flatMap((part, index) => {
    const fc = part.functionCall;
    if (!fc?.name) return [];
    return [{
      id: fc.id || `gemini-call-${index}`,
      name: fc.name,
      argsJson: JSON.stringify(fc.args ?? {}),
    }];
  });
  return { ok: true, content, toolCalls };
}

function sanitizeProviderError(provider: AiProvider, status?: number) {
  const label = provider === "legacy-lovable" ? "Legacy AI" : "Gemini";
  return status ? `${label} request failed (${status}). Check the provider key and try again.` : `${label} request failed. Check the provider key and try again.`;
}

async function callGeminiChat(data: ChatInput): Promise<NormalizedChatResponse | { ok: false; error: string }> {
  const { key } = resolveGeminiKey(data);
  if (!key) return { ok: false as const, error: "Gemini is not configured. Add GEMINI_API_KEY or GOOGLE_API_KEY, or save a personal Gemini key in Jarvis AI Settings." };

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: defaultSystem(data) }] },
    contents: toGeminiContents(data.messages),
  };
  if (data.tools?.length) {
    body.tools = [{ functionDeclarations: data.tools.map(t => ({ ...t, parameters: stripUnsupportedSchema(t.parameters) })) }];
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false as const, error: sanitizeProviderError("gemini", res.status) };
  return parseGeminiResponse(await res.json());
}

async function callLovableChat(data: ChatInput): Promise<NormalizedChatResponse | { ok: false; error: string }> {
  const key = cleanKey(process.env.LOVABLE_API_KEY);
  if (!key) return { ok: false as const, error: "Legacy/Lovable AI is not configured." };

  const body: Record<string, unknown> = {
    model: LOVABLE_MODEL,
    messages: [{ role: "system", content: defaultSystem(data) }, ...data.messages],
  };
  if (data.tools?.length) {
    body.tools = data.tools.map(t => ({ type: "function", function: t }));
    body.tool_choice = "auto";
  }
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false as const, error: sanitizeProviderError("legacy-lovable", res.status) };
  const json = await res.json() as { choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] };
  const msg = json.choices?.[0]?.message;
  return {
    ok: true as const,
    content: msg?.content ?? "",
    toolCalls: (msg?.tool_calls ?? []).map(tc => ({ id: tc.id, name: tc.function.name, argsJson: tc.function.arguments || "{}" })),
  };
}

async function callChatProvider(data: ChatInput) {
  return safeProvider(data.provider) === "legacy-lovable" ? callLovableChat(data) : callGeminiChat(data);
}

async function geminiJson(system: string, user: unknown, input: { geminiKeyMode?: GeminiKeyMode; userGeminiApiKey?: string }) {
  const { key } = resolveGeminiKey(input);
  if (!key) return { ok: false as const, error: "Gemini is not configured." };
  const parts = typeof user === "string" ? [{ text: user }] : user;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) return { ok: false as const, error: sanitizeProviderError("gemini", res.status) };
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return { ok: true as const, text: json.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("\n") ?? "" };
}

async function lovableJson(system: string, user: unknown) {
  const key = cleanKey(process.env.LOVABLE_API_KEY);
  if (!key) return { ok: false as const, error: "Legacy/Lovable AI is not configured." };
  const content = Array.isArray(user) ? user : String(user);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: LOVABLE_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return { ok: false as const, error: sanitizeProviderError("legacy-lovable", res.status) };
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  return { ok: true as const, text: json.choices?.[0]?.message?.content ?? "" };
}

async function callJsonProvider(provider: AiProvider | undefined, system: string, user: unknown, input: { geminiKeyMode?: GeminiKeyMode; userGeminiApiKey?: string }) {
  return safeProvider(provider) === "legacy-lovable" ? lovableJson(system, user) : geminiJson(system, user, input);
}

function parseJsonText(raw: string) {
  return JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()) as Record<string, unknown>;
}

export const aiChat = createServerFn({ method: "POST" })
  .validator((data: ChatInput) => data)
  .handler(async ({ data }) => {
    try {
      return await callChatProvider(data);
    } catch {
      return { ok: false as const, error: sanitizeProviderError(safeProvider(data.provider)) };
    }
  });

export const testAiConnection = createServerFn({ method: "POST" })
  .validator((data: ConnectionTestInput) => data)
  .handler(async ({ data }) => {
    try {
      const provider = safeProvider(data.provider);
      if (provider === "legacy-lovable") {
        const key = cleanKey(process.env.LOVABLE_API_KEY);
        if (!key) return { ok: false as const, status: "not_configured" as const, provider, error: "Legacy provider is not configured." };
        const result = await callLovableChat({ provider, messages: [{ role: "user", content: "Reply with OK only." }], mode: "quick" });
        return result.ok ? { ok: true as const, status: "connected" as const, provider } : { ok: false as const, status: "failed" as const, provider, error: result.error };
      }
      const resolved = resolveGeminiKey(data);
      if (!resolved.key) return { ok: false as const, status: "not_configured" as const, provider, keySource: "none" as const, error: "Gemini key not configured." };
      const result = await callGeminiChat({ provider, geminiKeyMode: data.geminiKeyMode, userGeminiApiKey: data.userGeminiApiKey, messages: [{ role: "user", content: "Reply with OK only." }], mode: "quick" });
      return result.ok ? { ok: true as const, status: "connected" as const, provider, keySource: resolved.source } : { ok: false as const, status: "failed" as const, provider, keySource: resolved.source, error: result.error };
    } catch {
      return { ok: false as const, status: "failed" as const, provider: safeProvider(data.provider), error: "Connection test failed." };
    }
  });

/** Text-based food macro estimation. Returns structured items + totals. */
export const estimateFoodFromText = createServerFn({ method: "POST" })
  .validator((data: EstimateTextInput) => data)
  .handler(async ({ data }) => {
    if (!data.text?.trim()) return { ok: false as const, error: "No food text provided." };
    const detail = data.detail ?? "normal";
    const system = `You are a nutrition estimation assistant. Estimate calories and macros from a natural-language meal description.
Respond ONLY with a compact JSON object (no prose, no markdown, no code fences) with this exact shape:
{"name": string, "mealType": "breakfast"|"lunch"|"dinner"|"snack"|"pre-workout"|"post-workout", "items": [{"name": string, "qty": string, "calories": number, "protein": number, "carbs": number, "fat": number}], "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "low"|"medium"|"high", "assumptions": [string]}
Rules:
- "items" totals MUST equal the top-level totals.
- Numbers are kcal and grams.
- If portion is missing, assume a reasonable default and add a short note to "assumptions".
- confidence: "high" only when portions are stated exactly; "medium" with reasonable defaults; "low" when very vague.
- Detail: ${detail}. ${detail === "detailed" ? "Show every assumption." : detail === "simple" ? "One concise assumption per item max." : "List assumptions concisely."}
${data.learnedHints ? `\nUser's known portions/preferences:\n${data.learnedHints}` : ""}`;

    try {
      const result = await callJsonProvider(data.provider, system, data.mealType ? `Meal type: ${data.mealType}\n\n${data.text}` : data.text, data);
      if (!result.ok) return result;
      const p = parseJsonText(result.text);
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
  });

export const estimateMealMacros = createServerFn({ method: "POST" })
  .validator((data: EstimateInput) => data)
  .handler(async ({ data }) => {
    if (!data.imageDataUrl?.startsWith("data:image/")) {
      return { ok: false as const, error: "Invalid image. Please retake the photo." };
    }
    const system = `You are a nutrition vision assistant. Look at the food photo and return a JSON estimate.
Respond ONLY with a compact JSON object - no prose, no markdown, no code fences - with keys:
{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "low"|"medium"|"high", "notes": string}
Numbers are grams and kcal for the full plate visible. Be conservative if portion is ambiguous.`;
    try {
      const user = [
        { text: data.hint ? `Hint: ${data.hint}` : "Estimate macros for this meal." },
        { inlineData: { mimeType: data.imageDataUrl.slice(5, data.imageDataUrl.indexOf(";")) || "image/jpeg", data: data.imageDataUrl.split(",")[1] || "" } },
      ];
      const result = await callJsonProvider(data.provider, system, user, data);
      if (!result.ok) return result;
      const parsed = parseJsonText(result.text) as { name?: string; calories?: number; protein?: number; carbs?: number; fat?: number; confidence?: string; notes?: string };
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
  });
