type Provider = "groq" | "gemini";
type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const keyNames: Record<Provider, string> = {
  groq: "fitcore.jarvis.groqApiKey.v1",
  gemini: "fitcore.jarvis.geminiApiKey.v1",
};

export function createJarvisKeyStore(storage: () => StorageAccess) {
  const temporary: Partial<Record<Provider, string>> = {};

  return {
    read(provider: Provider) {
      const current = temporary[provider];
      if (current) return { key: current, source: "temporary" as const };
      try {
        const saved = storage().getItem(keyNames[provider]);
        if (saved) return { key: saved, source: "saved" as const };
      } catch {
        // Browser storage can be disabled. Temporary credentials still work.
      }
      return { key: "", source: "none" as const };
    },
    useTemporary(provider: Provider, key: string) {
      const value = key.trim();
      if (!value) return false;
      temporary[provider] = value;
      return true;
    },
    save(provider: Provider, key: string) {
      const value = key.trim();
      if (!value) return false;
      try {
        storage().setItem(keyNames[provider], value);
        delete temporary[provider];
        return true;
      } catch {
        return false;
      }
    },
    clear(provider: Provider) {
      delete temporary[provider];
      try {
        storage().removeItem(keyNames[provider]);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const jarvisProviderKeys = createJarvisKeyStore(() => window.localStorage);
