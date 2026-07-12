import { useEffect, useRef, useState } from "react";
import { Apple, Dumbbell, Heart, Home, Mic, Send, Sparkles, TrendingUp, X } from "lucide-react";
import type { SectionId } from "@/lib/types";
import { cn } from "@/lib/utils";

const items: { id: SectionId; label: string; Icon: typeof Dumbbell }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "training", label: "Training", Icon: Dumbbell },
  { id: "nutrition", label: "Fuel/Nutrition", Icon: Apple },
  { id: "recovery", label: "Recovery", Icon: Heart },
  { id: "progress", label: "Stats", Icon: TrendingUp },
];

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function BottomNav({
  active,
  onChange,
}: {
  active: SectionId;
  onChange: (section: SectionId) => void;
  onOpenSettings: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const lastScrollY = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const current = Math.max(0, window.scrollY);
      const delta = current - lastScrollY.current;
      if (!composerOpen) {
        if (current < 72) setCollapsed(false);
        else if (delta > 8) setCollapsed(true);
        else if (delta < -8) setCollapsed(false);
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [composerOpen]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

  const submitPrompt = () => {
    const text = prompt.trim();
    if (!text) return;
    window.dispatchEvent(new CustomEvent("fitcore:jarvis-compose", { detail: { text } }));
    setPrompt("");
    setComposerOpen(false);
    setCollapsed(true);
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setComposerOpen(false);
      window.dispatchEvent(new CustomEvent("fitcore:open-ai"));
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setPrompt((current) => `${current}${current ? " " : ""}${transcript}`.trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const activeItem = items.find((item) => item.id === active) ?? items[0];
  const ActiveIcon = activeItem.Icon;

  return (
    <nav
      className={cn(
        "app-bottom-nav fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none",
        collapsed && !composerOpen && "app-bottom-nav--collapsed",
        composerOpen && "app-bottom-nav--composing",
      )}
      aria-label="Primary navigation"
    >
      <div className="app-bottom-nav__inner pointer-events-auto w-full max-w-[480px] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="nav-shell command-bar">
          {composerOpen ? (
            <div className="command-bar__composer">
              <button
                onClick={() => {
                  setComposerOpen(false);
                  setPrompt("");
                }}
                className="command-bar__icon press"
                aria-label="Close AI composer"
              >
                <X size={18} />
              </button>
              <input
                autoFocus
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitPrompt();
                }}
                placeholder={listening ? "Listening…" : "Ask or log anything…"}
                aria-label="Message Jarvis"
              />
              <button
                onClick={toggleVoice}
                className={cn(
                  "command-bar__icon press",
                  listening && "command-bar__icon--listening",
                )}
                aria-label={listening ? "Stop listening" : "Speak to Jarvis"}
              >
                <Mic size={18} />
              </button>
              <button
                onClick={submitPrompt}
                disabled={!prompt.trim()}
                className="command-bar__send press"
                aria-label="Send to Jarvis"
              >
                <Send size={17} />
              </button>
            </div>
          ) : collapsed ? (
            <div className="command-bar__compact">
              <button
                onClick={() => setCollapsed(false)}
                className="command-bar__active press"
                aria-label={`Expand navigation, current section ${activeItem.label}`}
              >
                <ActiveIcon size={19} />
                <span>{activeItem.label}</span>
              </button>
              <button
                onClick={() => setComposerOpen(true)}
                className="command-bar__ai press"
                aria-label="Open AI composer"
              >
                <Sparkles size={19} />
                <span>Jarvis</span>
              </button>
            </div>
          ) : (
            <div className="command-bar__nav">
              {items.map(({ id, label, Icon }) => {
                const isActive = id === active;
                return (
                  <button
                    key={id}
                    onClick={() => onChange(id)}
                    className={cn(
                      "command-bar__nav-item press",
                      isActive ? "nav-item-active text-white" : "text-white/40 hover:text-white/65",
                    )}
                    aria-label={label}
                  >
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.4 : 1.8}
                      style={isActive ? { color: "var(--section)" } : undefined}
                    />
                    <span style={isActive ? { color: "var(--section)" } : undefined}>{label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setComposerOpen(true)}
                className="command-bar__nav-item command-bar__nav-ai press"
                aria-label="Open AI composer"
              >
                <Sparkles size={19} />
                <span>AI</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
