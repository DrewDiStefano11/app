import { createHmac } from "node:crypto";
import { expect, test } from "bun:test";
import { verifyWhoopWebhook } from "../../src/lib/whoop/webhook.server";

const now = Date.parse("2026-11-16T10:00:00Z");
const secret = "synthetic-webhook-secret";
const event = {
  user_id: 73,
  id: "123e4567-e89b-12d3-a456-426614174000",
  type: "recovery.deleted",
  trace_id: "one-delivery",
};
const body = JSON.stringify(event, null, 2);

function request(payload: string, timestamp = now, signedPayload = payload, key = secret) {
  const time = String(timestamp);
  return new Request("https://fitcore.test/api/whoop/webhook", {
    method: "POST",
    headers: {
      "X-WHOOP-Signature-Timestamp": time,
      "X-WHOOP-Signature": createHmac("sha256", key)
        .update(time)
        .update(signedPayload)
        .digest("base64"),
    },
    body: payload,
  });
}

test("verifies the exact signed bytes and accepts a WHOOP v2 event", async () => {
  expect(await verifyWhoopWebhook(request(body), secret, now)).toEqual({
    userId: "73",
    recordId: event.id,
    type: event.type,
    traceId: event.trace_id,
  });
  expect(
    await verifyWhoopWebhook(request(body, now, JSON.stringify(event)), secret, now),
  ).toBeNull();
  expect(await verifyWhoopWebhook(request(body, now, body, "wrong"), secret, now)).toBeNull();
});

test("rejects replay-window violations, legacy IDs, invalid JSON and oversized inputs", async () => {
  expect(await verifyWhoopWebhook(request(body, now - 301_000), secret, now)).toBeNull();
  expect(await verifyWhoopWebhook(request(body, now + 301_000), secret, now)).toBeNull();
  expect(
    await verifyWhoopWebhook(request(JSON.stringify({ ...event, id: 100 })), secret, now),
  ).toBeNull();
  expect(await verifyWhoopWebhook(request("invalid JSON"), secret, now)).toBeNull();
  expect(await verifyWhoopWebhook(request(body + " ".repeat(17_000)), secret, now)).toBeNull();
});
