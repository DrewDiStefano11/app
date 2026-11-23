import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { transcribeVoice } from "@/lib/ai.functions";
import { jarvisProviderKeys } from "@/lib/jarvis/provider-keys";
import { reserveJarvisVoiceRequest } from "@/lib/jarvis/cloud-usage";
import {
  createBrowserVoiceRecorder,
  createVoiceCapture,
  type VoiceStatus,
} from "@/lib/jarvis/voice-capture";

const providerCooldown = { retryAt: 0 };

type VoiceUsage = {
  provider: string;
  actualModel: string;
  callType: string;
  timestamp: number;
  status?: number;
  errorCategory?: string;
  audioSeconds?: number;
  estimatedPaidTierCostUsd?: number;
};

function audioBase64(audio: Blob, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const cancel = () => {
      reader.abort();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener("abort", cancel, { once: true });
    const finish = () => signal.removeEventListener("abort", cancel);
    reader.onload = () => {
      finish();
      resolve(String(reader.result).split(",")[1] ?? "");
    };
    reader.onerror = () => {
      finish();
      reject(new Error("Recording unreadable"));
    };
    reader.onabort = () => {
      finish();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    reader.readAsDataURL(audio);
  });
}

export function VoiceInput({
  enabled,
  active,
  onTranscript,
  onBusyChange,
  onUsage,
}: {
  enabled: boolean;
  active: boolean;
  onTranscript: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
  onUsage: (usage: VoiceUsage) => void;
}) {
  const [status, setStatus] = useState<VoiceStatus>({ phase: "idle" });
  const controller = useRef<ReturnType<typeof createVoiceCapture> | null>(null);
  const transcribe = useServerFn(transcribeVoice);
  const current = useRef({ enabled, active, onTranscript, onBusyChange, onUsage, transcribe });
  current.current = { enabled, active, onTranscript, onBusyChange, onUsage, transcribe };

  useEffect(() => {
    const capture = createVoiceCapture({
      acquire: () => navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
      recorder: createBrowserVoiceRecorder,
      onState: (next) => {
        setStatus(next);
        current.current.onBusyChange(next.phase !== "idle");
      },
      onTranscript: (text) => current.current.onTranscript(text),
      transcribe: async (audio, durationMs, signal) => {
        if (!current.current.enabled || !current.current.active || signal.aborted)
          return { ok: false, error: "Voice input was cancelled. Your records are unchanged." };
        if (!navigator.onLine)
          return {
            ok: false,
            error: "Voice transcription needs a connection. You can type and log locally.",
          };
        const key = jarvisProviderKeys.read("groq").key;
        if (!key)
          return { ok: false, error: "Add your Groq key in Jarvis settings to transcribe voice." };
        if (Date.now() < providerCooldown.retryAt)
          return {
            ok: false,
            error: "Groq requested a pause. Wait before recording again, or type instead.",
          };
        const encoded = await audioBase64(audio, signal);
        if (signal.aborted) return { ok: false, error: "Voice input cancelled." };
        const limit = reserveJarvisVoiceRequest(window.localStorage);
        if (limit) return { ok: false, error: limit };
        let result;
        try {
          result = await current.current.transcribe({
            signal,
            data: {
              consent: true,
              audioBase64: encoded,
              mimeType: audio.type.split(";")[0] as
                "audio/mp4" | "audio/webm" | "audio/ogg" | "audio/wav",
              durationMs,
              userGroqApiKey: key,
              groqKeyMode: "local",
            },
          });
        } catch {
          current.current.onUsage({
            provider: "groq",
            actualModel: "whisper-large-v3-turbo",
            callType: "voiceTranscription",
            timestamp: Date.now(),
            errorCategory: signal.aborted ? "cancelled" : "network",
          });
          throw new Error("Voice request unavailable");
        }
        if (signal.aborted) return { ok: false, error: "Voice input cancelled." };
        current.current.onUsage({
          provider: "groq",
          actualModel: "whisper-large-v3-turbo",
          callType: "voiceTranscription",
          timestamp: Date.now(),
          ...(result.ok
            ? {
                status: 200,
                audioSeconds: result.audioSeconds,
                estimatedPaidTierCostUsd: result.estimatedPaidTierCostUsd,
              }
            : { status: result.status, errorCategory: result.code }),
        });
        if (!result.ok && result.retryAfterMs)
          providerCooldown.retryAt = Date.now() + Math.min(result.retryAfterMs, 86_400_000);
        return result;
      },
    });
    controller.current = capture;
    const interrupt = () =>
      capture.cancel(
        "Voice input interrupted. Your text and workout are unchanged; you can type instead.",
      );
    const visibility = () => {
      if (document.visibilityState !== "visible") interrupt();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", interrupt);
    window.addEventListener("offline", interrupt);
    return () => {
      capture.dispose();
      current.current.onBusyChange(false);
      controller.current = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", interrupt);
      window.removeEventListener("offline", interrupt);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !active)
      controller.current?.cancel("Voice input stopped. Your text and records are unchanged.");
  }, [enabled, active]);

  function record() {
    if (!enabled || !active) return;
    if (!navigator.onLine) {
      setStatus({
        phase: "idle",
        message: "Voice transcription needs a connection. You can type and log locally.",
      });
      return;
    }
    if (!jarvisProviderKeys.read("groq").key) {
      setStatus({
        phase: "idle",
        message: "Add your Groq key in Jarvis settings to transcribe voice.",
      });
      return;
    }
    if (Date.now() < providerCooldown.retryAt) {
      setStatus({
        phase: "idle",
        message: "Groq requested a pause. Wait before recording again, or type instead.",
      });
      return;
    }
    void controller.current?.start();
  }
  const busy = status.phase !== "idle";
  return (
    <div className="shrink-0 space-y-1 pt-2">
      <div className="flex items-center gap-2">
        {status.phase === "idle" && (
          <button
            type="button"
            aria-label="Record voice"
            disabled={!enabled || !active}
            onClick={record}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm bg-[var(--surface-2)] disabled:opacity-50"
          >
            <Mic size={16} />
            Record voice
          </button>
        )}
        {status.phase === "recording" && (
          <button
            type="button"
            onClick={() => controller.current?.stop()}
            aria-label="Stop and transcribe"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm bg-[var(--surface-2)]"
          >
            <Square size={16} />
            Stop and transcribe
          </button>
        )}
        {busy && (
          <button
            type="button"
            onClick={() => controller.current?.cancel()}
            aria-label="Cancel voice input"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm"
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {enabled
          ? (status.message ??
            "Short recordings go to Groq for transcription. Review the text before sending.")
          : "Enable voice input in Jarvis settings to record. Typing works without it."}
      </p>
    </div>
  );
}
