import { expect, test } from "bun:test";
import { createWhoopTokenVault } from "../../src/lib/whoop/token-vault.server";

const secret = Buffer.alloc(32, 123).toString("base64url");
const pair = {
  accessToken: "synthetic-access",
  refreshToken: "synthetic-refresh",
  expiresIn: 3600,
};

test("WHOOP credentials are encrypted with fresh nonces and bound to their owner and connection", () => {
  const vault = createWhoopTokenVault(secret);
  const first = vault.seal("owner-a", "connection-a", pair);
  const second = vault.seal("owner-a", "connection-a", pair);
  expect(first).not.toBe(second);
  expect(first).not.toContain("synthetic-access");
  expect(first).not.toContain("synthetic-refresh");
  expect(vault.open("owner-a", "connection-a", first)).toEqual(pair);
  expect(() => vault.open("owner-b", "connection-a", first)).toThrow();
  expect(() => vault.open("owner-a", "connection-b", first)).toThrow();
});

test("WHOOP token decryption fails closed when the ciphertext or key changes", () => {
  const vault = createWhoopTokenVault(secret);
  const encrypted = vault.seal("owner-a", "connection-a", pair);
  const pieces = encrypted.split(".");
  pieces[2] = (pieces[2].startsWith("A") ? "B" : "A") + pieces[2].slice(1);
  expect(() => vault.open("owner-a", "connection-a", pieces.join("."))).toThrow();
  const otherVault = createWhoopTokenVault(Buffer.alloc(32, 7).toString("base64url"));
  expect(() => otherVault.open("owner-a", "connection-a", encrypted)).toThrow();
  expect(() => createWhoopTokenVault("invalid-key")).toThrow();
});
