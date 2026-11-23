import { z } from "zod";
import { fail, resolveGroqKey, retryAfterMs } from "./providers.server";

export const MAX_VOICE_BYTES = 2 * 1024 * 1024;
export const MAX_VOICE_DURATION_MS = 60_000;
const MODEL = "whisper-large-v3-turbo";
const mimeTypes = ["audio/mp4", "audio/webm", "audio/ogg", "audio/wav"] as const;
export const transcriptionInputSchema = z.strictObject({
  consent: z.literal(true),
  audioBase64: z
    .string()
    .min(1)
    .max(Math.ceil(MAX_VOICE_BYTES / 3) * 4),
  mimeType: z.enum(mimeTypes),
  durationMs: z.number().positive().max(MAX_VOICE_DURATION_MS),
  userGroqApiKey: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .regex(/^[^\r\n]+$/),
  groqKeyMode: z.enum(["local", "user", "environment"]).optional(),
});

type Dependencies = { fetch?: typeof fetch; signal?: AbortSignal; timeoutMs?: number };

function audioSignature(bytes: Uint8Array, mime: string) {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (mime === "audio/mp4") return bytes.length >= 12 && ascii(4, 8) === "ftyp";
  if (mime === "audio/webm")
    return [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value);
  if (mime === "audio/ogg") return ascii(0, 4) === "OggS";
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
}

/** A single consented upload; never logs, retains audio, retries, or changes fitness records. */
export async function transcribeJarvisAudio(input: unknown, dependencies: Dependencies = {}) {
  const parsed = transcriptionInputSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      "Check voice consent, recording size and your Groq key. You can type instead.",
      "malformed_request",
    );
  const data = parsed.data;
  const key = resolveGroqKey(data).key;
  if (!key)
    return fail(
      "Voice input needs your own Groq key. Shared provider credentials are unavailable.",
      "missing_key",
    );
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.audioBase64)) {
    return fail("The recording is unreadable. Record again or type instead.", "malformed_request");
  }
  const bytes = Buffer.from(data.audioBase64, "base64");
  if (!bytes.length || bytes.length > MAX_VOICE_BYTES || !audioSignature(bytes, data.mimeType)) {
    return fail(
      "The recording format or size is unsupported. You can type instead.",
      "malformed_request",
    );
  }
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectAbort: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    controller.abort();
    void reader?.cancel().catch(() => {});
    rejectAbort(new DOMException("Voice request interrupted", "AbortError"));
  };
  if (dependencies.signal?.aborted)
    return fail("Voice transcription was cancelled. Your records are unchanged.", "network");
  dependencies.signal?.addEventListener("abort", abort, { once: true });
  const deadline = setTimeout(abort, Math.min(dependencies.timeoutMs ?? 15_000, 15_000));
  try {
    return await Promise.race([
      aborted,
      (async () => {
        const form = new FormData();
        const extension = data.mimeType.split("/")[1];
        form.append(
          "file",
          new Blob([new Uint8Array(bytes)], { type: data.mimeType }),
          `voice.${extension}`,
        );
        form.append("model", MODEL);
        form.append("response_format", "verbose_json");
        form.append("temperature", "0");
        const response = await (dependencies.fetch ?? fetch)(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
            body: form,
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) {
          void response.body?.cancel().catch(() => {});
          throw new Error("Interrupted");
        }
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          const code =
            response.status === 429
              ? "quota"
              : response.status === 401
                ? "invalid_key"
                : response.status === 403
                  ? "permission_denied"
                  : "provider_error";
          return fail(
            response.status === 429
              ? "Groq voice limit reached. Wait before retrying, or type instead."
              : "Groq could not transcribe the recording. Check provider settings or type instead.",
            code,
            response.status,
            "local",
            retryAfterMs(response),
          );
        }
        reader = response.body?.getReader();
        if (!reader) throw new Error("Missing body");
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const part = await reader.read();
          if (controller.signal.aborted) throw new Error("Interrupted");
          if (part.done) break;
          total += part.value.byteLength;
          if (total > 65_536) {
            void reader.cancel().catch(() => {});
            throw new Error("Oversized reply");
          }
          chunks.push(part.value);
        }
        const raw = Buffer.concat(chunks);
        const result = JSON.parse(raw.toString("utf8")) as { text?: unknown; duration?: unknown };
        const text = typeof result.text === "string" ? result.text.trim() : "";
        if (!text || text.length > 4096)
          return fail(
            "No usable speech was found. Try a shorter recording or type instead.",
            "tool_parse",
          );
        const measuredDuration =
          typeof result.duration === "number" && Number.isFinite(result.duration)
            ? result.duration
            : undefined;
        if (
          measuredDuration !== undefined &&
          (measuredDuration <= 0 || measuredDuration > MAX_VOICE_DURATION_MS / 1000)
        ) {
          return fail(
            "Keep recordings to one minute. You can type the remaining details.",
            "malformed_request",
          );
        }
        const audioSeconds = measuredDuration ?? data.durationMs / 1000;
        return {
          ok: true as const,
          text,
          model: MODEL,
          audioSeconds,
          durationEstimated: measuredDuration === undefined,
          estimatedPaidTierCostUsd: (Math.max(10, audioSeconds) * 0.04) / 3600,
        };
      })(),
    ]);
  } catch {
    return fail(
      "Voice transcription was interrupted or unavailable. Your records are unchanged; you can type instead.",
      "network",
    );
  } finally {
    clearTimeout(deadline);
    dependencies.signal?.removeEventListener("abort", abort);
    reader?.releaseLock();
  }
}
