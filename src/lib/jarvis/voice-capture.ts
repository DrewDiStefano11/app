export type VoicePhase = "idle" | "requesting" | "recording" | "transcribing";
export type VoiceStatus = { phase: VoicePhase; message?: string };
export type VoiceResponse = { ok: true; text: string } | { ok: false; error: string };
const MAX_BYTES = 2 * 1024 * 1024;
export const VOICE_RECORD_LIMIT_MS = 55_000;

type CaptureOptions = {
  acquire: () => Promise<MediaStream>;
  recorder: (stream: MediaStream) => MediaRecorder;
  transcribe: (audio: Blob, durationMs: number, signal: AbortSignal) => Promise<VoiceResponse>;
  onState: (state: VoiceStatus) => void;
  onTranscript: (text: string) => void;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => () => void;
};

/** In-memory, user-started recording. Fitness records are outside this controller. */
export function createVoiceCapture(options: CaptureOptions) {
  let phase: VoicePhase = "idle",
    generation = 0,
    disposed = false;
  let stream: MediaStream | undefined, recorder: MediaRecorder | undefined;
  let request: AbortController | undefined,
    startedAt = 0,
    stopTimer: (() => void) | undefined;
  let endListeners: (() => void)[] = [];
  const now = options.now ?? (() => performance.now());
  const schedule =
    options.schedule ??
    ((callback: () => void, delay: number) => {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    });
  const publish = (next: VoicePhase, message?: string) => {
    phase = next;
    if (!disposed) options.onState({ phase: next, message });
  };
  const releaseTracks = () => {
    endListeners.forEach((remove) => remove());
    endListeners = [];
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
  };
  const cancel = (message = "Voice input cancelled. Your text and records are unchanged.") => {
    generation++;
    stopTimer?.();
    stopTimer = undefined;
    request?.abort();
    request = undefined;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* Tracks still stop below. */
      }
      recorder = undefined;
    }
    releaseTracks();
    publish("idle", message);
  };
  const stop = () => {
    if (phase !== "recording" || !recorder) return;
    const duration = now() - startedAt;
    if (duration <= 0 || duration > 60_000) {
      cancel("Recording expired or was interrupted. Please record again or type instead.");
      return;
    }
    stopTimer?.();
    stopTimer = undefined;
    publish("transcribing", "Transcribing with Groq. Review the text before sending.");
    try {
      recorder.stop();
    } catch {
      cancel("Recording could not finish. You can type instead.");
    }
    releaseTracks();
  };
  return {
    async start() {
      if (disposed || phase !== "idle") return;
      const token = ++generation;
      publish("requesting", "Waiting for microphone permission…");
      try {
        const acquired = await options.acquire();
        if (disposed || token !== generation) {
          acquired.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = acquired;
        const recording = options.recorder(acquired);
        recorder = recording;
        const chunks: Blob[] = [];
        let bytes = 0,
          submitted = false;
        recording.ondataavailable = (event) => {
          if (token !== generation || !event.data.size) return;
          bytes += event.data.size;
          if (bytes > MAX_BYTES) {
            cancel("Recording is too large. Use a shorter clip or type instead.");
            return;
          }
          chunks.push(event.data);
        };
        recording.onerror = () => {
          if (token === generation) cancel("Microphone recording failed. You can type instead.");
        };
        recording.onstop = () => {
          if (token !== generation || phase !== "transcribing" || submitted) return;
          submitted = true;
          const audio = new Blob(chunks, { type: recording.mimeType });
          if (!audio.size) {
            cancel("No audio was captured. Record again or type instead.");
            return;
          }
          request = new AbortController();
          const signal = request.signal;
          stopTimer = schedule(
            () =>
              cancel(
                "Voice transcription timed out. Your records are unchanged; you can type instead.",
              ),
            20_000,
          );
          const duration = now() - startedAt;
          void options
            .transcribe(audio, duration, signal)
            .then((result) => {
              if (disposed || token !== generation || signal.aborted) return;
              stopTimer?.();
              stopTimer = undefined;
              request = undefined;
              recorder = undefined;
              if (result.ok && result.text.trim()) {
                options.onTranscript(result.text.trim());
                publish("idle", "Transcript added. Review or edit it, then send to Jarvis.");
              } else
                publish(
                  "idle",
                  result.ok ? "No speech was found. You can type instead." : result.error,
                );
            })
            .catch(() => {
              if (token === generation && !disposed)
                cancel("Transcription is unavailable. You can type instead.");
            });
        };
        for (const track of acquired.getTracks()) {
          const onEnded = () => {
            if (token === generation && phase === "recording")
              cancel("Microphone was interrupted. You can type instead.");
          };
          track.addEventListener("ended", onEnded);
          endListeners.push(() => track.removeEventListener("ended", onEnded));
        }
        startedAt = now();
        recording.start(1000);
        publish("recording", "Recording. Stop to transcribe, or cancel to discard.");
        stopTimer = schedule(stop, VOICE_RECORD_LIMIT_MS);
      } catch {
        if (token === generation && !disposed)
          cancel(
            "Microphone permission was denied or recording is unavailable. You can type instead.",
          );
      }
    },
    stop,
    cancel,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
    },
  };
}

export function createBrowserVoiceRecorder(stream: MediaStream) {
  if (typeof MediaRecorder === "undefined") throw new Error("Recording unavailable");
  const formats = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  const mimeType = formats.find((type) => MediaRecorder.isTypeSupported?.(type));
  if (!mimeType) throw new Error("No supported recording format");
  return new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 });
}
