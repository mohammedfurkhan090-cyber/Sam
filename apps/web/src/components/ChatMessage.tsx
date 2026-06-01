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

function ActionBtn({
  onClick,
  children,
  activeColor,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  activeColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(212,160,23,0.10)" : "rgba(255,255,255,0.04)",
        border: hovered ? "1px solid rgba(212,160,23,0.30)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: hovered ? "0 0 10px rgba(212,160,23,0.14)" : "none",
        transition: "all 0.15s ease",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          padding: "6px 7px",
          borderRadius: 7,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: activeColor ?? (hovered ? "var(--sam-accent)" : "var(--sam-text-nav)"),
          display: "flex",
          transition: "color 0.15s",
        }}
      >
        {children}
      </button>
    </div>
  );
}

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
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    const renderInline = (line: string): React.ReactNode => {
      const parts = line.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
      return parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={j} style={{ color: "var(--sam-text-primary)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={j} style={{ background: "var(--sam-surface)", padding: "1px 6px", borderRadius: 4, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#4ADE80" }}>{part.slice(1, -1)}</code>;
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch)
          return <a key={j} href={linkMatch[2]} target="_blank" rel="noreferrer" style={{ color: "var(--sam-accent)", textDecoration: "underline" }}>{linkMatch[1]}</a>;
        return <span key={j}>{part}</span>;
      });
    };

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { elements.push(<div key={i} style={{ height: 8 }} />); i++; continue; }
      if (line.startsWith("### ")) {
        elements.push(<h3 key={i} style={{ color: "var(--sam-text-primary)", fontSize: 13, fontWeight: 700, margin: "14px 0 6px" }}>{renderInline(line.slice(4))}</h3>);
        i++; continue;
      }
      if (line.startsWith("## ")) {
        elements.push(<h2 key={i} style={{ color: "var(--sam-text-primary)", fontSize: 15, fontWeight: 700, margin: "16px 0 8px", letterSpacing: "-0.01em" }}>{renderInline(line.slice(3))}</h2>);
        i++; continue;
      }
      if (line.startsWith("# ")) {
        elements.push(<h1 key={i} style={{ color: "var(--sam-text-primary)", fontSize: 17, fontWeight: 700, margin: "18px 0 10px" }}>{renderInline(line.slice(2))}</h1>);
        i++; continue;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
          items.push(
            <li key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <span style={{ color: "var(--sam-accent)", flexShrink: 0, marginTop: 2 }}>•</span>
              <span style={{ color: "var(--sam-text-primary)", lineHeight: 1.65 }}>{renderInline(lines[i].slice(2))}</span>
            </li>
          );
          i++;
        }
        elements.push(<ul key={`ul-${i}`} style={{ listStyle: "none", padding: 0, margin: "6px 0" }}>{items}</ul>);
        continue;
      }
      const numberedMatch = line.match(/^(\d+)\. (.*)$/);
      if (numberedMatch) {
        const items: React.ReactNode[] = [];
        let n = 1;
        while (i < lines.length && lines[i].match(/^(\d+)\. (.*)$/)) {
          const m = lines[i].match(/^(\d+)\. (.*)$/)!;
          items.push(
            <li key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <span style={{ color: "var(--sam-accent)", flexShrink: 0, fontWeight: 600, minWidth: 16 }}>{n}.</span>
              <span style={{ color: "var(--sam-text-primary)", lineHeight: 1.65 }}>{renderInline(m[2])}</span>
            </li>
          );
          i++; n++;
        }
        elements.push(<ol key={`ol-${i}`} style={{ listStyle: "none", padding: 0, margin: "6px 0" }}>{items}</ol>);
        continue;
      }
      if (line.startsWith("> ")) {
        elements.push(
          <div key={i} style={{ borderLeft: "3px solid var(--sam-accent)", paddingLeft: 12, margin: "8px 0", color: "var(--sam-text-secondary)", fontStyle: "italic", fontSize: 13 }}>
            {renderInline(line.slice(2))}
          </div>
        );
        i++; continue;
      }
      if (line.startsWith("---") || line.startsWith("***")) {
        elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--sam-border)", margin: "12px 0" }} />);
        i++; continue;
      }
      elements.push(<p key={i} style={{ margin: "3px 0", lineHeight: 1.7, color: "var(--sam-text-primary)" }}>{renderInline(line)}</p>);
      i++;
    }
    return <>{elements}</>;
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
        <div style={{ maxWidth: 400 }}>
          {!imgLoaded && !imgError && (
            <div style={{
              width: 400, height: 300, borderRadius: 16,
              background: "var(--sam-surface)", border: "1px solid var(--sam-border)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <motion.div
                style={{ width: 32, height: 32, borderRadius: 99,
                  background: "radial-gradient(circle at 34% 30%, #C89000 0%, #8B5800 40%, #3D1E00 75%, #150A00 100%)",
                  boxShadow: "0 0 12px 3px rgba(212,160,23,0.35)" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span style={{ color: "var(--sam-text-muted)", fontSize: 12 }}>Generating image...</span>
            </div>
          )}
          {imgError && (
            <div style={{ width: 400, height: 120, borderRadius: 16, background: "var(--sam-surface)", border: "1px solid var(--sam-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "var(--sam-text-muted)", fontSize: 13 }}>Image failed to load</span>
            </div>
          )}
          <img src={output.imageUrl} alt="Generated"
            onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
            style={{ display: imgLoaded ? "block" : "none", maxHeight: 400, borderRadius: 16, objectFit: "cover", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
          />
        </div>
      );
    }

    if (tool === "slides" && output?.slidesUrl) {
      return (
        <div style={{ background: "var(--sam-card)", border: "1px solid var(--sam-border)", borderRadius: 16, padding: 16, maxWidth: 420 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Presentation style={{ width: 18, height: 18, color: "var(--sam-accent)" }} />
            </div>
            <div>
              <div style={{ color: "var(--sam-text-bright)", fontSize: 13, fontWeight: 600 }}>Presentation ready</div>
              <div style={{ color: "var(--sam-text-label)", fontSize: 11, marginTop: 2 }}>PowerPoint file · Opens in Google Slides or Office</div>
            </div>
          </div>
          <a href={output.slidesUrl} download style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px 0", borderRadius: 10, background: "var(--sam-accent)", color: "#000", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Download PPTX <ExternalLink style={{ width: 13, height: 13 }} />
          </a>
        </div>
      );
    }

    if (tool === "unfold" && (output?.summary || output?.keyPoints?.length || output?.blindSpots?.length || output?.questions?.length)) {
      return (
        <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {output?.summary && (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Summary</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--sam-text-primary)]">{output.summary}{streamingCursor}</p>
            </div>
          )}
          {output?.keyPoints?.length && (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Key Points</span>
              </div>
              <ul className="space-y-1 text-sm leading-relaxed text-[var(--sam-text-primary)]">
                {output.keyPoints.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {output?.blindSpots?.length && (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Blind Spots</span>
              </div>
              <ul className="space-y-1 text-sm leading-relaxed text-[var(--sam-text-primary)]">
                {output.blindSpots.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {output?.questions?.length && (
            <div className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                <span className="text-[10px] uppercase tracking-wide text-[var(--sam-text-muted)]">Questions</span>
              </div>
              <ul className="space-y-1 text-sm leading-relaxed text-[var(--sam-text-primary)]">
                {output.questions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (tool === "code" || output?.codeText) {
      const code = output?.codeText ?? output?.chat ?? content;
      return (
        <div className="relative max-w-2xl">
          <div className="flex items-center justify-between rounded-t-xl bg-[#1a1a2e] px-4 py-2">
            <span className="text-xs text-[var(--sam-text-muted)]">Code</span>
            <button type="button" onClick={() => copyText(code)} className="text-[var(--sam-text-muted)] transition-colors hover:text-[var(--sam-text-primary)]">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <pre className="sam-scrollbar max-h-80 overflow-x-auto rounded-b-xl bg-[#0d0d1a] p-4 text-sm leading-relaxed text-green-300">{code}</pre>
        </div>
      );
    }

    return (
      <div style={{
        background: "var(--sam-card)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderLeft: "2px solid rgba(212,160,23,0.22)",
        borderRadius: "0 16px 16px 4px",
        padding: "14px 18px 14px 16px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.03)",
        maxWidth: 640,
      }}>
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
          <div style={{
            maxWidth: 480,
            padding: "12px 16px",
            borderRadius: "16px 16px 4px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 2px 14px rgba(0,0,0,0.28)",
          }}>
            <p style={{ color: "var(--sam-text-primary)", fontSize: 14, margin: 0 }}>{content}</p>
            <p style={{ fontSize: 10, color: "var(--sam-text-label)", marginTop: 6, textAlign: "right" }}>
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-start gap-3">
          {/* Avatar orb */}
          <div style={{
            position: "relative",
            width: 32,
            height: 32,
            borderRadius: "50%",
            flexShrink: 0,
            marginTop: 4,
            overflow: "hidden",
            background: "radial-gradient(circle at 34% 30%, #C89000 0%, #8B5800 40%, #3D1E00 75%, #150A00 100%)",
            boxShadow: "0 0 12px 3px rgba(212,160,23,0.22)",
          }}>
            {/* Specular on avatar */}
            <div style={{
              position: "absolute", width: 14, height: 10,
              top: "12%", left: "16%", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.70) 0%, transparent 70%)",
              filter: "blur(1px)",
            }} />
            {/* Left eye */}
            <div style={{
              position: "absolute", left: 9, top: 13,
              width: 4, height: 4, borderRadius: "50%",
              background: "rgba(255,255,255,0.75)",
              boxShadow: "0 0 3px rgba(255,255,255,0.80)",
            }} />
            {/* Right eye */}
            <div style={{
              position: "absolute", left: 19, top: 13,
              width: 4, height: 4, borderRadius: "50%",
              background: "rgba(255,255,255,0.75)",
              boxShadow: "0 0 3px rgba(255,255,255,0.80)",
            }} />
          </div>

          <div className="min-w-0 flex-1">
            {renderAssistantContent()}
            <div className="mt-2 flex items-center gap-1">
              <ActionBtn><ThumbsUp style={{ width: 14, height: 14 }} /></ActionBtn>
              <ActionBtn><ThumbsDown style={{ width: 14, height: 14 }} /></ActionBtn>
              <ActionBtn onClick={handleSpeak} activeColor={speaking ? "var(--sam-accent)" : undefined}>
                {speaking && !paused ? <Pause style={{ width: 14, height: 14 }} />
                  : paused ? <Play style={{ width: 14, height: 14 }} />
                  : <Volume2 style={{ width: 14, height: 14 }} />}
              </ActionBtn>
              <ActionBtn><MoreHorizontal style={{ width: 14, height: 14 }} /></ActionBtn>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
