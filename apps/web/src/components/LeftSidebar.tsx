"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Home,
  Compass,
  BookOpen,
  Bot,
  BarChart2,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";

function SamLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sgGoldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF9B0" />
          <stop offset="35%" stopColor="#FFE94D" />
          <stop offset="70%" stopColor="#FFD500" />
          <stop offset="100%" stopColor="#A86B00" />
        </radialGradient>
        <radialGradient id="sgOuterAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE866" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#FFD500" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFD500" stopOpacity="0" />
        </radialGradient>
        <filter id="sgBlurGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="18" result="blur" />
        </filter>
        <filter id="sgBloom" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="110" cy="110" r="70" fill="url(#sgOuterAura)" filter="url(#sgBlurGlow)" />
      <circle cx="110" cy="110" r="42" fill="url(#sgGoldGlow)" filter="url(#sgBloom)" />
      <path
        d="M110 78 L116 102 L140 110 L116 118 L110 142 L104 118 L80 110 L104 102 Z"
        fill="#FFFDE7"
        filter="url(#sgBloom)"
      />
      <circle cx="145" cy="88" r="3" fill="#FFF7B2" />
      <circle cx="74" cy="128" r="2.5" fill="#FFE45E" />
      <circle cx="132" cy="146" r="2" fill="#FFF7B2" />
    </svg>
  );
}

interface ChatItem {
  id: string;
  title: string;
  timestamp: Date;
}

interface LeftSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  todayChats: ChatItem[];
  onNewChat: () => void;
  activeId: string | null;
  onSelectChat: (id: string) => void;
}

function truncateTitle(title: string) {
  return title.length > 30 ? `${title.slice(0, 30)}...` : title;
}

export default function LeftSidebar({
  isCollapsed,
  onToggle,
  todayChats,
  onNewChat,
  activeId,
  onSelectChat,
}: LeftSidebarProps) {
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);

  const NAV_ITEMS = [
    { icon: Home, label: "Home", active: true },
    { icon: Compass, label: "Explore" },
    { icon: BookOpen, label: "Library" },
    { icon: Bot, label: "Agents" },
    { icon: BarChart2, label: "Insights", badge: "New" },
  ];

  const iconButtonStyle = {
    color: "var(--sam-text-muted)",
    padding: 6,
    borderRadius: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
      style={{
        background: "var(--sam-sidebar)",
        borderRight: "1px solid var(--sam-border)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div style={{ padding: 16 }} className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <SamLogo size={20} />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                style={{
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: 15,
                  whiteSpace: "nowrap",
                }}
              >
                Sam
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button onClick={onToggle} style={iconButtonStyle}>
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div style={{ margin: "0 12px 16px" }}>
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2 transition-all ${isCollapsed ? "justify-center" : ""}`}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(212,160,23,0.35)",
            background: "rgba(212,160,23,0.06)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,160,23,0.12)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(212,160,23,0.06)")}
        >
          <Plus className="h-4 w-4 shrink-0" style={{ color: "var(--sam-accent)" }} />
          {!isCollapsed && (
            <>
              <span style={{ color: "#FFF", fontSize: 13, fontWeight: 500, flex: 1, textAlign: "left" }}>
                New Chat
              </span>
              <kbd
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 5,
                  background: "var(--sam-surface)",
                  color: "var(--sam-text-muted)",
                  fontFamily: "monospace",
                }}
              >
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      <nav style={{ padding: "0 8px" }} className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = Boolean(item.active);

          return (
            <button
              key={item.label}
              className="relative flex w-full items-center gap-3 text-left transition-all"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: isActive ? "rgba(212,160,23,0.1)" : "transparent",
                color: isActive ? "var(--sam-accent)" : "var(--sam-text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "var(--sam-surface)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 6,
                    bottom: 6,
                    width: 2,
                    borderRadius: 99,
                    background: "var(--sam-accent)",
                  }}
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <span style={{ fontSize: 13 }}>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: "var(--sam-accent)",
                        color: "#000",
                        fontWeight: 700,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col">
            <div style={{ padding: "16px 16px 8px" }} className="flex items-center justify-between">
              <span
                style={{
                  color: "var(--sam-text-muted)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Chats
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  style={iconButtonStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-muted)")}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onNewChat}
                  style={iconButtonStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-muted)")}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="sam-scrollbar flex-1 overflow-y-auto px-2" style={{ minHeight: 0 }}>
              {todayChats.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "var(--sam-text-muted)",
                      padding: "0 8px 4px",
                    }}
                  >
                    Today
                  </div>
                  {todayChats.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <button
                        key={item.id}
                        className="group relative w-full text-left transition-all"
                        style={{
                          padding: "7px 12px",
                          borderRadius: 10,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 13,
                          display: "block",
                          width: "100%",
                          background: isActive ? "var(--sam-surface)" : "transparent",
                          color: "var(--sam-text-secondary)",
                        }}
                        onClick={() => onSelectChat(item.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--sam-surface)";
                          setHoveredChat(item.id);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isActive ? "var(--sam-surface)" : "transparent";
                          setHoveredChat(null);
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {truncateTitle(item.title)}
                        </span>
                        {hoveredChat === item.id && (
                          <MoreHorizontal
                            className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                            style={{ color: "var(--sam-text-muted)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              style={{ margin: "0 12px 12px", borderRadius: 12, background: "var(--sam-surface)", border: "1px solid var(--sam-border)", padding: 12 }}
            >
              <div className="flex items-start gap-2" style={{ marginBottom: 12 }}>
                <Sparkles className="h-4 w-4 shrink-0" style={{ color: "var(--sam-accent)", marginTop: 2 }} />
                <div>
                  <div style={{ color: "#FFF", fontSize: 13, fontWeight: 500 }}>Upgrade to Pro ✨</div>
                  <div style={{ color: "var(--sam-text-muted)", fontSize: 11 }}>Unlock advanced features.</div>
                </div>
              </div>
              <button
                type="button"
                style={{
                  width: "100%",
                  background: "var(--sam-accent)",
                  color: "#000",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Upgrade Now
              </button>
            </div>

            <div className="flex items-center gap-3 px-4 pb-4">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "linear-gradient(135deg, var(--sam-accent), #c2410c)", color: "#000" }}
              >
                K
              </div>
              <div>
                <div style={{ color: "#FFF", fontSize: 13, fontWeight: 500 }}>Khan</div>
                <div style={{ color: "var(--sam-text-muted)", fontSize: 11 }}>Free Plan</div>
              </div>
              <ChevronRight className="ml-auto h-4 w-4" style={{ color: "var(--sam-text-muted)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function ChatGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--sam-text-muted)",
          padding: "0 8px 4px",
        }}
      >
        {label}
      </div>
      {items.map((title) => (
        <button
          key={title}
          className="w-full text-left transition-all relative group"
          style={{
            padding: "7px 12px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            display: "block",
            width: "100%",
            background: "transparent",
            color: "var(--sam-text-secondary)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sam-surface)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
        </button>
      ))}
    </div>
  );
}

