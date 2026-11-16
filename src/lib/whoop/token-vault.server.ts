import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import type { WhoopTokenPair } from "./oauth.server";

const version = "v1";
const algorithm = "aes-256-gcm";

const tokenPair = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export function createWhoopTokenVault(encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64url");
  if (key.length !== 32 || key.toString("base64url") !== encodedKey) {
    throw new Error("Invalid WHOOP encryption key");
  }

  const associatedData = (owner: string, connection: string) =>
    Buffer.from(JSON.stringify(["fitcore", "whoop", version, owner, connection]));

  return {
    seal(owner: string, connection: string, pair: WhoopTokenPair) {
      const iv = randomBytes(12);
      const cipher = createCipheriv(algorithm, key, iv);
      cipher.setAAD(associatedData(owner, connection));
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(pair), "utf8"),
        cipher.final(),
      ]);
      return [version, iv, ciphertext, cipher.getAuthTag()]
        .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
        .join(".");
    },
    open(owner: string, connection: string, envelope: string): WhoopTokenPair {
      try {
        const parts = envelope.split(".");
        if (parts.length !== 4 || parts[0] !== version) throw new Error();

        const [iv, ciphertext, tag] = parts.slice(1).map((part) => {
          const bytes = Buffer.from(part, "base64url");
          if (bytes.toString("base64url") !== part) throw new Error();
          return bytes;
        });
        if (iv.length !== 12 || tag.length !== 16) throw new Error();

        const decipher = createDecipheriv(algorithm, key, iv, { authTagLength: 16 });
        decipher.setAAD(associatedData(owner, connection));
        decipher.setAuthTag(tag);
        const bytes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return tokenPair.parse(JSON.parse(bytes.toString("utf8")));
      } catch {
        throw new Error("Invalid WHOOP token envelope");
      }
    },
  };
}
