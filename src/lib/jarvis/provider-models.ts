export const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
] as const;
export const GEMINI_MODELS = ["gemini-3.5-flash-lite"] as const;

export type CurrentGroqModel = (typeof GROQ_MODELS)[number];
export type CurrentGeminiModel = (typeof GEMINI_MODELS)[number];

// Retain old IDs in persisted settings so existing backups still validate.
export const STORED_GROQ_MODELS = [
  ...GROQ_MODELS,
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
] as const;
export const STORED_GEMINI_MODELS = [
  ...GEMINI_MODELS,
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
] as const;

export function selectedGroqModel(model: unknown): CurrentGroqModel {
  if (model === "llama-3.1-8b-instant") return "openai/gpt-oss-20b";
  if (model === "llama-3.3-70b-versatile") return "openai/gpt-oss-120b";
  return GROQ_MODELS.find((candidate) => candidate === model) ?? GROQ_MODELS[0];
}

export function selectedGeminiModel(_model?: unknown): CurrentGeminiModel {
  return GEMINI_MODELS[0];
}

// Photo analysis reopens with explicit image review and consent in the photo milestone.
export const JARVIS_PHOTO_ANALYSIS_ENABLED = false;


// Unpaid Gemini terms prohibit personal/sensitive input. No paid use is authorized.
export const JARVIS_GEMINI_PERSONAL_DATA_ENABLED = false;
export const GEMINI_PERSONAL_DATA_NOTICE = "Gemini is unavailable for personal fitness data under its unpaid-service terms. Choose Groq or use local logging.";
