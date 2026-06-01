"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  Share2,
  Star,
  MoreHorizontal,
  Paperclip,
  Gift,
  Globe,
  Zap,
  ChevronDown,
  Lightbulb,
  RefreshCw,
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
  const [inputFocused, setInputFocused] = useState(false);
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
      fetch("http://localhost:4000/api/v1/name-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue.trim() }),
      })
        .then((r) => r.json())
        .then((data) => setConversationTitle(data.title ?? inputValue.slice(0, 40)))
        .catch(() => setConversationTitle(inputValue.slice(0, 40)));
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

  const todayChats = conversationTitle !== "New Chat"
    ? [{ id: "current", title: conversationTitle, timestamp: new Date() }]
    : [];

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--sam-bg)" }}>
      <LeftSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
        todayChats={todayChats}
        onNewChat={handleNewChat}
        activeId={null}
        onSelectChat={() => {}}
      />

      {/* Center column */}
      <div
        className="flex h-full min-w-0 flex-1 flex-col"
        style={{
          borderLeft: "1px solid var(--sam-separator)",
          borderRight: "1px solid var(--sam-separator)",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderBottom: "1px solid var(--sam-separator)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--sam-text-bright)", fontWeight: 600, fontSize: 14 }}>
              {conversationTitle}
            </span>
            <ChevronDown style={{ width: 14, height: 14, color: "var(--sam-text-label)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
              <span style={{
                width: 7, height: 7, borderRadius: 99,
                background: "var(--sam-green)", display: "inline-block",
              }} />
              <span style={{ fontSize: 11, color: "var(--sam-green)" }}>Live</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[Share2, Star, MoreHorizontal].map((Icon, index) => (
              <button
                key={index}
                type="button"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--sam-text-label)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.color = "var(--sam-text-nav)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--sam-text-label)";
                }}
              >
                <Icon style={{ width: 15, height: 15 }} />
              </button>
            ))}
          </div>
        </header>

        {/* Messages */}
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
                        border: "1px solid rgba(160,118,8,0.25)",
                        background: "rgba(212,160,23,0.06)",
                        color: "var(--sam-text-nav)",
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(160,118,8,0.50)";
                        e.currentTarget.style.background = "rgba(212,160,23,0.10)";
                        e.currentTarget.style.color = "var(--sam-text-bright)";
                        e.currentTarget.style.boxShadow = "0 0 14px rgba(160,118,8,0.18)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(160,118,8,0.25)";
                        e.currentTarget.style.background = "rgba(212,160,23,0.06)";
                        e.currentTarget.style.color = "var(--sam-text-nav)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <Lightbulb style={{ width: 12, height: 12, flexShrink: 0, color: "var(--sam-accent)" }} />
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => setSuggestions([])}
                    title="Refresh suggestions"
                    style={{
                      padding: "7px 10px",
                      borderRadius: 99,
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--sam-text-label)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--sam-text-nav)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--sam-text-label)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    <RefreshCw style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              )}

              {(streamingState === "streaming" || streamingState === "routing") && (
                <div className="flex items-start gap-3">
                  <motion.div
                    className="mt-1 shrink-0"
                    style={{
                      width: 32, height: 32, borderRadius: 99,
                      background: "radial-gradient(circle at 34% 30%, #C89000 0%, #8B5800 40%, #3D1E00 75%, #150A00 100%)",
                      boxShadow: "0 0 12px 3px rgba(212,160,23,0.40)",
                    }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    borderRadius: 16, border: "1px solid var(--sam-border)",
                    background: "var(--sam-card)", padding: "12px 18px",
                    fontSize: 13, color: "var(--sam-text-muted)",
                  }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap style={{ width: 14, height: 14, color: "var(--sam-accent)" }} />
                    </motion.div>
                    {streamingState === "routing" ? "Routing to best tool..." : "Thinking..."}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {/* Footer / Prompt box */}
        <footer style={{ padding: "8px 24px 20px", flexShrink: 0 }}>
          <div style={{ maxWidth: 768, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 16,
                background: "linear-gradient(180deg, rgba(20,18,10,0.97) 0%, rgba(14,13,7,1) 100%)",
                border: inputFocused
                  ? "1px solid rgba(160,118,8,0.52)"
                  : "1px solid rgba(255,248,220,0.07)",
                boxShadow: inputFocused
                  ? "0 0 0 3px rgba(160,118,8,0.08), 0 0 22px rgba(160,118,8,0.10)"
                  : "0 4px 24px rgba(0,0,0,0.25)",
                transition: "border-color 0.2s, box-shadow 0.2s",
                overflow: "hidden",
              }}
            >
              {/* Textarea row */}
              <div style={{ padding: "14px 16px 6px" }}>
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Message Sam..."
                  rows={1}
                  disabled={streamingState !== "idle"}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--sam-text-primary)",
                    fontSize: 14,
                    resize: "none",
                    fontFamily: "Inter, sans-serif",
                    lineHeight: 1.6,
                    padding: 0,
                    maxHeight: 120,
                    overflowY: "auto",
                    display: "block",
                  }}
                />
              </div>

              {/* Toolbar row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 10px 10px",
              }}>
                {/* Left icons */}
                <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {[Paperclip, Gift, Globe].map((Icon, index) => (
                    <button
                      key={index}
                      type="button"
                      style={{
                        padding: "7px 8px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "var(--sam-text-label)",
                        display: "flex",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-text-nav)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-label)")}
                    >
                      <Icon style={{ width: 16, height: 16 }} />
                    </button>
                  ))}
                </div>

                {/* Right: mic + send */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Mic — bare icon, no container */}
                  <button
                    type="button"
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--sam-text-label)",
                      display: "flex",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-text-nav)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-label)")}
                  >
                    <Mic style={{ width: 16, height: 16 }} />
                  </button>

                  {/* Send button */}
                  <div className="relative flex items-center justify-center">
                    {/* Outer bloom */}
                    <motion.div
                      className="absolute rounded-[13px] pointer-events-none"
                      style={{
                        width: 62, height: 62,
                        filter: "blur(24px)",
                        mixBlendMode: "screen",
                      }}
                      animate={inputValue.trim() && streamingState === "idle" ? {
                        scale: [1, 1.06, 0.98, 1],
                        opacity: [0.18, 0.28, 0.15, 0.18],
                        background: [
                          "rgba(255,215,0,0.12)",
                          "rgba(255,195,0,0.15)",
                          "rgba(255,225,50,0.10)",
                          "rgba(255,215,0,0.12)",
                        ],
                      } : { scale: 1, opacity: 0 }}
                      transition={{ duration: 4.2, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
                    />
                    {/* Mid bloom */}
                    <motion.div
                      className="absolute rounded-[13px] pointer-events-none"
                      style={{
                        width: 46, height: 46,
                        filter: "blur(13px)",
                        mixBlendMode: "screen",
                      }}
                      animate={inputValue.trim() && streamingState === "idle" ? {
                        scale: [1, 1.03, 1],
                        opacity: [0.15, 0.28, 0.13],
                        background: [
                          "rgba(246,213,74,0.16)",
                          "rgba(255,180,40,0.18)",
                          "rgba(246,213,74,0.16)",
                        ],
                      } : { scale: 1, opacity: 0 }}
                      transition={{ duration: 3.1, repeat: Infinity, ease: [0.35, 0, 0.65, 1], delay: 0.4 }}
                    />

                    {/* Button */}
                    <motion.button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={!inputValue.trim() || streamingState !== "idle"}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="relative overflow-hidden"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 13,
                        border: "1px solid rgba(255,255,255,0.06)",
                        cursor: inputValue.trim() ? "pointer" : "default",
                        background: "linear-gradient(135deg, #E8BC1E 0%, #C8960A 50%, #A87800 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: !inputValue.trim() || streamingState !== "idle" ? 0.14 : 1,
                        boxShadow: inputValue.trim() && streamingState === "idle"
                          ? "0 0 18px rgba(212,160,23,0.72), 0 0 38px rgba(212,160,23,0.32), 0 0 58px rgba(180,130,0,0.14)"
                          : "none",
                        transition: "opacity 0.4s, box-shadow 0.4s",
                      }}
                    >
                      {/* Specular sheen */}
                      <div
                        className="absolute inset-0 rounded-[13px] pointer-events-none"
                        style={{
                          background: "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 35%)",
                        }}
                      />
                      {/* Arrow icon */}
                      <svg
                        width="16" height="16" viewBox="0 0 24 24"
                        fill="none" style={{ position: "relative", transform: "rotate(-45deg) translate(1px,-1px)" }}
                      >
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          stroke="#000000"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ opacity: 0.80 }}
                        />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            <p style={{
              textAlign: "center", fontSize: 10,
              marginTop: 8, color: "var(--sam-text-label)",
            }}>
              Sam can make mistakes. Please verify important information.
            </p>
          </div>
        </footer>
      </div>

      <RightPanel activeTools={activeTools} onToggleTool={handleToggleTool} />
    </div>
  );
}
