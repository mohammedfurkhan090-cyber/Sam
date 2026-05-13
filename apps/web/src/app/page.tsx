"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Mic,
  Share2,
  Star,
  MoreHorizontal,
  Paperclip,
  Gift,
  Globe,
  Zap,
} from "lucide-react";
import LeftSidebar from "@/components/LeftSidebar";
import RightPanel from "@/components/RightPanel";
import OrbHero from "@/components/OrbHero";
import ChatMessage from "@/components/ChatMessage";
import { useSamChat } from "@/hooks/useSamChat";

export default function SamPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTools, setActiveTools] = useState<Record<string, boolean>>({
    search: true,
    rag: true,
    image: true,
    code: false,
    unfold: true,
    slides: true,
    speak: false,
    agent: true,
  });
  const [inputValue, setInputValue] = useState("");
  const [conversationTitle, setConversationTitle] = useState("New Chat");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wasStreamingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    submit,
    messages,
    output: liveOutput,
    streamingState,
    currentTool,
    clearMessages
  } = useSamChat();

  const handleToggleTool = (id: string) =>
    setActiveTools((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleNewChat = () => {
    clearMessages();
    setConversationTitle("New Chat");
    setSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || streamingState !== "idle") return;

    if (conversationTitle === "New Chat") {
      setConversationTitle(inputValue.slice(0, 40));
    }
    const messageToSubmit = inputValue.trim();
    setInputValue("");
    await submit(messageToSubmit, activeTools);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  useEffect(() => {
    if (streamingState !== "idle") {
      wasStreamingRef.current = true;
      setSuggestions([]);
      return;
    }
    if (!wasStreamingRef.current) return;
    wasStreamingRef.current = false;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    const text = lastMsg.output?.chat || lastMsg.output?.summary || lastMsg.content;
    if (!text?.trim()) return;

    fetch("http://localhost:4000/api/v1/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    })
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, [streamingState, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingState]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const todayChats = messages
    .filter((msg) => msg.role === "user")
    .map((msg) => ({ id: msg.id, title: msg.content.slice(0, 35), timestamp: msg.timestamp }));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--sam-bg)]">
      <LeftSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
        todayChats={todayChats}
        onNewChat={handleNewChat}
        activeId={null}
        onSelectChat={() => {}}
      />

      <div
        className="flex h-full min-w-0 flex-1 flex-col"
        style={{ borderLeft: "1px solid var(--sam-border)", borderRight: "1px solid var(--sam-border)" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderBottom: "1px solid var(--sam-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--sam-text-primary)", fontWeight: 600, fontSize: 14 }}>
              {conversationTitle}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 99,
                  background: "var(--sam-green)",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--sam-green)" }}>Live</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[Share2, Star, MoreHorizontal].map((Icon, index) => (
              <button
                key={index}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--sam-text-muted)",
                  display: "flex",
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </header>

        <main className="sam-scrollbar flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && streamingState === "idle" ? (
            <OrbHero />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} {...msg} />
              ))}

              {suggestions.length > 0 && streamingState === "idle" && messages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginLeft: 44, marginTop: 4 }}>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSuggestions([]);
                        void submit(s, activeTools);
                      }}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 99,
                        border: "1px solid var(--sam-border)",
                        background: "var(--sam-surface)",
                        color: "var(--sam-text-secondary)",
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(212,160,23,0.4)";
                        e.currentTarget.style.color = "var(--sam-text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--sam-border)";
                        e.currentTarget.style.color = "var(--sam-text-secondary)";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {(streamingState === "streaming" || streamingState === "routing") && (
                <div className="flex items-start gap-3">
                    <motion.div
                      className="mt-1 h-8 w-8 shrink-0 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle at 35% 30%, #FEF9C3, #D4A017 40%, #92400E 75%, #1C1007)",
                        boxShadow: "0 0 12px 3px rgba(212,160,23,0.4)",
                      }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <div className="flex items-center gap-2 rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] px-5 py-4 text-sm text-[var(--sam-text-muted)]">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="h-3.5 w-3.5 text-[var(--sam-accent)]" />
                      </motion.div>
                      {streamingState === "routing" ? "Routing to best tool..." : "Thinking..."}
                    </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </main>


        <footer style={{ padding: "8px 24px 24px", flexShrink: 0 }}>
          <div style={{ maxWidth: 768, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 16,
                background: "var(--sam-prompt-bg)",
                border: "1px solid var(--sam-border)",
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 2, paddingBottom: 2 }}>
                {[Paperclip, Gift, Globe].map((Icon, index) => (
                  <button
                    key={index}
                    type="button"
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--sam-text-muted)",
                      display: "flex",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Sam..."
                rows={1}
                disabled={streamingState !== "idle"}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--sam-text-primary)",
                  fontSize: 14,
                  resize: "none",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.6,
                  padding: "6px 0",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 2, paddingBottom: 2 }}>
                <button
                  type="button"
                  style={{
                    padding: 8,
                    borderRadius: 99,
                    background: "var(--sam-surface)",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--sam-text-muted)",
                    display: "flex",
                  }}
                >
                  <Mic className="h-4 w-4" />
                </button>
                {/* Send button — Aurora final grade */}
                <div className="relative flex items-center justify-center">
                  {/* Environmental spill — warms nearby surfaces */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(212,160,23,0.05) 0%, rgba(180,120,0,0.02) 40%, transparent 70%)",
                      opacity: inputValue.trim() && streamingState === "idle" ? 1 : 0,
                      transition: "opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />

                  {/* Outer bloom — slow breath, chromatic drift */}
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 62,
                      height: 62,
                      filter: "blur(24px)",
                      mixBlendMode: "screen",
                      opacity: inputValue.trim() && streamingState === "idle" ? 1 : 0,
                      transition: "opacity 0.6s",
                    }}
                    animate={
                      inputValue.trim() && streamingState === "idle"
                        ? {
                            scale: [1, 1.06, 0.98, 1],
                            opacity: [0.7, 1, 0.8, 0.75],
                            background: [
                              "rgba(255, 215, 0, 0.10)",
                              "rgba(255, 195, 0, 0.12)",
                              "rgba(255, 225, 50, 0.09)",
                              "rgba(255, 215, 0, 0.10)",
                            ],
                          }
                        : { scale: 1, opacity: 0 }
                    }
                    transition={{
                      duration: 4.2,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1],
                    }}
                  />

                  {/* Mid bloom — amber shift, offset phase */}
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 46,
                      height: 46,
                      filter: "blur(13px)",
                      mixBlendMode: "screen",
                      opacity: inputValue.trim() && streamingState === "idle" ? 1 : 0,
                      transition: "opacity 0.45s",
                    }}
                    animate={
                      inputValue.trim() && streamingState === "idle"
                        ? {
                            scale: [1, 1.03, 1],
                            opacity: [0.65, 0.95, 0.7],
                            background: [
                              "rgba(246, 213, 74, 0.14)",
                              "rgba(255, 180, 40, 0.16)",
                              "rgba(246, 213, 74, 0.14)",
                            ],
                          }
                        : { scale: 1, opacity: 0 }
                    }
                    transition={{
                      duration: 3.1,
                      repeat: Infinity,
                      ease: [0.35, 0, 0.65, 1],
                      delay: 0.4,
                    }}
                  />

                  {/* Inner hotspot — tight, near-white core */}
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 32,
                      height: 32,
                      filter: "blur(5px)",
                      mixBlendMode: "plus-lighter",
                      opacity: inputValue.trim() && streamingState === "idle" ? 1 : 0,
                      transition: "opacity 0.3s",
                    }}
                    animate={
                      inputValue.trim() && streamingState === "idle"
                        ? {
                            opacity: [0.6, 0.9, 0.65],
                            background: [
                              "rgba(255, 249, 200, 0.11)",
                              "rgba(255, 255, 240, 0.14)",
                              "rgba(255, 249, 200, 0.11)",
                            ],
                          }
                        : { opacity: 0 }
                    }
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: [0.45, 0, 0.55, 1],
                      delay: 0.7,
                    }}
                  />

                  {/* Button surface */}
                  <motion.button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!inputValue.trim() || streamingState !== "idle"}
                    whileHover={{ scale: 1.035 }}
                    whileTap={{ scale: 0.965 }}
                    className="relative overflow-hidden"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 99,
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      cursor: "pointer",
                      background:
                        "radial-gradient(circle at 32% 26%, #FFF8D0 0%, #F6D54A 18%, #D4A017 58%, #8C5E00 92%)",
                      color: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: !inputValue.trim() || streamingState !== "idle" ? 0.12 : 1,
                      boxShadow: inputValue.trim() && streamingState === "idle"
                        ? "0 0 40px rgba(255, 215, 0, 0.18), 0 0 80px rgba(180, 120, 0, 0.06), inset 0 0.5px 0.5px rgba(255,255,255,0.1)"
                        : "none",
                      transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s",
                    }}
                  >
                    {/* Edge specular — glass rim */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: "linear-gradient(168deg, rgba(255,255,255,0.14) 0%, transparent 32%)",
                      }}
                    />

                    {/* Micro-shimmer sweep — imperceptible alive surface */}
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
                        mixBlendMode: "overlay",
                      }}
                      animate={
                        inputValue.trim() && streamingState === "idle"
                          ? { x: [-20, 20, -20] }
                          : { x: 0 }
                      }
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Noise texture overlay — breaks mathematical perfection */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                        opacity: 0.03,
                        mixBlendMode: "overlay",
                      }}
                    />

                    {/* Icon — Aurora paper-rocket, elite final */}
                    <motion.svg
                      className="relative"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ transform: "translate(0.2px, -0.2px) rotate(-6deg)" }}
                      animate={
                        inputValue.trim() && streamingState === "idle"
                          ? { opacity: [0.88, 0.94, 0.88] }
                          : { opacity: 0.9 }
                      }
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {/* Body — lifted rear, trimmed tail mass, continuous curvature */}
                      <path
                        d="M6.0 12.4Q5.6 12.1 5.9 11.8Q9.5 9.6 18.2 5.4Q18.8 5.1 19.2 5.3Q19.5 5.5 19.3 6.0Q16.8 11.8 13.6 19.2Q13.4 19.7 12.9 19.5Q12.6 19.4 12.4 19.0L11.1 14.0Q11.0 13.6 10.6 13.5L6.0 12.4Z"
                        fill="rgba(18, 10, 0, 0.86)"
                        style={{ filter: "drop-shadow(0 0 0.5px rgba(255,215,0,0.06))" }}
                      />
                      {/* Fold — intrinsic contour, not overlay */}
                      <path
                        d="M11.0 13.7Q14.2 10.4 18.6 5.8"
                        stroke="rgba(60, 40, 8, 0.38)"
                        strokeWidth="1.0"
                        strokeLinecap="round"
                        style={{ mixBlendMode: "multiply" }}
                      />
                    </motion.svg>
                  </motion.button>
                </div>
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: 10, marginTop: 8, color: "var(--sam-text-muted)" }}>
              Sam can make mistakes. Please verify important information.
            </p>
          </div>
        </footer>
      </div>

      <RightPanel activeTools={activeTools} onToggleTool={handleToggleTool} />
    </div>
  );
}
