import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const acceptanceWindowMs = 5 * 60_000;
const bodyLimit = 16 * 1024;
const webhookEvent = z
  .object({
    user_id: z.union([z.int().positive(), z.string().regex(/^[1-9]\d{0,18}$/)]).transform(String),
    id: z.uuid().transform((id) => id.toLowerCase()),
    type: z.enum([
      "recovery.updated",
      "recovery.deleted",
      "sleep.updated",
      "sleep.deleted",
      "workout.updated",
      "workout.deleted",
    ]),
    trace_id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  })
  .transform(({ user_id, id, trace_id, type }) => ({
    userId: user_id,
    recordId: id,
    traceId: trace_id,
    type,
  }));

export type WhoopWebhookEvent = z.output<typeof webhookEvent>;

export async function verifyWhoopWebhook(
  request: Request,
  secret: string,
  now = Date.now(),
): Promise<WhoopWebhookEvent | null> {
  if (request.method !== "POST" || !secret) return null;
  const timestamp = request.headers.get("X-WHOOP-Signature-Timestamp") ?? "";
  const encoded = request.headers.get("X-WHOOP-Signature") ?? "";
  if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > acceptanceWindowMs)
    return null;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded) || !request.body) return null;
  const supplied = Buffer.from(encoded, "base64");
  if (supplied.toString("base64") !== encoded) return null;

  const hmac = createHmac("sha256", secret).update(timestamp);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > bodyLimit) {
        void reader.cancel().catch(() => {});
        return null;
      }
      hmac.update(next.value);
      chunks.push(next.value);
    }
    if (!timingSafeEqual(hmac.digest(), supplied)) return null;
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, length));
    const event = webhookEvent.safeParse(JSON.parse(raw));
    return event.success ? event.data : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
