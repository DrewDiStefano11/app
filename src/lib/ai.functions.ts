import { createServerFn } from "@tanstack/react-start";

type AiProvider = "groq" | "gemini" | "legacy-lovable";
type AiKeyMode = "local" | "environment" | "user";
type GeminiKeyMode = AiKeyMode;
type GroqKeyMode = AiKeyMode;
type GeminiModel = "gemini-2.5-flash-lite" | "gemini-2.5-flash";
type GroqModel = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile" | "qwen/qwen3-32b";
type KeySource = "local" | "environment" | "none";
type ErrorCode =
  | "missing_key"
  | "invalid_key"
  | "permission_denied"
  | "quota"
  | "model_unavailable"
  | "overloaded"
  | "malformed_request"
  | "network"
  | "tool_parse"
  | "provider_error"
  | "context_length";

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
  groqKeyMode?: GroqKeyMode;
  userGroqApiKey?: string;
  groqModel?: GroqModel;
  autoModelRouting?: boolean;
  autoAiFallback?: boolean;
  allowGeminiFallback?: boolean;
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

interface AiCallDiagnostics {
  provider: AiProvider;
  selectedModel?: string;
  actualModel?: string;
  routed: boolean;
  fallback: boolean;
  fallbackReason?: string;
  callType: "jarvisChat" | "testConnection" | "foodEstimate" | "photoEstimate";
  status?: number;
  errorCategory?: ErrorCode;
  retryCount: number;
  fallbackCount: number;
  inputSize: number;
  toolsSent: number;
  messagesSent: number;
  timestamp: number;
}

interface NormalizedChatResponse {
  ok: true;
  content: string;
  toolCalls: { id: string; name: string; argsJson: string }[];
  notice?: string;
  diagnostics?: AiCallDiagnostics;
}

interface ProviderFailure {
  ok: false;
  error: string;
  code: ErrorCode;
  status?: number;
  keySource?: KeySource;
  retryAfterMs?: number;
  diagnostics?: AiCallDiagnostics;
}

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-2.5-flash-lite";
const SUPPORTED_GEMINI_MODELS: GeminiModel[] = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
const DEFAULT_GROQ_MODEL: GroqModel = "qwen/qwen3-32b";
const SUPPORTED_GROQ_MODELS: GroqModel[] = [
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];
const FAST_GROQ_MODEL: GroqModel = "llama-3.1-8b-instant";
const STRONG_GROQ_MODEL: GroqModel = "llama-3.3-70b-versatile";
const TOOL_GROQ_MODEL: GroqModel = "qwen/qwen3-32b";
const LOVABLE_MODEL = "google/gemini-3-flash-preview";
const modelCooldowns = new Map<string, { until: number; reason: string }>();

function hasValue(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function cleanKey(v: unknown) {
  return hasValue(v) ? v.trim() : "";
}

function safeProvider(input?: AiProvider): AiProvider {
  if (input === "gemini" || input === "legacy-lovable") return input;
  return "groq";
}

function safeGeminiModel(model?: string): GeminiModel {
  return SUPPORTED_GEMINI_MODELS.includes(model as GeminiModel)
    ? (model as GeminiModel)
    : DEFAULT_GEMINI_MODEL;
}

function safeGroqModel(model?: string): GroqModel {
  return SUPPORTED_GROQ_MODELS.includes(model as GroqModel)
    ? (model as GroqModel)
    : DEFAULT_GROQ_MODEL;
}

function normalizeKeyMode(mode?: AiKeyMode): "local" | "environment" {
  return mode === "environment" ? "environment" : "local";
}

function fail(
  error: string,
  code: ErrorCode,
  status?: number,
  keySource?: KeySource,
  retryAfterMs?: number,
): ProviderFailure {
  return { ok: false as const, error, code, status, keySource, retryAfterMs };
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

function resolveGroqKey(input: ProviderOptions) {
  const envKey = cleanKey(process.env.GROQ_API_KEY);
  const localKey = cleanKey(input.userGroqApiKey);
  const mode = normalizeKeyMode(input.groqKeyMode);

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
  return (
    data.systemOverride ??
    `You are FitCore AI, a concise, practical fitness coach inside the user's personal fitness app.
- Be conservative and evidence-based. Do not make medical claims; for injuries or health issues, recommend professional evaluation.
- Mode: ${data.mode ?? "quick"}. ${data.mode === "detailed" ? "Give a structured, in-depth answer." : "Keep it short and actionable (under 120 words)."}
- Never suggest mutating the user's logged data; instead, suggest actions the user can confirm.
${data.context ? `\nUser context:\n${data.context}` : ""}`
  );
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
    .filter((m) => m.role !== "system" && m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function toOpenAiMessages(data: ChatInput) {
  return [
    { role: "system" as const, content: defaultSystem(data) },
    ...data.messages
      .filter((m) => m.content.trim())
      .map((m) => ({ role: m.role, content: m.content })),
  ];
}

function diagnostics(
  data: ChatInput,
  provider: AiProvider,
  selectedModel: string | undefined,
  actualModel: string | undefined,
  extra: Partial<AiCallDiagnostics> = {},
): AiCallDiagnostics {
  return {
    provider,
    selectedModel,
    actualModel,
    routed: false,
    fallback: false,
    callType: "jarvisChat",
    retryCount: 0,
    fallbackCount: 0,
    inputSize:
      data.messages.reduce((n, m) => n + m.content.length, 0) + (data.systemOverride?.length ?? 0),
    toolsSent: data.tools?.length ?? 0,
    messagesSent: data.messages.length,
    timestamp: Date.now(),
    ...extra,
  };
}

function parseGeminiResponse(json: unknown): NormalizedChatResponse | ProviderFailure {
  try {
    const root = json as {
      candidates?: {
        content?: {
          parts?: {
            text?: string;
            functionCall?: { id?: string; name?: string; args?: unknown };
          }[];
        };
      }[];
    };
    const parts = root.candidates?.[0]?.content?.parts ?? [];
    const content = parts
      .map((p) => p.text ?? "")
      .filter(Boolean)
      .join("\n");
    const toolCalls = parts.flatMap((part, index) => {
      const fc = part.functionCall;
      if (!fc?.name) return [];
      return [
        {
          id: fc.id || `gemini-call-${index}`,
          name: fc.name,
          argsJson: JSON.stringify(fc.args ?? {}),
        },
      ];
    });
    return { ok: true, content, toolCalls };
  } catch {
    return fail("Gemini returned a tool call Jarvis could not read. Try again.", "tool_parse");
  }
}

function parseGroqResponse(json: unknown): NormalizedChatResponse | ProviderFailure {
  try {
    const root = json as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id?: string;
            function?: { name?: string; arguments?: string | Record<string, unknown> };
          }[];
        };
      }[];
    };
    const msg = root.choices?.[0]?.message;
    return {
      ok: true as const,
      content: msg?.content ?? "",
      toolCalls: (msg?.tool_calls ?? []).flatMap((tc, index) => {
        const name = tc.function?.name;
        if (!name) return [];
        const rawArgs = tc.function?.arguments ?? "{}";
        return [
          {
            id: tc.id || `groq-call-${index}`,
            name,
            argsJson: typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs),
          },
        ];
      }),
    };
  } catch {
    return fail("Groq returned a tool call Jarvis could not read.", "tool_parse");
  }
}

function retryAfterMs(res: Response) {
  const raw = res.headers.get("retry-after") || res.headers.get("x-ratelimit-reset-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(1000, date - Date.now()) : undefined;
}

function geminiHttpError(status: number, keySource?: KeySource): ProviderFailure {
  if (status === 400)
    return fail(
      "Gemini rejected the request format. Try a shorter prompt or switch to 2.5 Flash-Lite.",
      "malformed_request",
      status,
      keySource,
    );
  if (status === 401)
    return fail(
      "Gemini rejected the API key. Check the key and try again.",
      "invalid_key",
      status,
      keySource,
    );
  if (status === 403)
    return fail(
      "Gemini permission was denied for this key or model.",
      "permission_denied",
      status,
      keySource,
    );
  if (status === 404)
    return fail(
      "The selected Gemini model is unavailable. Switch to 2.5 Flash-Lite or 2.5 Flash in Jarvis AI Settings.",
      "model_unavailable",
      status,
      keySource,
    );
  if (status === 429)
    return fail(
      "Gemini quota reached for this model. Switch to Groq or try again later.",
      "quota",
      status,
      keySource,
    );
  if (status === 503)
    return fail(
      "Gemini is temporarily overloaded or unavailable. Try again later or switch to Gemini 2.5 Flash-Lite.",
      "overloaded",
      status,
      keySource,
    );
  if (status >= 500)
    return fail(
      "Gemini is temporarily unavailable. Try again later or switch to Gemini 2.5 Flash-Lite.",
      "overloaded",
      status,
      keySource,
    );
  return fail(`Gemini request failed (${status}).`, "provider_error", status, keySource);
}

function groqHttpError(
  status: number,
  model: GroqModel,
  keySource?: KeySource,
  retryAfter?: number,
): ProviderFailure {
  if (status === 400)
    return fail(
      `Request was too large or malformed for ${model}. Try shortening the request.`,
      "malformed_request",
      status,
      keySource,
      retryAfter,
    );
  if (status === 401)
    return fail(
      "Groq rejected the API key. Check the key and try again.",
      "invalid_key",
      status,
      keySource,
      retryAfter,
    );
  if (status === 403)
    return fail(
      "Groq permission was denied for this key or model.",
      "permission_denied",
      status,
      keySource,
      retryAfter,
    );
  if (status === 404)
    return fail(
      `Groq model unavailable: ${model}.`,
      "model_unavailable",
      status,
      keySource,
      retryAfter,
    );
  if (status === 413)
    return fail(
      `Request was too large for ${model}.`,
      "context_length",
      status,
      keySource,
      retryAfter,
    );
  if (status === 429)
    return fail(`Groq rate limit reached for ${model}.`, "quota", status, keySource, retryAfter);
  if (status === 503)
    return fail(`Groq model unavailable: ${model}.`, "overloaded", status, keySource, retryAfter);
  if (status >= 500)
    return fail(
      "Groq is temporarily unavailable. Try again later.",
      "overloaded",
      status,
      keySource,
      retryAfter,
    );
  return fail(`Groq request failed (${status}).`, "provider_error", status, keySource, retryAfter);
}

async function groqChatHttpError(
  res: Response,
  model: GroqModel,
  keySource?: KeySource,
): Promise<ProviderFailure> {
  const retryAfter = retryAfterMs(res);
  if (res.status === 400) {
    try {
      const payload = (await res.json()) as { error?: { code?: string; type?: string } };
      const category = `${payload.error?.code ?? ""} ${payload.error?.type ?? ""}`.toLowerCase();
      if (category.includes("tool_use_failed") || category.includes("tool")) {
        return fail(
          `Groq could not produce a valid tool call with ${model}.`,
          "tool_parse",
          res.status,
          keySource,
          retryAfter,
        );
      }
    } catch {
      // Fall through to the safe status-only error.
    }
  }
  return groqHttpError(res.status, model, keySource, retryAfter);
}

function lovableHttpError(status: number): ProviderFailure {
  if (status === 401 || status === 403)
    return fail("Legacy/Lovable rejected the API key.", "invalid_key", status);
  if (status === 429)
    return fail("Legacy/Lovable quota or rate limit was reached.", "quota", status);
  if (status >= 500)
    return fail("Legacy/Lovable is temporarily unavailable.", "overloaded", status);
  return fail(`Legacy/Lovable request failed (${status}).`, "provider_error", status);
}

function shouldFallback(code: ErrorCode) {
  return [
    "quota",
    "context_length",
    "model_unavailable",
    "overloaded",
    "network",
    "tool_parse",
    "malformed_request",
  ].includes(code);
}

function rememberCooldown(provider: AiProvider, model: string, failure: ProviderFailure) {
  if (!["quota", "context_length", "model_unavailable", "overloaded"].includes(failure.code))
    return;
  const fallbackMs =
    failure.code === "quota"
      ? 10 * 60 * 1000
      : failure.code === "context_length"
        ? 3 * 60 * 1000
        : 90 * 1000;
  modelCooldowns.set(`${provider}:${model}`, {
    until: Date.now() + (failure.retryAfterMs ?? fallbackMs),
    reason: failure.code,
  });
}

function isCooling(provider: AiProvider, model: string) {
  const c = modelCooldowns.get(`${provider}:${model}`);
  if (!c) return false;
  if (c.until <= Date.now()) {
    modelCooldowns.delete(`${provider}:${model}`);
    return false;
  }
  return true;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postGemini(
  model: GeminiModel,
  key: string,
  keySource: KeySource,
  body: Record<string, unknown>,
  retry503 = true,
): Promise<Response | ProviderFailure> {
  for (let attempt = 0; attempt < (retry503 ? 2 : 1); attempt += 1) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
        },
      );
      if (res.status === 503 && attempt < 1 && retry503) {
        await wait(350 * (attempt + 1));
        continue;
      }
      return res;
    } catch {
      return fail(
        "Network failure while contacting Gemini. Check your connection and try again.",
        "network",
        undefined,
        keySource,
      );
    }
  }
  return fail(
    "Gemini is temporarily overloaded or unavailable. Try again later or switch to Gemini 2.5 Flash-Lite.",
    "overloaded",
    503,
    keySource,
  );
}

async function postGroq(
  model: GroqModel,
  key: string,
  keySource: KeySource,
  body: Record<string, unknown>,
  retry503 = true,
): Promise<Response | ProviderFailure> {
  for (let attempt = 0; attempt < (retry503 ? 2 : 1); attempt += 1) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ ...body, model }),
      });
      if (res.status === 503 && attempt < 1 && retry503) {
        await wait(350 * (attempt + 1));
        continue;
      }
      return res;
    } catch {
      return fail(
        "Network failure while contacting Groq. Check your connection and try again.",
        "network",
        undefined,
        keySource,
      );
    }
  }
  return fail(`Groq model unavailable: ${model}.`, "overloaded", 503, keySource);
}

function isComplexJarvisTask(data: ChatInput) {
  const text = data.messages[data.messages.length - 1]?.content.toLowerCase() ?? "";
  return (
    /should i|what should|hurt|pain|sore|soreness|fatigue|tired|swap|replace|shorten|20 minutes|progress|progression|heavier|lighter|next|same workout|started at|finished at|sets? of|\d+x\d+|bench|squat|deadlift|incline|workout|meal|lunch|dinner|breakfast|granola|peanut|rice|chicken|estimate|calories|macros/.test(
      text,
    ) &&
    !/^\s*(log creatine|log \d+(\.\d+)?\s*lb|log \d+ minutes? treadmill|log \d+ minutes? cardio)\s*$/i.test(
      text,
    )
  );
}

function uniqueModels(models: GroqModel[]) {
  return models.filter((m, i) => models.indexOf(m) === i);
}

function groqAttemptOrder(data: ChatInput) {
  const selected = safeGroqModel(data.groqModel);
  const routed = data.autoModelRouting !== false;
  const complex = isComplexJarvisTask(data);
  if (!routed)
    return uniqueModels([selected, TOOL_GROQ_MODEL, complex ? STRONG_GROQ_MODEL : FAST_GROQ_MODEL]);
  if (data.tools?.length)
    return uniqueModels([
      TOOL_GROQ_MODEL,
      complex ? STRONG_GROQ_MODEL : FAST_GROQ_MODEL,
      complex ? FAST_GROQ_MODEL : STRONG_GROQ_MODEL,
    ]);
  if (complex) return uniqueModels([STRONG_GROQ_MODEL, TOOL_GROQ_MODEL, FAST_GROQ_MODEL]);
  return uniqueModels([FAST_GROQ_MODEL, TOOL_GROQ_MODEL, STRONG_GROQ_MODEL]);
}

async function callGeminiChat(data: ChatInput): Promise<NormalizedChatResponse | ProviderFailure> {
  const resolved = resolveGeminiKey(data);
  if (!resolved.key)
    return fail(
      "Jarvis needs a Gemini API key. Add one in Jarvis AI Settings.",
      "missing_key",
      undefined,
      "none",
    );

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: defaultSystem(data) }] },
    contents: toGeminiContents(data.messages),
  };
  if (data.tools?.length) {
    body.tools = [
      {
        functionDeclarations: data.tools.map((t) => ({
          ...t,
          parameters: stripUnsupportedSchema(t.parameters),
        })),
      },
    ];
  }

  const model = safeGeminiModel(data.geminiModel);
  const res = await postGemini(model, resolved.key, resolved.source, body, true);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return geminiHttpError(res.status, resolved.source);
  const parsed = parseGeminiResponse(await res.json());
  return parsed.ok
    ? { ...parsed, diagnostics: diagnostics(data, "gemini", model, model, { status: 200 }) }
    : parsed;
}

async function callGroqModel(
  data: ChatInput,
  model: GroqModel,
): Promise<NormalizedChatResponse | ProviderFailure> {
  const resolved = resolveGroqKey(data);
  if (!resolved.key)
    return fail(
      "Jarvis needs a Groq API key. Add one in Jarvis AI Settings.",
      "missing_key",
      undefined,
      "none",
    );
  const body: Record<string, unknown> = {
    messages: toOpenAiMessages(data),
    temperature: 0.2,
  };
  if (data.tools?.length) {
    body.tools = data.tools.map((t) => ({
      type: "function",
      function: { ...t, parameters: stripUnsupportedSchema(t.parameters) },
    }));
    body.tool_choice = "auto";
  }
  const res = await postGroq(model, resolved.key, resolved.source, body, true);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return groqChatHttpError(res, model, resolved.source);
  return parseGroqResponse(await res.json());
}

async function callGroqChat(data: ChatInput): Promise<NormalizedChatResponse | ProviderFailure> {
  const models = groqAttemptOrder(data);
  const routed = data.autoModelRouting !== false;
  const selected = safeGroqModel(data.groqModel);
  const allowFallback = data.autoAiFallback !== false;
  const maxGroqAttempts = allowFallback ? 3 : 1;
  const attempted: { model: GroqModel; failure: ProviderFailure }[] = [];
  let fallbackCount = 0;

  for (const model of models) {
    if (attempted.length >= maxGroqAttempts) break;
    if (isCooling("groq", model) && allowFallback) continue;
    const result = await callGroqModel(data, model);
    if (result.ok) {
      const first = attempted[0];
      const fallback = attempted.length > 0 || (routed && model !== selected);
      return {
        ...result,
        diagnostics: diagnostics(data, "groq", selected, model, {
          routed,
          fallback,
          fallbackReason: first?.failure.code,
          fallbackCount,
          retryCount: fallbackCount,
          status: 200,
        }),
      };
    }
    attempted.push({ model, failure: result });
    rememberCooldown("groq", model, result);
    if (!allowFallback || !shouldFallback(result.code)) break;
    fallbackCount += 1;
  }

  if (data.allowGeminiFallback) {
    const gemini = await callGeminiChat(data);
    if (gemini.ok) {
      return {
        ...gemini,
        diagnostics: diagnostics(
          data,
          "gemini",
          safeGroqModel(data.groqModel),
          gemini.diagnostics?.actualModel ?? safeGeminiModel(data.geminiModel),
          {
            routed,
            fallback: true,
            fallbackReason: attempted[0]?.failure.code,
            fallbackCount: fallbackCount + 1,
            retryCount: fallbackCount + 1,
            status: 200,
          },
        ),
      };
    }
  }

  const last =
    attempted[attempted.length - 1]?.failure ??
    fail(
      "All Groq models are currently unavailable. Try again later or switch provider in settings.",
      "provider_error",
    );
  const first = attempted[0]?.failure;
  const message =
    first?.code === "quota"
      ? "Groq rate limit reached. Try again later or choose another model."
      : first?.code === "context_length"
        ? "Request was too large. Try shortening the request."
        : first?.code === "missing_key"
          ? first.error
          : "All Groq models are currently unavailable. Try again later or switch provider in settings.";
  return {
    ...last,
    error: message,
    diagnostics: diagnostics(
      data,
      "groq",
      selected,
      attempted[attempted.length - 1]?.model ?? selected,
      {
        routed,
        fallback: fallbackCount > 0,
        fallbackReason: first?.code,
        fallbackCount,
        retryCount: fallbackCount,
        status: last.status,
        errorCategory: last.code,
      },
    ),
  };
}

async function callLovableChat(data: ChatInput): Promise<NormalizedChatResponse | ProviderFailure> {
  const key = cleanKey(process.env.LOVABLE_API_KEY);
  if (!key) return fail("Legacy/Lovable AI is not configured.", "missing_key");

  const body: Record<string, unknown> = {
    model: LOVABLE_MODEL,
    messages: [{ role: "system", content: defaultSystem(data) }, ...data.messages],
  };
  if (data.tools?.length) {
    body.tools = data.tools.map((t) => ({ type: "function", function: t }));
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
  const json = (await res.json()) as {
    choices?: {
      message?: {
        content?: string;
        tool_calls?: { id: string; function: { name: string; arguments: string } }[];
      };
    }[];
  };
  const msg = json.choices?.[0]?.message;
  return {
    ok: true as const,
    content: msg?.content ?? "",
    toolCalls: (msg?.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      argsJson: tc.function.arguments || "{}",
    })),
    diagnostics: diagnostics(data, "legacy-lovable", LOVABLE_MODEL, LOVABLE_MODEL, { status: 200 }),
  };
}

async function callChatProvider(data: ChatInput) {
  const provider = safeProvider(data.provider);
  if (provider === "legacy-lovable") return callLovableChat(data);
  if (provider === "gemini") return callGeminiChat(data);
  return callGroqChat(data);
}

async function geminiJson(
  system: string,
  user: unknown,
  input: ProviderOptions,
): Promise<{ ok: true; text: string } | ProviderFailure> {
  const resolved = resolveGeminiKey(input);
  if (!resolved.key)
    return fail(
      "Jarvis needs a Gemini API key. Add one in Jarvis AI Settings.",
      "missing_key",
      undefined,
      "none",
    );
  const parts = typeof user === "string" ? [{ text: user }] : user;
  const res = await postGemini(
    safeGeminiModel(input.geminiModel),
    resolved.key,
    resolved.source,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json" },
    },
    true,
  );
  if (!(res instanceof Response)) return res;
  if (!res.ok) return geminiHttpError(res.status, resolved.source);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return {
    ok: true as const,
    text: json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "",
  };
}

async function groqJson(
  system: string,
  user: unknown,
  input: ProviderOptions,
): Promise<{ ok: true; text: string } | ProviderFailure> {
  if (Array.isArray(user)) return geminiJson(system, user, input);
  const resolved = resolveGroqKey(input);
  if (!resolved.key)
    return fail(
      "Jarvis needs a Groq API key. Add one in Jarvis AI Settings.",
      "missing_key",
      undefined,
      "none",
    );
  const model = safeGroqModel(
    input.autoModelRouting === false
      ? input.groqModel
      : isComplexJarvisTask({
            messages: [{ role: "user", content: String(user) }],
            systemOverride: system,
            provider: "groq",
          })
        ? STRONG_GROQ_MODEL
        : DEFAULT_GROQ_MODEL,
  );
  const body = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: String(user) },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  };
  const res = await postGroq(model, resolved.key, resolved.source, body, true);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return groqHttpError(res.status, model, resolved.source, retryAfterMs(res));
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { ok: true as const, text: json.choices?.[0]?.message?.content ?? "" };
}

async function lovableJson(
  system: string,
  user: unknown,
): Promise<{ ok: true; text: string } | ProviderFailure> {
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
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return fail("Network failure while contacting Legacy/Lovable.", "network");
  }
  if (!res.ok) return lovableHttpError(res.status);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { ok: true as const, text: json.choices?.[0]?.message?.content ?? "" };
}

async function callJsonProvider(
  provider: AiProvider | undefined,
  system: string,
  user: unknown,
  input: ProviderOptions,
) {
  const p = safeProvider(provider);
  if (p === "legacy-lovable") return lovableJson(system, user);
  if (p === "gemini") return geminiJson(system, user, input);
  return groqJson(system, user, input);
}

function parseJsonText(raw: string) {
  return JSON.parse(
    raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim(),
  ) as Record<string, unknown>;
}

export const aiChat = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  try {
    return await callChatProvider(data);
  } catch {
    const p = safeProvider(data.provider);
    return fail(
      p === "gemini"
        ? "Gemini request failed. Try again."
        : p === "groq"
          ? "Groq request failed. Try again."
          : "Legacy AI request failed. Try again.",
      "provider_error",
    );
  }
});

export const testAiConnection = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  try {
    const provider = safeProvider(data.provider);
    if (provider === "legacy-lovable") {
      const key = cleanKey(process.env.LOVABLE_API_KEY);
      if (!key)
        return {
          ok: false as const,
          status: "not_configured" as const,
          provider,
          error: "Legacy provider is not configured.",
          code: "missing_key" as const,
        };
      const result = await callLovableChat({
        provider,
        messages: [{ role: "user", content: "Say connected." }],
        mode: "quick",
      });
      return result.ok
        ? { ok: true as const, status: "connected" as const, provider }
        : {
            ok: false as const,
            status:
              result.code === "missing_key" ? ("not_configured" as const) : ("failed" as const),
            provider,
            error: result.error,
            code: result.code,
          };
    }
    if (provider === "groq") {
      const resolved = resolveGroqKey(data);
      const model = safeGroqModel(data.groqModel);
      if (!resolved.key)
        return {
          ok: false as const,
          status: "not_configured" as const,
          provider,
          keySource: "none" as const,
          error: "Jarvis needs a Groq API key. Add one in Jarvis AI Settings.",
          code: "missing_key" as const,
        };
      const res = await postGroq(
        model,
        resolved.key,
        resolved.source,
        { messages: [{ role: "user", content: "Say connected." }], temperature: 0 },
        false,
      );
      if (!(res instanceof Response))
        return {
          ...res,
          status: res.code === "missing_key" ? ("not_configured" as const) : ("failed" as const),
          provider,
          keySource: resolved.source,
        };
      if (!res.ok) {
        const err = groqHttpError(res.status, model, resolved.source, retryAfterMs(res));
        return {
          ...err,
          status: err.code === "missing_key" ? ("not_configured" as const) : ("failed" as const),
          provider,
          keySource: resolved.source,
          model,
        };
      }
      return {
        ok: true as const,
        status: "connected" as const,
        provider,
        keySource: resolved.source,
        model,
      };
    }
    const resolved = resolveGeminiKey(data);
    if (!resolved.key)
      return {
        ok: false as const,
        status: "not_configured" as const,
        provider,
        keySource: "none" as const,
        error: "Jarvis needs a Gemini API key. Add one in Jarvis AI Settings.",
        code: "missing_key" as const,
      };
    const res = await postGemini(
      safeGeminiModel(data.geminiModel),
      resolved.key,
      resolved.source,
      {
        contents: [{ role: "user", parts: [{ text: "Say connected." }] }],
      },
      true,
    );
    if (!(res instanceof Response))
      return {
        ...res,
        status: res.code === "missing_key" ? ("not_configured" as const) : ("failed" as const),
        provider,
        keySource: resolved.source,
      };
    if (!res.ok) {
      const err = geminiHttpError(res.status, resolved.source);
      return {
        ...err,
        status: err.code === "missing_key" ? ("not_configured" as const) : ("failed" as const),
        provider,
        keySource: resolved.source,
      };
    }
    return {
      ok: true as const,
      status: "connected" as const,
      provider,
      keySource: resolved.source,
      model: safeGeminiModel(data.geminiModel),
    };
  } catch {
    return {
      ok: false as const,
      status: "failed" as const,
      provider: safeProvider(data.provider),
      error: "Connection test failed.",
      code: "network" as const,
    };
  }
});

/** Text-based food macro estimation. Returns structured items + totals. */
export const estimateFoodFromText = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  if (!data.text?.trim())
    return {
      ok: false as const,
      error: "No food text provided.",
      code: "malformed_request" as const,
    };
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
    const result = await callJsonProvider(
      data.provider,
      system,
      data.mealType ? `Meal type: ${data.mealType}\n\n${data.text}` : data.text,
      data,
    );
    if (!result.ok) return result;
    const p = parseJsonText(result.text);
    const items = Array.isArray(p.items)
      ? (p.items as Record<string, unknown>[]).map((it) => ({
          name: String(it.name ?? "item"),
          qty: typeof it.qty === "string" ? it.qty : undefined,
          calories: Math.round(Number(it.calories) || 0),
          protein: Math.round(Number(it.protein) || 0),
          carbs: Math.round(Number(it.carbs) || 0),
          fat: Math.round(Number(it.fat) || 0),
        }))
      : [];
    return {
      ok: true as const,
      estimate: {
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
      },
    };
  } catch {
    return {
      ok: false as const,
      error: "Couldn't parse AI estimate.",
      code: "tool_parse" as const,
    };
  }
});

export const estimateMealMacros = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  if (!data.imageDataUrl?.startsWith("data:image/")) {
    return {
      ok: false as const,
      error: "Invalid image. Please retake the photo.",
      code: "malformed_request" as const,
    };
  }
  const system = `You are a nutrition vision assistant. Look at the food photo and return a JSON estimate.
Respond ONLY with a compact JSON object - no prose, no markdown, no code fences - with keys:
{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "low"|"medium"|"high", "notes": string}
Numbers are grams and kcal for the full plate visible. Be conservative if portion is ambiguous.`;
  try {
    const user = [
      { text: data.hint ? `Hint: ${data.hint}` : "Estimate macros for this meal." },
      {
        inlineData: {
          mimeType: data.imageDataUrl.slice(5, data.imageDataUrl.indexOf(";")) || "image/jpeg",
          data: data.imageDataUrl.split(",")[1] || "",
        },
      },
    ];
    const result = await geminiJson(system, user, data);
    if (!result.ok) return result;
    const parsed = parseJsonText(result.text) as {
      name?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      confidence?: string;
      notes?: string;
    };
    return {
      ok: true as const,
      estimate: {
        name: parsed.name ?? "Meal",
        calories: Math.round(parsed.calories ?? 0),
        protein: Math.round(parsed.protein ?? 0),
        carbs: Math.round(parsed.carbs ?? 0),
        fat: Math.round(parsed.fat ?? 0),
        confidence: (parsed.confidence ?? "medium") as "low" | "medium" | "high",
        notes: parsed.notes ?? "",
      },
    };
  } catch {
    return {
      ok: false as const,
      error: "Couldn't parse AI estimate. Try a clearer photo.",
      code: "tool_parse" as const,
    };
  }
});
