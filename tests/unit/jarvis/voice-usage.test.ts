import { expect, test } from "bun:test";
import { reserveJarvisVoiceRequest } from "../../../src/lib/jarvis/cloud-usage";

test("voice request accounting is bounded, separate from text and contains no audio or transcript", () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  for (let index = 0; index < 4; index++)
    expect(reserveJarvisVoiceRequest(storage, 100_000 + index)).toBeUndefined();
  expect(reserveJarvisVoiceRequest(storage, 100_005)).toMatch(/minute/);
  expect(reserveJarvisVoiceRequest(storage, 161_000)).toBeUndefined();
  expect([...entries.keys()]).toEqual(["fitcore.jarvis.voiceRequests.v1"]);
  expect(JSON.parse([...entries.values()][0])).toEqual([100000, 100001, 100002, 100003, 161000]);
});
