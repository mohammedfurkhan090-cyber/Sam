"use client";

import { useState } from "react";
import {
  Search, Database, ImageIcon, Code2, Brain,
  Presentation, Volume2, Zap, ChevronDown,
  Moon, Sun, Columns2, LayoutGrid, RefreshCw,
} from "lucide-react";

interface RightPanelProps {
  activeTools: Record<string, boolean>;
  onToggleTool: (id: string) => void;
}

const TOOLS = [
  { id: "search",  icon: Search,       name: "Web Search",      description: "Get real-time information",    iconBg: "rgba(212,160,23,0.15)",  iconColor: "#D4A017" },
  { id: "rag",     icon: Database,     name: "File Analyzer",   description: "Analyze PDFs, Docs, CSVs",     iconBg: "rgba(234,120,30,0.15)",  iconColor: "#EA781E" },
  { id: "image",   icon: ImageIcon,    name: "Image Generator", description: "Create stunning visuals",      iconBg: "rgba(220,60,60,0.15)",   iconColor: "#E05555" },
  { id: "code",    icon: Code2,        name: "Code Interpreter",description: "Run code & analyze data",      iconBg: "rgba(74,222,128,0.12)",  iconColor: "#4ADE80" },
  { id: "unfold",  icon: Brain,        name: "Deep Analysis",   description: "Think through complex ideas",  iconBg: "rgba(147,112,219,0.15)", iconColor: "#9370DB" },
  { id: "slides",  icon: Presentation, name: "Slides",          description: "Create presentations",         iconBg: "rgba(56,189,248,0.12)",  iconColor: "#38BDF8" },
  { id: "speak",   icon: Volume2,      name: "Voice Output",    description: "Text to speech",               iconBg: "rgba(251,191,36,0.12)",  iconColor: "#FBB724" },
  { id: "agent",   icon: Zap,          name: "Agent Mode",      description: "Multi-step task execution",    iconBg: "rgba(212,160,23,0.15)",  iconColor: "#D4A017" },
];

const SHORTCUTS = [
  { label: "Summarize this conversation", keys: "⌘1", icon: LayoutGrid },
  { label: "Extract key points",          keys: "⌘2", icon: RefreshCw   },
  { label: "Translate to English",        keys: "⌘3", icon: Search      },
  { label: "Make it more concise",        keys: "⌘4", icon: Brain       },
];

const toolIconBoxStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(255,255,255,0.07)",
} as const;

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        width: 40,
        borderRadius: 99,
        flexShrink: 0,
        border: "none",
        cursor: "pointer",
        transition: "background 0.2s",
        background: active ? "#D4A017" : "#1E1E18",
        padding: 0,
        boxShadow: active ? "0 0 8px rgba(212,160,23,0.35)" : "none",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          borderRadius: 99,
          background: active ? "#0C0C00" : "#3A3A30",
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
          transition: "transform 0.2s",
          transform: active ? "translateX(21px)" : "translateX(3px)",
          flexShrink: 0,
        }}
      />
    </button>
  );
}

export default function RightPanel({ activeTools, onToggleTool }: RightPanelProps) {
  const [showCustomize, setShowCustomize] = useState(false);

  const iconBtnStyle = {
    color: "#71717A",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 8,
    display: "flex" as const,
    transition: "color 0.15s",
  };

  return (
    <aside
      className="bg-aurora-surface backdrop-blur-xl border border-aurora-border rounded-3xl overflow-hidden"
      style={{
        width: 300,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Customize overlay */}
      {showCustomize && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.03)", zIndex: 10, padding: 16, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: "#F8FAFC", fontWeight: 700, fontSize: 15 }}>Customize Tools</div>
            <button onClick={() => setShowCustomize(false)} style={{ ...iconBtnStyle, fontSize: 13, color: "#71717A" }}>✕</button>
          </div>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ ...toolIconBoxStyle, background: tool.iconBg }}>
                  <Icon className="h-4 w-4" style={{ color: tool.iconColor }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 500 }}>{tool.name}</div>
                  <div style={{ color: "#71717A", fontSize: 11, marginTop: 1, letterSpacing: "-0.01em" }}>{tool.description}</div>
                </div>
                <Toggle active={activeTools[tool.id] ?? false} onToggle={() => onToggleTool(tool.id)} />
              </div>
            );
          })}
          <button onClick={() => setShowCustomize(false)} style={{ width: "100%", marginTop: 16, padding: "10px 0", borderRadius: 10, background: "#D4A017", color: "#000", fontWeight: 700, border: "none", cursor: "pointer", fontSize: 13 }}>Done</button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="sam-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>

        {/* AI Model Card */}
        <div style={{
          borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.03)",
          padding: 14,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {/* Glow overlays */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 85% 10%, rgba(212,160,23,0.16) 0%, transparent 52%)" }} />
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 15% 90%, rgba(80,60,5,0.25) 0%, transparent 50%)" }} />
          {/* Wave decoration */}
          <svg style={{ position: "absolute", right: 0, bottom: 0, opacity: 0.28, pointerEvents: "none" }} width="110" height="90" viewBox="0 0 110 90" fill="none">
            <path d="M110 90 C80 70, 60 50, 90 20 C100 8, 110 0, 110 0 L110 90Z" fill="#5C4A0A" />
            <path d="M110 90 C70 60, 55 35, 85 5 C95 -5, 110 0, 110 0 L110 90Z" fill="#3D3008" opacity="0.6" />
          </svg>
          <div style={{ position: "relative", zIndex: 1 }}>
            <span style={{ color: "#71717A", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>AI MODEL</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#F8FAFC", fontWeight: 700, fontSize: 22, letterSpacing: "-0.025em" }}>Sam 2.5</span>
              <span style={{ background: "rgba(212,160,23,0.18)", border: "1px solid rgba(212,160,23,0.35)", color: "#D4A017", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>Pro</span>
              <ChevronDown className="h-4 w-4 ml-auto" style={{ color: "#71717A" }} />
            </div>
              <div style={{ color: "#71717A", fontSize: 12, lineHeight: 1.5, letterSpacing: "-0.01em" }}>Most capable model for complex tasks.</div>
            <ChevronDown className="h-4 w-4 mt-3" style={{ color: "#71717A" }} />
          </div>
        </div>

        {/* Tools Card */}
        <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", padding: "12px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#F8FAFC", fontWeight: 600, fontSize: 14 }}>Tools</span>
            <button type="button" onClick={() => setShowCustomize(true)} style={{ color: "#71717A", fontSize: 12, background: "transparent", border: "none", cursor: "pointer", letterSpacing: "-0.01em" }}>Customize</button>
          </div>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const active = activeTools[tool.id] ?? false;
            return (
              <div key={tool.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{
                  ...toolIconBoxStyle,
                  background: tool.iconBg,
                  boxShadow: `0 0 10px ${tool.iconBg}`,
                }}>
                  <Icon className="h-4 w-4" style={{ color: tool.iconColor, filter: `drop-shadow(0 0 4px ${tool.iconColor}60)` }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 500 }}>{tool.name}</div>
                  <div style={{ color: "#71717A", fontSize: 11, marginTop: 1, letterSpacing: "-0.01em" }}>{tool.description}</div>
                </div>
                <Toggle active={active} onToggle={() => onToggleTool(tool.id)} />
              </div>
            );
          })}
        </div>

        {/* Memory Card */}
        <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", padding: "12px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#F8FAFC", fontWeight: 600, fontSize: 14 }}>Memory</span>
            <button type="button" style={{ color: "#D4A017", fontSize: 12, background: "transparent", border: "none", cursor: "pointer" }}>Manage</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ color: "#D4A017", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>68%</span>
            <div>
              <div style={{ color: "#71717A", fontSize: 13, letterSpacing: "-0.01em" }}>Memory usage</div>
              <div style={{ color: "#71717A", fontSize: 11, marginTop: 1 }}>0 files indexed</div>
            </div>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ width: "68%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #D4A017, #FFD54F)", boxShadow: "0 0 8px rgba(212,160,23,0.4)" }} />
          </div>
        </div>

        {/* Shortcuts Card */}
        <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", padding: "12px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#F8FAFC", fontWeight: 600, fontSize: 14 }}>Shortcuts</span>
            <button type="button" style={{ color: "#D4A017", fontSize: 12, background: "transparent", border: "none", cursor: "pointer" }}>Edit</button>
          </div>
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.keys} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: "#71717A" }} />
                </div>
                <span style={{ flex: 1, fontSize: 12, color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{s.label}</span>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "rgba(255,255,255,0.03)", color: "#71717A", fontFamily: "monospace" }}>{s.keys}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* Focus Mode — always pinned bottom */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Moon className="h-4 w-4" style={{ color: "#71717A" }} />
        <span style={{ color: "#71717A", fontSize: 13, letterSpacing: "-0.01em" }}>Focus Mode</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          {[Sun, Columns2, LayoutGrid].map((Icon, i) => (
            <button key={i} type="button" style={iconBtnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#71717A")}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
