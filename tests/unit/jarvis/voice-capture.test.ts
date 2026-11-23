import { expect, test } from "bun:test";
import { createVoiceCapture } from "../../../src/lib/jarvis/voice-capture";

function fixture() {
  let stops = 0,
    uploads = 0,
    clock = 0;
  const messages: string[] = [],
    transcripts: string[] = [];
  const track = {
    stop() {
      stops++;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const recorder = {
    state: "inactive",
    mimeType: "audio/mp4",
    ondataavailable: null as ((event: { data: Blob }) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as (() => void) | null,
    start() {
      this.state = "recording";
    },
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["synthetic audio"], { type: this.mimeType }) });
      this.onstop?.();
    },
  };
  const options = {
    acquire: async () => stream,
    recorder: () => recorder as unknown as MediaRecorder,
    transcribe: async (_audio: Blob, durationMs: number, signal: AbortSignal) => {
      uploads++;
      expect(durationMs).toBeGreaterThan(0);
      expect(signal.aborted).toBe(false);
      return { ok: true as const, text: "Log creatine" };
    },
    onState: (state: { phase: string; message?: string }) =>
      messages.push(state.message ?? state.phase),
    onTranscript: (text: string) => transcripts.push(text),
    now: () => clock,
    schedule: () => () => {},
  };
  return {
    options,
    recorder,
    stream,
    messages,
    transcripts,
    setClock: (time: number) => {
      clock = time;
    },
    counts: () => ({ stops, uploads }),
  };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("recording never uploads until stop, and submits one editable transcript without persisting", async () => {
  const f = fixture();
  const capture = createVoiceCapture(f.options);
  await capture.start();
  await capture.start();
  expect(f.counts().uploads).toBe(0);
  f.setClock(1200);
  capture.stop();
  capture.stop();
  await flush();
  expect(f.counts()).toEqual({ stops: 1, uploads: 1 });
  expect(f.transcripts).toEqual(["Log creatine"]);
  capture.dispose();
});

test("a late microphone grant after cancel releases tracks without recording or uploading", async () => {
  const f = fixture();
  let grant!: (stream: MediaStream) => void;
  const capture = createVoiceCapture({
    ...f.options,
    acquire: () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  });
  const starting = capture.start();
  capture.cancel("Recording cancelled.");
  grant(f.stream);
  await starting;
  expect(f.counts()).toEqual({ stops: 1, uploads: 0 });
  expect(f.recorder.state).toBe("inactive");
});

test("closing or backgrounding discards a recording and never submits its stop event", async () => {
  const f = fixture();
  const capture = createVoiceCapture(f.options);
  await capture.start();
  f.setClock(1500);
  capture.cancel("Recording interrupted. You can type instead.");
  await flush();
  expect(f.counts()).toEqual({ stops: 1, uploads: 0 });
  expect(f.transcripts).toEqual([]);
});

test("a late transcript after cancellation cannot replace a typed draft", async () => {
  const f = fixture();
  let finish!: (value: { ok: true; text: string }) => void;
  const capture = createVoiceCapture({
    ...f.options,
    transcribe: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  await capture.start();
  f.setClock(1000);
  capture.stop();
  capture.cancel();
  finish({ ok: true, text: "Do not append" });
  await flush();
  expect(f.transcripts).toEqual([]);
});

test("permission denial and a suspended overlong recording leave text as the alternative", async () => {
  const f = fixture();
  const denied = createVoiceCapture({
    ...f.options,
    acquire: async () => {
      throw new DOMException("Denied", "NotAllowedError");
    },
  });
  await denied.start();
  expect(f.messages.at(-1)).toMatch(/microphone|type/i);
  expect(f.counts().uploads).toBe(0);
  const capture = createVoiceCapture(f.options);
  await capture.start();
  f.setClock(61_000);
  capture.stop();
  await flush();
  expect(f.counts().uploads).toBe(0);
  expect(f.transcripts).toEqual([]);
});

test("oversized capture chunks stop the microphone without uploading", async () => {
  const f = fixture();
  const capture = createVoiceCapture(f.options);
  await capture.start();
  f.recorder.ondataavailable?.({ data: new Blob([new Uint8Array(2 * 1024 * 1024 + 1)]) });
  await flush();
  expect(f.counts().stops).toBe(1);
  expect(f.counts().uploads).toBe(0);
});

test("an ignored transcription cannot leave the microphone UI busy indefinitely", async () => {
  const f = fixture();
  let scheduled: (() => void) | undefined;
  const capture = createVoiceCapture({
    ...f.options,
    schedule: (callback) => {
      scheduled = callback;
      return () => {};
    },
    transcribe: () => new Promise(() => {}),
  });
  await capture.start();
  f.setClock(1200);
  capture.stop();
  scheduled?.();
  await flush();
  expect(f.messages.at(-1)).toMatch(/timed out/i);
  expect(f.counts().stops).toBe(1);
});
