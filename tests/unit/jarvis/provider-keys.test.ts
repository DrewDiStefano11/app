import { expect, test } from "bun:test";
import { createJarvisKeyStore } from "../../../src/lib/jarvis/provider-keys";

test("temporary keys take precedence and disappear with the loaded page", () => {
  const bytes = new Map<string, string>([["fitcore.jarvis.groqApiKey.v1", "previous-key"]]);
  const storage = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bytes.set(key, value);
    },
    removeItem: (key: string) => {
      bytes.delete(key);
    },
  };
  const page = createJarvisKeyStore(() => storage);
  expect(page.useTemporary("groq", "one-use-key")).toBe(true);
  expect(page.read("groq")).toEqual({ key: "one-use-key", source: "temporary" });
  expect([...bytes.values()]).toEqual(["previous-key"]);
  const reloaded = createJarvisKeyStore(() => storage);
  expect(reloaded.read("groq")).toEqual({ key: "previous-key", source: "saved" });

  expect(page.clear("groq")).toBe(true);
  expect(page.read("groq")).toEqual({ key: "", source: "none" });
  expect(bytes.size).toBe(0);
});
