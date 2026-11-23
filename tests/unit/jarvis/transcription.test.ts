import { expect, test } from "bun:test";
import {
  transcribeJarvisAudio,
  MAX_VOICE_BYTES,
} from "../../../src/lib/jarvis/transcription.server";

const clip = Buffer.from([
  0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0,
]).toString("base64");
const input = {
  consent: true as const,
  audioBase64: clip,
  mimeType: "audio/mp4" as const,
  durationMs: 1200,
  userGroqApiKey: "synthetic-key",
};

test("transcription requires consent, a caller key and bounded audio before any provider call", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return Response.json({ text: "Log creatine", duration: 1.2 });
  };
  for (const change of [
    { consent: false },
    { userGroqApiKey: "" },
    { groqKeyMode: "environment" },
    { durationMs: 60_001 },
    { audioBase64: Buffer.alloc(MAX_VOICE_BYTES + 1).toString("base64") },
    { audioBase64: "not_base64" },
    { mimeType: "image/jpeg" },
  ]) {
    const result = await transcribeJarvisAudio({ ...input, ...change }, { fetch: fetcher });
    expect(result.ok).toBe(false);
  }
  expect(calls).toBe(0);
});

test("one explicit upload sends only the clip and caller key and returns editable bounded text", async () => {
  const result = await transcribeJarvisAudio(input, {
    fetch: async (url, options) => {
      expect(String(url)).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
      expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer synthetic-key");
      const body = options?.body as FormData;
      expect([...body.keys()].sort()).toEqual(["file", "model", "response_format", "temperature"]);
      expect(body.get("model")).toBe("whisper-large-v3-turbo");
      expect((body.get("file") as File).type).toBe("audio/mp4");
      return Response.json({ text: "  I benched 185 pounds for eight reps.  ", duration: 1.2 });
    },
  });
  expect(result).toMatchObject({
    ok: true,
    text: "I benched 185 pounds for eight reps.",
    model: "whisper-large-v3-turbo",
    audioSeconds: 1.2,
  });
  expect(JSON.stringify(result)).not.toContain("synthetic-key");
});

test("rate limits never retry and return Retry-After without leaking provider content", async () => {
  let calls = 0;
  const result = await transcribeJarvisAudio(input, {
    fetch: async () => {
      calls++;
      return new Response("private provider body", {
        status: 429,
        headers: { "Retry-After": "12" },
      });
    },
  });
  expect(calls).toBe(1);
  expect(result).toMatchObject({ ok: false, code: "quota", retryAfterMs: 12000 });
  expect(JSON.stringify(result)).not.toContain("private provider body");
});

test("invalid, empty, oversized and overlong transcripts are rejected without executing anything", async () => {
  for (const response of [
    { text: "" },
    { text: "x".repeat(4097) },
    { text: "Log creatine", duration: 61 },
    { text: { command: "log" } },
  ]) {
    const result = await transcribeJarvisAudio(input, {
      fetch: async () => Response.json(response),
    });
    expect(result.ok).toBe(false);
  }
});

test("an aborted request returns safely without calling a provider", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const result = await transcribeJarvisAudio(input, {
    signal: controller.signal,
    fetch: async () => {
      calls++;
      return Response.json({ text: "Never" });
    },
  });
  expect(result.ok).toBe(false);
  expect(calls).toBe(0);
});

test("the deadline includes a stalled response body even if fetch ignores cancellation", async () => {
  const result = await transcribeJarvisAudio(input, {
    timeoutMs: 10,
    fetch: async () =>
      new Response(new ReadableStream({ start() {} }), {
        headers: { "Content-Type": "application/json" },
      }),
  });
  expect(result).toMatchObject({ ok: false, code: "network" });
});
