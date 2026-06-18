import { createServerFn } from "@tanstack/react-start";

type AiProvider = "gemini" | "legacy-lovable";
type GeminiKeyMode = "local" | "environment" | "user";
type GeminiModel = "gemini-2.5-flash-lite" | "gemini-2.5-flash";
type KeySource = "local" | "environment" | "none";
type ErrorCode = "missing_key" | "invalid_key" | "permission_denied" | "quota" | "model_unavailable" | "overloaded" | "malformed_request" | "network" | "tool_parse" | "provider_error";

interface ToolDescriptor {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ProviderOptions {
  provider?: AiProvider;
  geminiKeyMode?: GeminiKeyMode;
  userGeminiApiKey?: string;
  geminiModel?: GeminiModel;
}

interface ChatInput extends ProviderOptions {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  mode?: "quick" | "detailed";
  context?: string;
  tools?: ToolDescriptor[];
  systemOverride?: string;
}

interface ConnectionTestInput extends ProviderOptions {}

interface EstimateInput extends ProviderOptions {
  imageDataUrl: string;
  hint?: string;
}

interface EstimateTextInput extends ProviderOptions {
  text: string;
  mealType?: string;
  detail?: "simple" | "normal" | "detailed";
  learnedHints?: string;
}

interface NormalizedChatResponse {
  ok: true;
  content: string;
  toolCalls: { id: string; name: string; argsJson: string }[];
}

interface ProviderFailure {
  ok: false;
  error: string;
  code: ErrorCode;
  status?: number;
  keySource?: KeySource;
}

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-2.5-flash-lite";
const SUPPORTED_GEMINI_MODELS: GeminiModel[] = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
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

function safeGeminiModel(model?: string): GeminiModel {
  return SUPPORTED_GEMINI_MODELS.includes(model as GeminiModel) ? model as GeminiModel : DEFAULT_GEMINI_MODEL;
}

function normalizeKeyMode(mode?: GeminiKeyMode): "local" | "environment" {
  return mode === "environment" ? "environment" : "local";
}

function fail(error: string, code: ErrorCode, status?: number, keySource?: KeySource): ProviderFailure {
  return { ok: false as const, error, code, status, keySource };
}

function resolveGeminiKey(input: ProviderOptions) {
  const envKey = cleanKey(process.env.GEMINI_API_KEY) || cleanKey(process.env.GOOGLE_API_KEY);
  const localKey = cleanKey(input.userGeminiApiKey);
  const mode = normalizeKeyMode(input.geminiKeyMode);

  if (mode === "environment") {
    if (envKey) return { key: envKey, source: "environment" as const };
    if (localKey) return { key: localKey, source: "local" as const };
  } else {
    if (localKey) return { key: localKey, source: "local" as const };
    if (envKey) return { key: envKey, source: "environment" as const };
  }
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

function parseGeminiResponse(json: unknown): NormalizedChatResponse | ProviderFailure {
  try {
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
  } catch {
    return fail("Gemini returned a tool call Jarvis could not read. Try again.", "tool_parse");
  }
}

function geminiHttpError(status: number, keySource?: KeySource): ProviderFailure {
  if (status === 400) return fail("Gemini rejected the request format. Try a shorter prompt or switch to 2.5 Flash-Lite.", "malformed_request", status, keySource);
  if (status === 401) return fail("Gemini rejected the API key. Check the key and try again.", "invalid_key", status, keySource);
  if (status === 403) return fail("Gemini permission was denied for this key or model.", "permission_denied", status, keySource);
  if (status === 404) return fail("The selected Gemini model is unavailable. Switch to 2.5 Flash-Lite or 2.5 Flash in Jarvis AI Settings.", "model_unavailable", status, keySource);
  if (status === 429) return fail("Gemini rate limit reached. Wait a bit before trying again. This may also happen if the app sent multiple requests too quickly.", "quota", status, keySource);
  if (status === 503) return fail("Gemini is temporarily overloaded or unavailable. Try again later or switch to Gemini 2.5 Flash-Lite.", "overloaded", status, keySource);
  if (status >= 500) return fail("Gemini is temporarily unavailable. Try again later or switch to Gemini 2.5 Flash-Lite.", "overloaded", status, keySource);
  return fail(`Gemini request failed (${status}).`, "provider_error", status, keySource);
}

function lovableHttpError(status: number): ProviderFailure {
  if (status === 401 || status === 403) return fail("Legacy/Lovable rejected the API key.", "invalid_key", status);
  if (status === 429) return fail("Legacy/Lovable quota or rate limit was reached.", "quota", status);
  if (status >= 500) return fail("Legacy/Lovable is temporarily unavailable.", "overloaded", status);
  return fail(`Legacy/Lovable request failed (${status}).`, "provider_error", status);
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function postGemini(model: GeminiModel, key: string, keySource: KeySource, body: Record<string, unknown>, retry503 = true): Promise<Response | ProviderFailure> {
  for (let attempt = 0; attempt < (retry503 ? 2 : 1); attempt += 1) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      });
      if (res.status === 503 && attempt < 1 && retry503) {
        await wait(350 * (attempt + 1));
        continue;
      }
      return res;
    } catch {
      return fail("Network failure while contacting Gemini. Check your connection and try again.", "network", undefined, keySource);
    }
  }
  return fail("Gemini is temporarily overloaded or unavailable. Try again later or switch to Gemini 2.5 Flash-Lite.", "overloaded", 503, keySource);
}

async function callGeminiChat(data: ChatInput): Promise<NormalizedChatResponse | ProviderFailure> {
  const resolved = resolveGeminiKey(data);
  if (!resolved.key) return fail("Jarvis needs a Gemini API key. Add one in Jarvis AI Settings.", "missing_key", undefined, "none");

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: defaultSystem(data) }] },
    contents: toGeminiContents(data.messages),
  };
  if (data.tools?.length) {
    body.tools = [{ functionDeclarations: data.tools.map(t => ({ ...t, parameters: stripUnsupportedSchema(t.parameters) })) }];
  }

  const res = await postGemini(safeGeminiModel(data.geminiModel), resolved.key, resolved.source, body, true);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return geminiHttpError(res.status, resolved.source);
  return parseGeminiResponse(await res.json());
}

async function callLovableChat(data: ChatInput): Promise<NormalizedChatResponse | ProviderFailure> {
  const key = cleanKey(process.env.LOVABLE_API_KEY);
  if (!key) return fail("Legacy/Lovable AI is not configured.", "missing_key");

  const body: Record<string, unknown> = {
    model: LOVABLE_MODEL,
    messages: [{ role: "system", content: defaultSystem(data) }, ...data.messages],
  };
  if (data.tools?.length) {
    body.tools = data.tools.map(t => ({ type: "function", function: t }));
    body.tool_choice = "auto";
  }
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify(body),
    });
  } catch {
    return fail("Network failure while contacting Legacy/Lovable.", "network");
  }
  if (!res.ok) return lovableHttpError(res.status);
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

async function geminiJson(system: string, user: unknown, input: ProviderOptions): Promise<{ ok: true; text: string } | ProviderFailure> {
  const resolved = resolveGeminiKey(input);
  if (!resolved.key) return fail("Jarvis needs a Gemini API key. Add one in Jarvis AI Settings.", "missing_key", undefined, "none");
  const parts = typeof user === "string" ? [{ text: user }] : user;
  const res = await postGemini(safeGeminiModel(input.geminiModel), resolved.key, resolved.source, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json" },
  }, true);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return geminiHttpError(res.status, resolved.source);
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return { ok: true as const, text: json.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("\n") ?? "" };
}

async function lovableJson(system: string, user: unknown): Promise<{ ok: true; text: string } | ProviderFailure> {
  const key = cleanKey(process.env.LOVABLE_API_KEY);
  if (!key) return fail("Legacy/Lovable AI is not configured.", "missing_key");
  const content = Array.isArray(user) ? user : String(user);
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: LOVABLE_MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content }],
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return fail("Network failure while contacting Legacy/Lovable.", "network");
  }
  if (!res.ok) return lovableHttpError(res.status);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  return { ok: true as const, text: json.choices?.[0]?.message?.content ?? "" };
}

async function callJsonProvider(provider: AiProvider | undefined, system: string, user: unknown, input: ProviderOptions) {
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
      return fail(safeProvider(data.provider) === "gemini" ? "Gemini request failed. Try again." : "Legacy AI request failed. Try again.", "provider_error");
    }
  });

export const testAiConnection = createServerFn({ method: "POST" })
  .validator((data: ConnectionTestInput) => data)
  .handler(async ({ data }) => {
    try {
      const provider = safeProvider(data.provider);
      if (provider === "legacy-lovable") {
        const key = cleanKey(process.env.LOVABLE_API_KEY);
        if (!key) return { ok: false as const, status: "not_configured" as const, provider, error: "Legacy provider is not configured.", code: "missing_key" as const };
        const result = await callLovableChat({ provider, messages: [{ role: "user", content: "Say connected." }], mode: "quick" });
        return result.ok ? { ok: true as const, status: "connected" as const, provider } : { ok: false as const, status: result.code === "missing_key" ? "not_configured" as const : "failed" as const, provider, error: result.error, code: result.code };
      }
      const resolved = resolveGeminiKey(data);
      if (!resolved.key) return { ok: false as const, status: "not_configured" as const, provider, keySource: "none" as const, error: "Jarvis needs a Gemini API key. Add one in Jarvis AI Settings.", code: "missing_key" as const };
      const res = await postGemini(safeGeminiModel(data.geminiModel), resolved.key, resolved.source, {
        contents: [{ role: "user", parts: [{ text: "Say connected." }] }],
      }, true);
      if (!(res instanceof Response)) return { ...res, status: res.code === "missing_key" ? "not_configured" as const : "failed" as const, provider, keySource: resolved.source };
      if (!res.ok) {
        const err = geminiHttpError(res.status, resolved.source);
        return { ...err, status: err.code === "missing_key" ? "not_configured" as const : "failed" as const, provider, keySource: resolved.source };
      }
      return { ok: true as const, status: "connected" as const, provider, keySource: resolved.source, model: safeGeminiModel(data.geminiModel) };
    } catch {
      return { ok: false as const, status: "failed" as const, provider: safeProvider(data.provider), error: "Connection test failed.", code: "network" as const };
    }
  });

/** Text-based food macro estimation. Returns structured items + totals. */
export const estimateFoodFromText = createServerFn({ method: "POST" })
  .validator((data: EstimateTextInput) => data)
  .handler(async ({ data }) => {
    if (!data.text?.trim()) return { ok: false as const, error: "No food text provided.", code: "malformed_request" as const };
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
      return { ok: false as const, error: "Couldn't parse AI estimate.", code: "tool_parse" as const };
    }
  });

export const estimateMealMacros = createServerFn({ method: "POST" })
  .validator((data: EstimateInput) => data)
  .handler(async ({ data }) => {
    if (!data.imageDataUrl?.startsWith("data:image/")) {
      return { ok: false as const, error: "Invalid image. Please retake the photo.", code: "malformed_request" as const };
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
      return { ok: false as const, error: "Couldn't parse AI estimate. Try a clearer photo.", code: "tool_parse" as const };
    }
  });
