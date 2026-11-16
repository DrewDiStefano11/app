import { afterEach, expect, mock, test } from "bun:test";
import { callChatProvider } from "../../../src/lib/jarvis/providers.server";

const originalFetch = globalThis.fetch;
const originalGroqKey = process.env.GROQ_API_KEY;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalLovableKey = process.env.LOVABLE_API_KEY;
const messages = [{ role: "user", content: "Log a bench set" }] as const;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqKey;
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalLovableKey === undefined) delete process.env.LOVABLE_API_KEY;
  else process.env.LOVABLE_API_KEY = originalLovableKey;
});

function mockProvider(...responses: Response[]) {
  const fetchMock = mock(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const response = responses.shift();
    if (!response) throw new Error("Unexpected provider request");
    return response;
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

test("public requests cannot use deployment credentials for any provider", async () => {
  process.env.GROQ_API_KEY = "synthetic-shared-groq";
  process.env.GEMINI_API_KEY = "synthetic-shared-gemini";
  process.env.LOVABLE_API_KEY = "synthetic-shared-lovable";
  const providerFetch = mockProvider();
  for (const provider of ["groq", "gemini", "legacy-lovable"] as const) {
    const result = await callChatProvider({ provider, messages: [...messages] });
    expect(result.ok).toBe(false);
  }
  expect(providerFetch).not.toHaveBeenCalled();
});

test("Groq uses a supported model and passes only the supplied request credential", async () => {
  const providerFetch = mockProvider(
    Response.json({ choices: [{ message: { content: "Ready" } }] }),
  );
  const result = await callChatProvider({
    messages: [...messages],
    userGroqApiKey: "synthetic-user-key",
  });
  const request = providerFetch.mock.calls[0]?.[1];
  expect(JSON.parse(String(request?.body)).model).toBe("qwen/qwen3.8-27b");
  expect(new Headers(request?.headers).get("authorization")).toBe("Bearer synthetic-user-key");
  expect(result).toMatchObject({ ok: true, content: "Ready" });
});

test("an authentication failure never sends the prompt to the backup provider", async () => {
  const providerFetch = mockProvider(new Response(null, { status: 401 }));
  const result = await callChatProvider({
    messages: [...messages],
    userGroqApiKey: "synthetic-groq",
    userGeminiApiKey: "synthetic-gemini",
    allowGeminiFallback: true,
  });
  expect(result).toMatchObject({ ok: false, code: "invalid_key" });
  expect(providerFetch).toHaveBeenCalledTimes(1);
});

test("quota can use an explicitly enabled Gemini backup in a second request", async () => {
  const providerFetch = mockProvider(
    new Response(null, { status: 429 }),
    Response.json({ candidates: [{ content: { parts: [{ text: "Ready" }] } }] }),
  );
  const result = await callChatProvider({
    messages: [...messages],
    userGroqApiKey: "synthetic-groq",
    userGeminiApiKey: "synthetic-gemini",
    allowGeminiFallback: true,
  });
  expect(result).toMatchObject({
    ok: true,
    content: "Ready",
    diagnostics: { provider: "gemini", fallback: true },
  });
  expect(providerFetch).toHaveBeenCalledTimes(2);
});

test("malformed tool arguments fail the complete provider response", async () => {
  mockProvider(
    Response.json({
      choices: [
        {
          message: {
            content: "Saved",
            tool_calls: [{ id: "call-1", function: { name: "logMeal", arguments: "not JSON" } }],
          },
        },
      ],
    }),
  );
  const result = await callChatProvider({
    messages: [...messages],
    userGroqApiKey: "synthetic-user-key",
  });
  expect(result).toMatchObject({ ok: false, code: "tool_parse" });
});

test("a Groq outage uses at most one model fallback when enabled", async () => {
  const providerFetch = mockProvider(
    new Response(null, { status: 503 }),
    new Response(null, { status: 503 }),
  );
  const result = await callChatProvider({
    messages: [...messages],
    userGroqApiKey: "synthetic-groq",
    autoAiFallback: true,
  });
  expect(result).toMatchObject({
    ok: false,
    code: "overloaded",
    diagnostics: { provider: "groq", fallback: true, fallbackCount: 1 },
  });
  expect(providerFetch).toHaveBeenCalledTimes(2);
  const models = providerFetch.mock.calls.map(
    ([, request]) => JSON.parse(String(request?.body)).model,
  );
  expect(new Set(models).size).toBe(2);
});

test("an aborted provider request returns a retryable result without another request by default", async () => {
  const request = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
    throw new DOMException("Synthetic timeout", "TimeoutError");
  });
  globalThis.fetch = request as unknown as typeof fetch;
  const result = await callChatProvider({
    messages: [...messages],
    userGroqApiKey: "synthetic-groq",
  });
  expect(result).toMatchObject({ ok: false, code: "network" });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
});
