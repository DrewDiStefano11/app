import {
  selectedGeminiModel as safeGeminiModel,
  selectedGroqModel as safeGroqModel,
  type CurrentGeminiModel,
  type CurrentGroqModel,
} from "./provider-models";
import type { GeminiModel, GroqModel } from "../types";

export { safeGeminiModel, safeGroqModel };

type AiProvider = "groq" | "gemini" | "legacy-lovable";
type AiKeyMode = "local" | "environment" | "user";
type GeminiKeyMode = AiKeyMode;
type GroqKeyMode = AiKeyMode;
type KeySource = "local" | "none";
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

const REQUEST_TIMEOUT_MS = 8_000;
const FAST_GROQ_MODEL = "openai/gpt-oss-20b";
const STRONG_GROQ_MODEL = "openai/gpt-oss-120b";
const TOOL_GROQ_MODEL = "qwen/qwen3.8-27b";
const SHARED_ACCESS_DISABLED =
  "Shared AI access requires authenticated FitCore access. Choose a provider and use your own key in Jarvis AI Settings.";

function cleanKey(value: string | undefined) {
  return value?.trim() ?? "";
}

export function safeProvider(input?: AiProvider): AiProvider {
  return input ?? "groq";
}

export function fail(
  error: string,
  code: ErrorCode,
  status?: number,
  keySource?: KeySource,
  retryAfterMs?: number,
): ProviderFailure {
  return { ok: false as const, error, code, status, keySource, retryAfterMs };
}

function resolveUserKey(mode: AiKeyMode | undefined, key: string | undefined) {
  const userKey = mode === "environment" ? "" : cleanKey(key);
  return { key: userKey, source: userKey ? ("local" as const) : ("none" as const) };
}

export function resolveGeminiKey(input: ProviderOptions) {
  return resolveUserKey(input.geminiKeyMode, input.userGeminiApiKey);
}

export function resolveGroqKey(input: ProviderOptions) {
  return resolveUserKey(input.groqKeyMode, input.userGroqApiKey);
}

export function sharedAccessDisabled() {
  return fail(SHARED_ACCESS_DISABLED, "permission_denied");
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

function parseToolArguments(raw: unknown) {
  const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected named tool arguments");
  }
  return JSON.stringify(value);
}

function normalizedReply(
  content: string,
  toolCalls: NormalizedChatResponse["toolCalls"],
): NormalizedChatResponse {
  if (
    typeof content !== "string" ||
    (!content.trim() && !toolCalls.length) ||
    toolCalls.length > 8
  ) {
    throw new Error("Invalid reply");
  }
  const ids = toolCalls.map((call) => call.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate tool call ID");
  return { ok: true, content, toolCalls };
}

function parseGeminiResponse(json: unknown): NormalizedChatResponse | ProviderFailure {
  try {
    const root = json as {
      candidates?: {
        content?: {
          parts?: {
            text?: string;
            thought?: boolean;
            functionCall?: { id?: string; name?: string; args?: unknown };
          }[];
        };
      }[];
    };
    const parts = root.candidates?.[0]?.content?.parts ?? [];
    const content = parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .filter(Boolean)
      .join("\n");
    const toolCalls = parts.flatMap((part, index) => {
      const fc = part.functionCall;
      if (!fc) return [];
      if (typeof fc.name !== "string" || !fc.name) throw new Error("Missing tool name");
      return [
        {
          id: fc.id || `gemini-call-${index}`,
          name: fc.name,
          argsJson: parseToolArguments(fc.args ?? {}),
        },
      ];
    });
    return normalizedReply(content, toolCalls);
  } catch {
    return fail("Gemini returned an unreadable response. Try again.", "tool_parse");
  }
}

function parseGroqResponse(json: unknown): NormalizedChatResponse | ProviderFailure {
  try {
    const root = json as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: { id?: string; function?: { name?: string; arguments?: unknown } }[];
        };
      }[];
    };
    const msg = root.choices?.[0]?.message;
    const toolCalls = (msg?.tool_calls ?? []).map((call, index) => {
      const name = call.function?.name;
      if (typeof name !== "string" || !name) throw new Error("Missing tool name");
      return {
        id: call.id || `groq-call-${index}`,
        name,
        argsJson: parseToolArguments(call.function?.arguments),
      };
    });
    return normalizedReply(msg?.content ?? "", toolCalls);
  } catch {
    return fail("Groq returned an unreadable response. Try again.", "tool_parse");
  }
}

export function retryAfterMs(res: Response) {
  const raw = res.headers.get("retry-after") || res.headers.get("x-ratelimit-reset-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(1000, date - Date.now()) : undefined;
}

export function geminiHttpError(status: number, keySource?: KeySource): ProviderFailure {
  if (status === 400)
    return fail(
      "Gemini rejected the request format. Try a shorter prompt.",
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
      "The selected Gemini model is unavailable. Check your provider settings.",
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
      "Gemini is temporarily overloaded or unavailable. Try again later.",
      "overloaded",
      status,
      keySource,
    );
  if (status >= 500)
    return fail(
      "Gemini is temporarily unavailable. Try again later.",
      "overloaded",
      status,
      keySource,
    );
  return fail(`Gemini request failed (${status}).`, "provider_error", status, keySource);
}

export function groqHttpError(
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

function canUseBackup(code: ErrorCode) {
  return [
    "quota",
    "model_unavailable",
    "overloaded",
    "network",
    "tool_parse",
    "context_length",
  ].includes(code);
}

export async function postGemini(
  model: CurrentGeminiModel,
  key: string,
  keySource: KeySource,
  body: Record<string, unknown>,
): Promise<Response | ProviderFailure> {
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    return fail(
      "Could not reach Gemini before the request ended. Try again.",
      "network",
      undefined,
      keySource,
    );
  }
}

export async function postGroq(
  model: CurrentGroqModel,
  key: string,
  keySource: KeySource,
  body: Record<string, unknown>,
): Promise<Response | ProviderFailure> {
  try {
    return await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ ...body, model }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return fail(
      "Could not reach Groq before the request ended. Try again.",
      "network",
      undefined,
      keySource,
    );
  }
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

async function callGeminiChat(data: ChatInput): Promise<NormalizedChatResponse | ProviderFailure> {
  const resolved = resolveGeminiKey(data);
  if (!resolved.key && data.geminiKeyMode === "environment") return sharedAccessDisabled();
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
    generationConfig: { maxOutputTokens: 2_048 },
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
  const res = await postGemini(model, resolved.key, resolved.source, body);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return geminiHttpError(res.status, resolved.source);
  const parsed = parseGeminiResponse(await res.json().catch(() => null));
  return parsed.ok
    ? { ...parsed, diagnostics: diagnostics(data, "gemini", model, model, { status: 200 }) }
    : parsed;
}

async function callGroqModel(
  data: ChatInput,
  model: CurrentGroqModel,
): Promise<NormalizedChatResponse | ProviderFailure> {
  const resolved = resolveGroqKey(data);
  if (!resolved.key && data.groqKeyMode === "environment") return sharedAccessDisabled();
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
    max_completion_tokens: 2_048,
  };
  if (data.tools?.length) {
    body.tools = data.tools.map((t) => ({
      type: "function",
      function: { ...t, parameters: stripUnsupportedSchema(t.parameters) },
    }));
    body.tool_choice = "auto";
  }
  const res = await postGroq(model, resolved.key, resolved.source, body);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return groqChatHttpError(res, model, resolved.source);
  return parseGroqResponse(await res.json().catch(() => null));
}

async function callGroqChat(data: ChatInput): Promise<NormalizedChatResponse | ProviderFailure> {
  const selected = safeGroqModel(data.groqModel);
  const routed = data.autoModelRouting !== false;
  const model = routed && data.tools?.length ? TOOL_GROQ_MODEL : selected;
  const first = await callGroqModel(data, model);
  if (first.ok || !canUseBackup(first.code)) {
    return {
      ...first,
      diagnostics: diagnostics(data, "groq", selected, model, {
        routed,
        status: first.ok ? 200 : first.status,
        errorCategory: first.ok ? undefined : first.code,
      }),
    };
  }

  const useGemini = data.allowGeminiFallback === true && Boolean(resolveGeminiKey(data).key);
  const backupModel = model === TOOL_GROQ_MODEL ? STRONG_GROQ_MODEL : TOOL_GROQ_MODEL;
  const useModelBackup = data.autoAiFallback === true && !useGemini;
  const backup = useGemini
    ? await callGeminiChat(data)
    : useModelBackup
      ? await callGroqModel(data, backupModel)
      : undefined;
  const result = backup ?? first;
  const provider = useGemini ? "gemini" : "groq";
  const actual = useGemini
    ? safeGeminiModel(data.geminiModel)
    : useModelBackup
      ? backupModel
      : model;
  return {
    ...result,
    diagnostics: diagnostics(data, provider, selected, actual, {
      routed,
      fallback: Boolean(backup),
      fallbackReason: backup ? first.code : undefined,
      fallbackCount: backup ? 1 : 0,
      retryCount: backup ? 1 : 0,
      status: result.ok ? 200 : result.status,
      errorCategory: result.ok ? undefined : result.code,
    }),
  };
}

export async function callChatProvider(data: ChatInput) {
  const provider = safeProvider(data.provider);
  if (provider === "legacy-lovable") return sharedAccessDisabled();
  if (provider === "gemini") return callGeminiChat(data);
  return callGroqChat(data);
}

export async function geminiJson(
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
  const res = await postGemini(safeGeminiModel(input.geminiModel), resolved.key, resolved.source, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json" },
  });
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
        : FAST_GROQ_MODEL,
  );
  const body = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: String(user) },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  };
  const res = await postGroq(model, resolved.key, resolved.source, body);
  if (!(res instanceof Response)) return res;
  if (!res.ok) return groqHttpError(res.status, model, resolved.source, retryAfterMs(res));
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { ok: true as const, text: json.choices?.[0]?.message?.content ?? "" };
}

export async function callJsonProvider(
  provider: AiProvider | undefined,
  system: string,
  user: unknown,
  input: ProviderOptions,
) {
  const p = safeProvider(provider);
  if (p === "legacy-lovable") return sharedAccessDisabled();
  if (p === "gemini") return geminiJson(system, user, input);
  return groqJson(system, user, input);
}
