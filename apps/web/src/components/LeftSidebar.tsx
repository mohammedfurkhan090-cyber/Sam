"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Home, Compass, BookOpen, Bot, BarChart2, Search, ChevronLeft, ChevronRight, Plus, MoreHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";

interface ChatItem { id: string; title: string; timestamp: Date; }
interface LeftSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  todayChats: ChatItem[];
  onNewChat: () => void;
  activeId: string | null;
  onSelectChat: (id: string) => void;
}

function SamSparkle({ size = 30 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          width: size * 3.4,
          height: size * 3.4,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,220,0,0.32) 0%, rgba(255,200,0,0.14) 35%, rgba(212,160,23,0.06) 58%, transparent 72%)",
          pointerEvents: "none",
        }}
      />
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="samSparkleGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="15%" stopColor="#FFFEF0" stopOpacity="1" />
            <stop offset="45%" stopColor="#FFE234" stopOpacity="1" />
            <stop offset="100%" stopColor="#A87000" stopOpacity="1" />
          </radialGradient>
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M12 1.5 L13.05 10.95 L22.5 12 L13.05 13.05 L12 22.5 L10.95 13.05 L1.5 12 L10.95 10.95 Z"
          fill="url(#samSparkleGrad)"
          filter="url(#starGlow)"
        />
        <circle cx="19" cy="5" r="1.1" fill="#FFE234" opacity="0.9" />
        <circle cx="5" cy="19" r="0.85" fill="#FFE234" opacity="0.7" />
        <circle cx="19" cy="19" r="0.65" fill="#FFFDE7" opacity="0.6" />
      </svg>
    </div>
  );
}

const NAV_ITEMS = [
  { icon: Home, label: "Home", active: true },
  { icon: Compass, label: "Explore" },
  { icon: BookOpen, label: "Library" },
  { icon: Bot, label: "Agents" },
  { icon: BarChart2, label: "Insights", badge: "New" },
];

export default function LeftSidebar({ isCollapsed, onToggle, todayChats, onNewChat, activeId, onSelectChat }: LeftSidebarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const headerToggleStyle = {
    color: "#71717A",
    padding: 6,
    borderRadius: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
  };

  const chatsToolbarIconStyle = {
    color: "#71717A",
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
      className="bg-aurora-surface backdrop-blur-xl border border-aurora-border rounded-3xl overflow-hidden"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{ padding: 16 }} className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <SamSparkle size={30} />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                style={{
                  color: "#F8FAFC",
                  fontWeight: 700,
                  fontSize: 15,
                  whiteSpace: "nowrap",
                }}
              >
                Sam
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={headerToggleStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#71717A")}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* New Chat */}
      <div style={{ margin: "0 12px 16px" }}>
        <button
          type="button"
          onClick={onNewChat}
          className={`sam-newchat-btn w-full flex items-center gap-2 transition-all ${isCollapsed ? "justify-center" : ""}`}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(255,255,255,0.02)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
          }}
        >
          <Plus
            className="h-4 w-4 shrink-0"
            style={{ color: "#D4A017", filter: "drop-shadow(0 0 5px rgba(160,118,8,0.9))" }}
          />
          {!isCollapsed && (
            <>
              <span style={{ color: "#F8FAFC", fontSize: 14, fontWeight: 500, flex: 1, textAlign: "left" }}>
                New Chat
              </span>
              <kbd
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 7,
                  background: "rgba(160,118,8,0.20)",
                  color: "#D4A017",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: "0 8px" }} className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = Boolean(item.active);
          return (
            <button
              key={item.label}
              type="button"
              className={`relative flex w-full items-center gap-3 text-left tracking-tight transition-all${isActive ? " sam-nav-active" : ""}`}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                ...(isActive ? {} : { border: "none" }),
                cursor: "pointer",
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={
                  isActive
                    ? {
                        color: "#D4A017",
                        filter: "drop-shadow(0 0 7px rgba(212,160,23,0.75))",
                      }
                    : { color: "#71717A" }
                }
              />
              {!isCollapsed && (
                <>
                  <span
                    style={
                      isActive
                        ? {
                            color: "#F8FAFC",
                            fontWeight: 600,
                            fontSize: 14,
                          }
                        : {
                            color: "#71717A",
                            fontWeight: 500,
                            fontSize: 14,
                          }
                    }
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: "#D4A017",
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

      {/* Chats section */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col">
            <div style={{ padding: "16px 16px 8px" }} className="flex items-center justify-between">
              <span
                style={{
                  color: "#71717A",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                Chats
              </span>
              <div className="flex items-center gap-2">
                {[Search, Plus].map((Icon, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={i === 1 ? onNewChat : undefined}
                    style={chatsToolbarIconStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#71717A")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="sam-scrollbar flex-1 overflow-y-auto px-2" style={{ minHeight: 0 }}>
              {todayChats.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.09em",
                      color: "#71717A",
                      padding: "8px 8px 4px",
                      fontWeight: 600,
                    }}
                  >
                    Today
                  </div>
                  {todayChats.map((item) => {
                    const isChatActive = activeId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectChat(item.id)}
                        style={{
                          width: "100%",
                          padding: "8px 12px 8px 10px",
                          borderRadius: 10,
                          border: "none",
                          borderLeft: isChatActive ? "2px solid rgba(212,160,23,0.6)" : "2px solid transparent",
                          cursor: "pointer",
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          background: isChatActive ? "rgba(255,255,255,0.05)" : "transparent",
                          color: isChatActive ? "#F8FAFC" : "#71717A",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isChatActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                          setHovered(item.id);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isChatActive ? "rgba(255,255,255,0.05)" : "transparent";
                          setHovered(null);
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title.length > 28 ? item.title.slice(0, 28) + "…" : item.title}
                        </span>
                        {hovered === item.id && (
                          <MoreHorizontal
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: isChatActive ? "#71717A" : "#71717A" }}
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

      {/* Upgrade + User footer */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              style={{
                margin: "0 12px 12px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.03)",
                padding: 12,
              }}
            >
              <div className="flex items-start gap-2" style={{ marginBottom: 12 }}>
                <Sparkles
                  className="h-4 w-4 shrink-0"
                  style={{
                    color: "#D4A017",
                    marginTop: 2,
                    filter: "drop-shadow(0 0 6px rgba(212,160,23,0.7))",
                  }}
                />
                <div>
                  <div style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 600 }}>Upgrade to Pro ✦</div>
                  <div style={{ color: "#71717A", fontSize: 11, letterSpacing: "-0.01em" }}>Unlock advanced features.</div>
                </div>
              </div>
              <button
                type="button"
                style={{
                  width: "100%",
                  background: "#D4A017",
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
                style={{ background: "linear-gradient(135deg, #D4A017, #c2410c)", color: "#000" }}
              >
                K
              </div>
              <div>
                <div style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 500 }}>Khan</div>
                <div style={{ color: "#71717A", fontSize: 11, letterSpacing: "-0.01em" }}>Free Plan</div>
              </div>
              <ChevronRight className="ml-auto h-4 w-4" style={{ color: "#71717A" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
