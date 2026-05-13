"use client";

import { useState } from "react";
import {
  Search,
  Database,
  ImageIcon,
  Code2,
  Brain,
  Presentation,
  Volume2,
  Zap,
  ChevronDown,
  Moon,
  Sun,
  Columns2,
  LayoutGrid,
} from "lucide-react";

interface RightPanelProps {
  activeTools: Record<string, boolean>;
  onToggleTool: (id: string) => void;
}

const TOOLS = [
  { id: "search", icon: Search, name: "Web Search", description: "Get real-time information" },
  { id: "rag", icon: Database, name: "File Analyzer", description: "Analyze PDFs, Docs, CSVs" },
  { id: "image", icon: ImageIcon, name: "Image Generator", description: "Create stunning visuals" },
  { id: "code", icon: Code2, name: "Code Interpreter", description: "Run code & analyze data" },
  { id: "unfold", icon: Brain, name: "Deep Analysis", description: "Think through complex ideas" },
  { id: "slides", icon: Presentation, name: "Slides", description: "Create presentations" },
  { id: "speak", icon: Volume2, name: "Voice Output", description: "Text to speech" },
  { id: "agent", icon: Zap, name: "Agent Mode", description: "Multi-step task execution" },
];

const SHORTCUTS = [
  { label: "Summarize this conversation", keys: "⌘1" },
  { label: "Extract key points", keys: "⌘2" },
  { label: "Translate to English", keys: "⌘3" },
  { label: "Make it more concise", keys: "⌘4" },
];

export default function RightPanel({ activeTools, onToggleTool }: RightPanelProps) {
  const [showCustomize, setShowCustomize] = useState(false);
  const iconButtonStyle = {
    color: "var(--sam-text-muted)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 8,
    display: "flex",
  };

  return (
    <aside
      className="sam-scrollbar"
      style={{
        background: "var(--sam-sidebar)",
        borderLeft: "1px solid var(--sam-border)",
        width: 300,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {showCustomize && (
        <div style={{
          position: "absolute", inset: 0, background: "var(--sam-card)", zIndex: 10, padding: 16
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: "#FFF", fontWeight: 700, fontSize: 16 }}>Customize Tools</div>
            <button onClick={() => setShowCustomize(false)} style={iconButtonStyle}>X</button>
          </div>
          <div className="space-y-4">
            {TOOLS.map((tool) => (
              <div key={tool.id}>
                <div style={{ color: "#FFF", fontSize: 13, fontWeight: 600 }}>{tool.name}</div>
                <div style={{ color: "var(--sam-text-muted)", fontSize: 11, marginTop: 2 }}>{tool.description}</div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowCustomize(false)}
            style={{ width: "100%", marginTop: 20, padding: 10, borderRadius: 8, background: "var(--sam-accent)", color: "#000", fontWeight: 600, border: "none" }}
          >
            Done
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div
          style={{
            margin: 12,
            borderRadius: 16,
            background: "linear-gradient(135deg, #0f1a0a 0%, #141414 50%, #1a1200 100%)",
            border: "1px solid rgba(212,160,23,0.25)",
            padding: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at 90% 15%, rgba(212,160,23,0.18) 0%, transparent 55%), radial-gradient(ellipse at 10% 85%, rgba(30,80,10,0.4) 0%, transparent 55%)",
            }}
          />
          <div className="relative z-10">
            <span
              style={{
                color: "var(--sam-text-muted)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 6,
                display: "block",
              }}
            >
              AI MODEL
            </span>
            <div className="flex items-center gap-2">
              <span style={{ color: "#FFF", fontWeight: 700, fontSize: 20 }}>Sam 2.5</span>
              <span
                style={{
                  background: "var(--sam-accent)",
                  color: "#000",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  marginLeft: 8,
                }}
              >
                Pro
              </span>
              <ChevronDown className="ml-auto h-4 w-4" style={{ color: "var(--sam-text-muted)" }} />
            </div>
            <div style={{ color: "var(--sam-text-muted)", fontSize: 12, marginTop: 4 }}>
              Your personal AI orchestrator.
            </div>
            <div style={{ color: "var(--sam-text-muted)", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
              Most capable model for complex tasks.
            </div>
            <ChevronDown className="mx-auto mt-3 h-4 w-4" style={{ color: "var(--sam-text-muted)" }} />
          </div>
        </div>

        <div style={{ padding: "0 12px 12px" }}>
          <div className="mb-3 flex items-center justify-between">
            <div style={{ color: "#FFF", fontWeight: 600, fontSize: 14 }}>Tools</div>
            <button
              type="button"
              onClick={() => setShowCustomize(true)}
              style={{
                color: "var(--sam-accent)",
                fontSize: 12,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Customize
            </button>
          </div>

          <div>
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const active = activeTools[tool.id] ?? false;
              return (
                <div
                  key={tool.id}
                  className="flex items-center gap-3"
                  style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--sam-surface)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "var(--sam-text-secondary)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ color: "#FFF", fontSize: 13, fontWeight: 500 }}>{tool.name}</div>
                    <div style={{ color: "var(--sam-text-muted)", fontSize: 11 }}>{tool.description}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() => onToggleTool(tool.id)}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      height: 20,
                      width: 36,
                      borderRadius: 99,
                      flexShrink: 0,
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      background: active ? "var(--sam-accent)" : "#2A2A2A",
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 16,
                        height: 16,
                        borderRadius: 99,
                        background: "#FFFFFF",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                        transition: "transform 0.2s",
                        transform: active ? "translateX(18px)" : "translateX(2px)",
                        marginTop: 2,
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid var(--sam-border)" }}>
          <div className="flex items-center justify-between">
            <div style={{ color: "#FFF", fontWeight: 600, fontSize: 14 }}>Memory</div>
            <button
              type="button"
              style={{
                color: "var(--sam-accent)",
                fontSize: 12,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Manage
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div style={{ color: "var(--sam-accent)", fontSize: 24, fontWeight: 700 }}>68%</div>
            <div>
              <div style={{ color: "#FFF", fontSize: 13 }}>Memory usage</div>
              <div style={{ color: "var(--sam-text-muted)", fontSize: 11 }}>0 files indexed</div>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 4, borderRadius: 999, background: "var(--sam-surface)" }}>
            <div
              style={{
                width: "68%",
                height: "100%",
                borderRadius: 99,
                background: "linear-gradient(90deg, var(--sam-accent), #E5B820)",
              }}
            />
          </div>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid var(--sam-border)" }}>
          <div className="mb-2 flex items-center justify-between">
            <div style={{ color: "#FFF", fontWeight: 600, fontSize: 14 }}>Shortcuts</div>
            <button
              type="button"
              style={{
                color: "var(--sam-accent)",
                fontSize: 12,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          </div>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center gap-2" style={{ padding: "7px 0" }}>
              <div
                className="flex items-center justify-center"
                style={{ width: 20, height: 20, borderRadius: 6, background: "var(--sam-surface)" }}
              >
                <LayoutGrid className="h-3 w-3" style={{ color: "var(--sam-text-muted)" }} />
              </div>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "var(--sam-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {shortcut.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "var(--sam-surface)",
                  color: "var(--sam-text-muted)",
                  fontFamily: "monospace",
                }}
              >
                {shortcut.keys}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--sam-border)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          style={iconButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-muted)")}
        >
          <Moon className="h-4 w-4" />
        </button>
        <span style={{ color: "var(--sam-text-muted)", fontSize: 12 }}>Focus Mode</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            style={iconButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-muted)")}
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            type="button"
            style={iconButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-muted)")}
          >
            <Columns2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            style={iconButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sam-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sam-text-muted)")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
