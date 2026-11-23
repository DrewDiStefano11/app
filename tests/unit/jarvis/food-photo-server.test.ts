import { expect, test } from "bun:test";
import { estimatePhotoMeal, proposePhotoMealCorrection } from "../../../src/lib/jarvis/food-photo.server";
const estimate = { name: "Chicken", mealType: "dinner", recipeServings: 1, servingsEaten: 1, items: [{ id: "chicken", name: "Chicken", quantity: 6, unit: "oz", calories: 280, protein: 52, carbs: 0, fat: 6, evidence: "visible", preparation: "grilled" }], assumptions: ["Portion estimated"], question: "Any cooking oil?" };
const request = { consent: true, imageDataUrl: "data:image/jpeg;base64,/9j/2Q==", userGroqApiKey: "synthetic-key", groqKeyMode: "local" };
test("one isolated vision request returns validated ingredients; no automatic retry/fallback", async () => {
  let calls = 0;
  const result = await estimatePhotoMeal(request, { fetch: (async (url, init) => {
    calls++;
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("qwen/qwen3.8-27b");
    expect(body.messages).toHaveLength(2);
    expect(body.messages[1].content[1].image_url.url).toBe(request.imageDataUrl);
    expect(JSON.stringify(body.messages[1])).not.toMatch(/whoop|workout|profile/i);
    return Response.json({ choices: [{ message: { content: JSON.stringify(estimate) } }], usage: { prompt_tokens: 2100, completion_tokens: 200 } });
  }) as typeof fetch });
  expect(calls).toBe(1);
  expect(result).toMatchObject({ ok: true, estimate, usage: { promptTokens: 2100, completionTokens: 200 } });
});
test("invalid consent, remote URLs, missing/shared keys and excessive images never call provider", async () => {
  let calls = 0;
  const dependencies = { fetch: (async () => { calls++; return Response.json({}); }) as typeof fetch };
  for (const patch of [{ consent: false }, { imageDataUrl: "https://example.com/meal.jpg" }, { imageDataUrl: "data:image/jpeg;base64,Zm9v" }, { imageDataUrl: `data:image/jpeg;base64,${"a".repeat(2800000)}` }, { userGroqApiKey: "" }, { groqKeyMode: "environment" }]) {
    expect((await estimatePhotoMeal({ ...request, ...patch }, dependencies)).ok).toBe(false);
  }
  expect(calls).toBe(0);
});
test("corrections contain text and current ingredients but never resend images or original history", async () => {
  const result = await proposePhotoMealCorrection({ consent: true, estimate, correction: "Chicken was fried", userGroqApiKey: "synthetic-key" }, { fetch: (async (_, init) => {
    const body = JSON.parse(String(init?.body));
    expect(typeof body.messages[1].content).toBe("string");
    expect(JSON.stringify(body.messages[1])).not.toMatch(/data:image|image_url|original|corrections/);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ operations: [{ op: "preparation", id: "chicken", preparation: "fried", nutrition: { calories: 400, protein: 52, carbs: 3, fat: 18 } }] }) } }] });
  }) as typeof fetch });
  expect(result.ok).toBe(true);
});
test("rate limit, malformed model data, abort and slow body fail safely without content leakage", async () => {
  const limited = await estimatePhotoMeal(request, { fetch: (async () => new Response("private error", { status: 429, headers: { "Retry-After": "30" } })) as typeof fetch });
  expect(limited).toMatchObject({ ok: false, retryAfterMs: 30000 });
  expect(JSON.stringify(limited)).not.toContain("private error");
  const invalid = await estimatePhotoMeal(request, { fetch: (async () => Response.json({ choices: [{ message: { content: JSON.stringify({ ...estimate, items: [] }) } }] })) as typeof fetch });
  expect(invalid.ok).toBe(false);
  const controller = new AbortController(); controller.abort();
  expect((await estimatePhotoMeal(request, { signal: controller.signal })).ok).toBe(false);
  const slow = await estimatePhotoMeal(request, { timeoutMs: 5, fetch: (async () => new Response(new ReadableStream({ start() {} }))) as typeof fetch });
  expect(slow.ok).toBe(false);
});
