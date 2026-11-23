import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  callChatProvider,
  defaultSystem,
  callJsonProvider,
  fail,
  geminiHttpError,
  geminiJson,
  groqHttpError,
  postGemini,
  postGroq,
  resolveGeminiKey,
  resolveGroqKey,
  retryAfterMs,
  safeGeminiModel,
  safeGroqModel,
  safeProvider,
  sharedAccessDisabled,
} from "./jarvis/providers.server";

import {
  JARVIS_PHOTO_ANALYSIS_ENABLED,
  JARVIS_GEMINI_PERSONAL_DATA_ENABLED,
  GEMINI_PERSONAL_DATA_NOTICE,
  STORED_GEMINI_MODELS,
  STORED_GROQ_MODELS,
} from "./jarvis/provider-models";

const aiProviderSchema = z.enum(["groq", "gemini", "legacy-lovable"]);
const aiKeyModeSchema = z.enum(["local", "environment", "user"]);
const geminiModelSchema = z.enum(STORED_GEMINI_MODELS);
const groqModelSchema = z.enum(STORED_GROQ_MODELS);

const providerOptionsSchema = z.object({
  provider: aiProviderSchema.optional(),
  geminiKeyMode: aiKeyModeSchema.optional(),
  userGeminiApiKey: z.string().max(512).optional(),
  geminiModel: geminiModelSchema.optional(),
  groqKeyMode: aiKeyModeSchema.optional(),
  userGroqApiKey: z.string().max(512).optional(),
  groqModel: groqModelSchema.optional(),
  autoModelRouting: z.boolean().optional(),
  autoAiFallback: z.boolean().optional(),
  allowGeminiFallback: z.boolean().optional(),
});

const toolDescriptorSchema = z.object({
  name: z.string().max(64),
  description: z.string().max(1_024),
  parameters: z
    .record(z.string(), z.unknown())
    .refine((value) => JSON.stringify(value).length <= 8_192),
});

const chatInputSchema = providerOptionsSchema.extend({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(4_096),
      }),
    )
    .min(1)
    .max(12),
  mode: z.enum(["quick", "detailed"]).optional(),
  context: z.string().max(8_192).optional(),
  tools: z.array(toolDescriptorSchema).max(48).optional(),
  systemOverride: z.string().max(16_384).optional(),
  includeWhoop: z.boolean().optional(),
});

const connectionTestInputSchema = providerOptionsSchema.extend({});

const estimateInputSchema = providerOptionsSchema.extend({
  imageDataUrl: z.string(),
  hint: z.string().optional(),
});

const estimateTextInputSchema = providerOptionsSchema.extend({
  text: z.string().max(4_096),
  mealType: z.string().max(64).optional(),
  detail: z.enum(["simple", "normal", "detailed"]).optional(),
  learnedHints: z.string().max(2_048).optional(),
});

function parseJsonText(raw: string) {
  return JSON.parse(
    raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim(),
  ) as Record<string, unknown>;
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator(chatInputSchema)
  .handler(async ({ data }) => {
    if (data.provider === "gemini" && !JARVIS_GEMINI_PERSONAL_DATA_ENABLED) return fail(GEMINI_PERSONAL_DATA_NOTICE, "permission_denied");
    try {
      if (data.includeWhoop === true) {
        setResponseHeader("Cache-Control", "no-store");
        const { readWhoopJarvisSnapshot } = await import("./whoop/request.server");
        const { resolveWhoopJarvisContext } = await import("./whoop/jarvis-context.server");
        const access = await readWhoopJarvisSnapshot(getRequest()).catch(() => null);
        const shared = await resolveWhoopJarvisContext(
          true,
          async () => access?.snapshot ?? null,
        );
        if (!shared || !access || !(await access.isCurrent())) {
          return fail("Recent WHOOP measurements are unavailable. Check the connection, wait a moment, or send without sharing.", "malformed_request");
        }
        const result = await callChatProvider({
          ...data,
          allowGeminiFallback: false,
          tools: data.tools?.filter((tool) => tool.name.startsWith("get")),
          systemOverride: defaultSystem(data) + "\n\n" + shared.text,
        });
        if (!result.ok) return result;
        if (!(await access.isCurrent())) {
          return fail("WHOOP measurements changed during this request. Refresh and send again.", "malformed_request");
        }
        return { ...result, whoopExpiresAt: shared.expiresAt };
      }
      return await callChatProvider({ ...data, allowGeminiFallback: JARVIS_GEMINI_PERSONAL_DATA_ENABLED && data.allowGeminiFallback === true });
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

export const testAiConnection = createServerFn({ method: "POST" })
  .inputValidator(connectionTestInputSchema)
  .handler(async ({ data }) => {
    try {
      const provider = safeProvider(data.provider);
      if (
        provider === "legacy-lovable" ||
        (provider === "groq" ? data.groqKeyMode : data.geminiKeyMode) === "environment"
      ) {
        return { ...sharedAccessDisabled(), status: "not_configured" as const, provider };
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
        const res = await postGroq(model, resolved.key, resolved.source, {
          messages: [{ role: "user", content: "Say connected." }],
          temperature: 0,
          max_completion_tokens: 64,
        });
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
export const estimateFoodFromText = createServerFn({ method: "POST" })
  .inputValidator(estimateTextInputSchema)
  .handler(async ({ data }) => {
    if (data.provider === "gemini" && !JARVIS_GEMINI_PERSONAL_DATA_ENABLED) return fail(GEMINI_PERSONAL_DATA_NOTICE, "permission_denied");
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
        { ...data, allowGeminiFallback: JARVIS_GEMINI_PERSONAL_DATA_ENABLED && data.allowGeminiFallback === true },
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

export const estimateMealMacros = createServerFn({ method: "POST" })
  .inputValidator(estimateInputSchema)
  .handler(async ({ data }) => {
    if (!JARVIS_PHOTO_ANALYSIS_ENABLED) {
      return {
        ok: false as const,
        error: "AI photo analysis is unavailable.",
        code: "permission_denied" as const,
      };
    }
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
