import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { normalizeWhoopRecord, type WhoopV2Record } from "./v2.server";

export type WhoopArchiveIdentity = {
  ownerId: string;
  connectionId: string;
  providerUserId: string;
  kind: WhoopV2Record["kind"];
  recordId: string;
  updatedAt: string;
};

// Domain separation prevents archive ciphertext being accepted as token ciphertext.
export function createWhoopArchiveVault(encodedKey: string) {
  const master = Buffer.from(encodedKey, "base64url");
  if (master.length !== 32 || master.toString("base64url") !== encodedKey)
    throw new Error("Invalid WHOOP encryption key");
  const key = Buffer.from(hkdfSync("sha256", master, "fitcore-whoop", "owner-archive-v1", 32));
  const aad = (identity: WhoopArchiveIdentity) =>
    Buffer.from(
      JSON.stringify([
        "fitcore-whoop-archive-v1",
        identity.ownerId,
        identity.connectionId,
        identity.providerUserId,
        identity.kind,
        identity.recordId,
        identity.updatedAt,
      ]),
    );
  const validate = (identity: WhoopArchiveIdentity, input: unknown) => {
    if (
      !input ||
      typeof input !== "object" ||
      !("source" in input) ||
      input.source !== "whoop" ||
      !("kind" in input) ||
      input.kind !== identity.kind ||
      !("calibrating" in input) ||
      typeof input.calibrating !== "boolean"
    )
      throw new Error("Invalid WHOOP archive record");
    const record = normalizeWhoopRecord(identity.kind, input);
    if (
      record.id !== identity.recordId ||
      record.user_id !== identity.providerUserId ||
      Date.parse(record.updated_at) !== Date.parse(identity.updatedAt)
    )
      throw new Error("Invalid WHOOP archive identity");
    // Normalized calibrating recoveries intentionally omit the unready provider score.
    if (input.calibrating && (identity.kind !== "recovery" || record.score !== null))
      throw new Error("Invalid WHOOP archive record");
    return { ...record, calibrating: input.calibrating };
  };
  return {
    seal(identity: WhoopArchiveIdentity, input: WhoopV2Record) {
      const record = validate(identity, input);
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(aad(identity));
      const bytes = Buffer.concat([cipher.update(JSON.stringify(record), "utf8"), cipher.final()]);
      return [
        "v1",
        iv.toString("base64url"),
        bytes.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
      ].join(".");
    },
    open(identity: WhoopArchiveIdentity, envelope: string): WhoopV2Record {
      try {
        const parts = envelope.split(".");
        if (parts.length !== 4 || parts[0] !== "v1") throw new Error();
        const [iv, ciphertext, tag] = parts.slice(1).map((part) => {
          const bytes = Buffer.from(part, "base64url");
          if (bytes.toString("base64url") !== part) throw new Error();
          return bytes;
        });
        if (iv.length !== 12 || tag.length !== 16) throw new Error();
        const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
        decipher.setAAD(aad(identity));
        decipher.setAuthTag(tag);
        const bytes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return validate(identity, JSON.parse(bytes.toString("utf8")));
      } catch {
        throw new Error("Invalid WHOOP archive envelope");
      }
    },
  };
}
