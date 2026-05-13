"use client";

import { motion } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Copy,
  Check,
  Sparkles,
  Brain,
  Search,
  Zap,
  Presentation,
  ExternalLink,
  Volume2,
  Pause,
  Play,
} from "lucide-react";
import { useState, useRef } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  tool: string | null;
  timestamp: Date;
  isStreaming?: boolean;
  output?: {
    chat?: string;
    summary?: string;
    keyPoints?: string[];
    blindSpots?: string[];
    questions?: string[];
    imageUrl?: string;
    slidesUrl?: string;
    codeText?: string;
  };
}

export default function ChatMessage({
  role,
  content,
  tool,
  timestamp,
  isStreaming = false,
  output,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    const text = output?.chat || output?.summary || content || "";
    if (!text.trim()) return;

    if (speaking && audioRef.current && !paused) {
      audioRef.current.pause();
      setPaused(true);
      return;
    }

    if (paused && audioRef.current) {
      audioRef.current.play();
      setPaused(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setSpeaking(true);
    setPaused(false);
    try {
      const res = await fetch("http://localhost:4000/api/v1/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1000) }),
      });
      if (!res.ok) throw new Error("Speak failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); setPaused(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); setPaused(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      setSpeaking(false);
      setPaused(false);
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (text: string): React.ReactNode => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((part, j) =>
        j % 2 === 1
          ? <strong key={j} style={{ color: "var(--sam-text-primary)", fontWeight: 600 }}>{part}</strong>
          : <span key={j}>{part}</span>
      );
      return <p key={i} style={{ margin: "4px 0", lineHeight: 1.7 }}>{rendered}</p>;
    });
  };

  const streamingCursor = isStreaming ? (
    <motion.span
      className="inline-block w-0.5 h-3.5 bg-[var(--sam-accent)] ml-0.5 align-middle"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  ) : null;

  const renderAssistantContent = () => {
    if (output?.imageUrl) {
      return (
        <div className="relative" style={{ maxWidth: 400 }}>
          {!imgLoaded && !imgError && (
            <div style={{
              width: 400, height: 300, borderRadius: 16,
              background: "var(--sam-surface)",
              border: "1px solid var(--sam-border)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12
            }}>
              <motion.div
                style={{ width: 32, height: 32, borderRadius: 99,
                  background: "radial-gradient(circle at 35% 30%, #FEF9C3, #D4A017 40%, #92400E 75%, #1C1007)",
                  boxShadow: "0 0 12px 3px rgba(212,160,23,0.35)" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span style={{ color: "var(--sam-text-muted)", fontSize: 12 }}>Generating image...</span>
            </div>
          )}
          {imgError && (
            <div style={{
              width: 400, height: 120, borderRadius: 16,
              background: "var(--sam-surface)",
              border: "1px solid var(--sam-border)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ color: "var(--sam-text-muted)", fontSize: 13 }}>Image failed to load</span>
            </div>
          )}
          <img
            src={output.imageUrl}
            alt="Generated"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              display: imgLoaded ? "block" : "none",
              maxHeight: 400, borderRadius: 16,
              objectFit: "cover",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
            }}
          />
        </div>
      );
    }

    if (tool === "slides" && output?.slidesUrl) {
      return (
        <div style={{
          background: "var(--sam-card)",
          border: "1px solid var(--sam-border)",
          borderRadius: 16, padding: 16, maxWidth: 420
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(212,160,23,0.1)",
              border: "1px solid rgba(212,160,23,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Presentation style={{ width: 18, height: 18, color: "var(--sam-accent)" }} />
            </div>
            <div>
              <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>Presentation ready</div>
              <div style={{ color: "var(--sam-text-muted)", fontSize: 11, marginTop: 2 }}>PowerPoint file · Opens in Google Slides or Office</div>
            </div>
          </div>
          <a
            href={output.slidesUrl}
            download
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", padding: "9px 0", borderRadius: 10,
              background: "var(--sam-accent)", color: "#000",
              fontSize: 13, fontWeight: 600, textDecoration: "none"
            }}
          >
            Download PPTX
            <ExternalLink style={{ width: 13, height: 13 }} />
          </a>
        </div>
      );
    }

    if (
      tool === "unfold" &&
      (output?.summary || output?.keyPoints?.length || output?.blindSpots?.length || output?.questions?.length)
    ) {
      return (
        <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {output?.summary ? (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Summary</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--sam-text-primary)]">
                {output.summary}
                {streamingCursor}
              </p>
            </div>
          ) : null}

          {output?.keyPoints?.length ? (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Key Points</span>
              </div>
              <ul className="space-y-1 text-sm leading-relaxed text-[var(--sam-text-primary)]">
                {output.keyPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {output?.blindSpots?.length ? (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Blind Spots</span>
              </div>
              <ul className="space-y-1 text-sm leading-relaxed text-[var(--sam-text-primary)]">
                {output.blindSpots.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {output?.questions?.length ? (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Questions</span>
              </div>
              <ul className="space-y-1 text-sm leading-relaxed text-[var(--sam-text-primary)]">
                {output.questions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );
    }

    if (tool === "code" || output?.codeText) {
      const code = output?.codeText ?? output?.chat ?? content;

      return (
        <div className="relative max-w-2xl">
          <div className="flex items-center justify-between rounded-t-xl bg-[#1a1a2e] px-4 py-2">
            <span className="text-xs text-[var(--sam-text-muted)]">Code</span>
            <button
              type="button"
              onClick={() => copyText(code)}
              className="text-[var(--sam-text-muted)] transition-colors hover:text-[var(--sam-text-primary)]"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <pre className="sam-scrollbar max-h-80 overflow-x-auto rounded-b-xl bg-[#0d0d1a] p-4 text-sm leading-relaxed text-green-300">
            {code}
          </pre>
        </div>
      );
    }

    return (
      <div
        style={{
          background: "var(--sam-card)",
          border: "1px solid var(--sam-border)",
          borderRadius: "16px 16px 16px 4px",
          padding: "14px 18px",
          maxWidth: 640,
        }}
      >
        <div style={{ color: "var(--sam-text-primary)", fontSize: 14 }}>
          {renderMarkdown(output?.chat || output?.summary || content || "")}
          {isStreaming ? streamingCursor : null}
        </div>
      </div>
    );
  };

  if (role === "assistant" && !output && !content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {role === "user" ? (
        <div className="mb-2 flex justify-end">
          <div
            style={{
              maxWidth: 480,
              padding: "12px 16px",
              borderRadius: "16px 16px 4px 16px",
              background: "var(--sam-card)",
              border: "1px solid var(--sam-border)",
            }}
          >
            <p style={{ color: "var(--sam-text-primary)", fontSize: 14, margin: 0 }}>{content}</p>
            <p style={{ fontSize: 10, color: "var(--sam-text-muted)", marginTop: 6, textAlign: "right" }}>
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-start gap-3">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 99,
              flexShrink: 0,
              marginTop: 4,
              background:
                "radial-gradient(circle at 35% 30%, #FEF9C3, #D4A017 40%, #92400E 75%, #1C1007)",
              boxShadow: "0 0 12px 3px rgba(212,160,23,0.35)",
            }}
          />
          <div className="min-w-0 flex-1">
            {renderAssistantContent()}
            <div className="mt-2 flex items-center gap-1">
              <button type="button"
                className="rounded-lg p-1.5 text-[var(--sam-text-muted)] transition-colors hover:bg-[var(--sam-surface)] hover:text-[var(--sam-text-secondary)]">
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button type="button"
                className="rounded-lg p-1.5 text-[var(--sam-text-muted)] transition-colors hover:bg-[var(--sam-surface)] hover:text-[var(--sam-text-secondary)]">
                <ThumbsDown className="h-4 w-4" />
              </button>
              <button type="button"
                onClick={handleSpeak}
                title={speaking && !paused ? "Pause" : paused ? "Resume" : "Listen"}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--sam-surface)]"
                style={{ color: speaking ? "var(--sam-accent)" : "var(--sam-text-muted)" }}>
                {speaking && !paused
                  ? <Pause className="h-4 w-4" />
                  : paused
                  ? <Play className="h-4 w-4" />
                  : <Volume2 className="h-4 w-4" />}
              </button>
              <button type="button"
                className="rounded-lg p-1.5 text-[var(--sam-text-muted)] transition-colors hover:bg-[var(--sam-surface)] hover:text-[var(--sam-text-secondary)]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
