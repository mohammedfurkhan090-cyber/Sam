"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useSamChat } from "@/hooks/useSamChat"
import { 
  ArrowUp, Mic, Menu, X, Sun, Moon, Monitor,
  Sparkles, Brain, Search, MessageSquare, Zap,
  BookOpen, Presentation, GitBranch, Coffee, Code, Lightbulb, PenTool,
  Plus, ChevronDown, Volume2, MoreHorizontal
} from "lucide-react"

// Types
type ToolName = "unfold" | "search" | "none"
type AssistantMode = "studying" | "mindmap" | "slides" | "daily" | "coding" | "brainstorm" | "writing"
type StreamingState = "idle" | "routing" | "streaming" | "done"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  tool: ToolName | null
  output: {
    summary?: string
    keyPoints?: string[]
    blindSpots?: string[]
    questions?: string[]
    chat?: string
    search?: string
  }
  timestamp: Date
  mode?: "structure" | "poke" | "expand"
  assistantMode?: AssistantMode
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const getRelativeTime = (date: Date) => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Mode Configuration
const modeConfig: Record<AssistantMode, {
  icon: typeof BookOpen
  label: string
  description: string
  color: string
  placeholder: string
  suggestions: string[]
}> = {
  daily: {
    icon: Coffee,
    label: "Daily",
    description: "Casual chat & assistance",
    color: "#ec4899",
    placeholder: "What's on your mind?",
    suggestions: ["Plan my day", "Give me motivation", "Recipe ideas"]
  },
  studying: {
    icon: BookOpen,
    label: "Study",
    description: "Learn & understand concepts",
    color: "#10b981",
    placeholder: "What would you like to learn?",
    suggestions: ["Explain quantum physics", "Help with calculus", "Summarize history"]
  },
  mindmap: {
    icon: GitBranch,
    label: "Mind Map",
    description: "Visualize ideas & connections",
    color: "#8b5cf6",
    placeholder: "What would you like to map out?",
    suggestions: ["Map my project", "Organize ideas", "Plan my thesis"]
  },
  slides: {
    icon: Presentation,
    label: "Slides",
    description: "Create presentations",
    color: "#f59e0b",
    placeholder: "What presentation do you need?",
    suggestions: ["Pitch deck", "Quarterly review", "Project proposal"]
  },
  coding: {
    icon: Code,
    label: "Code",
    description: "Programming help",
    color: "#06b6d4",
    placeholder: "What are you building?",
    suggestions: ["Debug React", "Explain async", "SQL help"]
  },
  brainstorm: {
    icon: Lightbulb,
    label: "Ideas",
    description: "Generate creative ideas",
    color: "#f97316",
    placeholder: "What would you like to brainstorm?",
    suggestions: ["Business ideas", "Marketing strategy", "Product features"]
  },
  writing: {
    icon: PenTool,
    label: "Write",
    description: "Content & copywriting",
    color: "#a855f7",
    placeholder: "What would you like to write?",
    suggestions: ["Blog intro", "Email draft", "Social caption"]
  }
}

// Theme Toggle
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="w-8 h-8" />

  const themes = [
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
    { value: "system", icon: Monitor },
  ]

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-full bg-[var(--sam-surface)] border border-[var(--sam-border)]">
      {themes.map(({ value, icon: Icon }) => (
        <motion.button
          key={value}
          onClick={() => setTheme(value)}
          className={`relative p-1.5 rounded-full transition-colors ${
            theme === value 
              ? "text-[var(--sam-accent)]" 
              : "text-[var(--sam-text-muted)] hover:text-[var(--sam-text-secondary)]"
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {theme === value && (
            <motion.div
              layoutId="theme-bg"
              className="absolute inset-0 bg-[var(--sam-accent)]/10 rounded-full"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <Icon className="w-3.5 h-3.5 relative z-10" />
        </motion.button>
      ))}
    </div>
  )
}

// History Sidebar
function HistorySidebar({ 
  messages, 
  activeId, 
  onSelect, 
  onClear,
  isOpen,
  onClose
}: { 
  messages: Message[]
  activeId: string | null
  onSelect: (id: string) => void
  onClear: () => void
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="fixed lg:relative left-0 top-0 h-full w-[280px] 
                   bg-[var(--sam-sidebar)] border-r border-[var(--sam-border)]
                   flex flex-col z-50 lg:z-auto lg:translate-x-0"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--sam-border)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--sam-accent)]" />
            <span className="text-[var(--sam-text-secondary)] text-sm font-medium">History</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[var(--sam-text-muted)] hover:bg-[var(--sam-border-hover)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sam-scrollbar">
          {messages.filter((msg) => msg.role === "user").length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="w-8 h-8 text-[var(--sam-text-faint)] mb-3" />
              <p className="text-[var(--sam-text-faint)] text-sm">No conversations yet</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {messages.filter((msg) => msg.role === "user").map((msg) => (
                <motion.li key={msg.id} layout>
                  <button
                    onClick={() => { onSelect(msg.id); onClose(); }}
                    className={`w-full text-left p-3 rounded-xl transition-all group ${
                      activeId === msg.id 
                        ? "bg-[var(--sam-accent)]/10 border-l-2 border-[var(--sam-accent)]" 
                        : "hover:bg-[var(--sam-border-hover)]/50 border-l-2 border-transparent"
                    }`}
                  >
                    <p className="text-[var(--sam-text-primary)] text-sm truncate mb-1">
                      {msg.content.substring(0, 40)}{msg.content.length > 40 && "..."}
                    </p>
                    <div className="flex items-center gap-2">
                      {msg.assistantMode && (
                        <span 
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${modeConfig[msg.assistantMode].color}20`, color: modeConfig[msg.assistantMode].color }}
                        >
                          {modeConfig[msg.assistantMode].label}
                        </span>
                      )}
                      <span className="text-[var(--sam-text-faint)] text-xs">{getRelativeTime(msg.timestamp)}</span>
                    </div>
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {messages.length > 0 && (
          <div className="p-4 border-t border-[var(--sam-border)]">
            <button onClick={onClear} className="text-[var(--sam-text-faint)] text-xs hover:text-[var(--sam-text-secondary)] transition-colors">
              Clear all
            </button>
          </div>
        )}
      </motion.aside>
    </>
  )
}

// Unified Prompt Box Component
function PromptBox({
  value,
  onChange,
  onSubmit,
  disabled,
  selectedMode,
  onModeChange,
  showSuggestions
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  selectedMode: AssistantMode
  onModeChange: (mode: AssistantMode) => void
  showSuggestions: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  
  const config = modeConfig[selectedMode]
  const Icon = config.icon
  const modes = Object.entries(modeConfig) as [AssistantMode, typeof modeConfig[AssistantMode]][]

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        className={`
          relative rounded-3xl border transition-all duration-300
          bg-[var(--sam-prompt-bg)] backdrop-blur-xl
          ${isFocused 
            ? "border-[var(--sam-accent)]/40 shadow-2xl shadow-[var(--sam-accent)]/10" 
            : "border-[var(--sam-border)] shadow-xl shadow-black/5"
          }
        `}
        animate={{ scale: isFocused ? 1.01 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Mode selector row */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-[var(--sam-border)]/50">
          {/* Active mode button */}
          <motion.button
            onClick={() => !disabled && setShowModeMenu(!showModeMenu)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all border
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{ 
              backgroundColor: `${config.color}15`,
              borderColor: `${config.color}30`,
              color: config.color
            }}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showModeMenu ? "rotate-180" : ""}`} />
          </motion.button>

          {/* Quick mode pills */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto flex-1">
            {modes.filter(([mode]) => mode !== selectedMode).slice(0, 4).map(([mode, cfg]) => {
              const ModeIcon = cfg.icon
              return (
                <motion.button
                  key={mode}
                  onClick={() => !disabled && onModeChange(mode)}
                  disabled={disabled}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                    bg-[var(--sam-surface)] text-[var(--sam-text-muted)]
                    hover:bg-[var(--sam-border-hover)] hover:text-[var(--sam-text-secondary)]
                    transition-all border border-transparent hover:border-[var(--sam-border)]
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                  whileHover={!disabled ? { scale: 1.02 } : {}}
                  whileTap={!disabled ? { scale: 0.98 } : {}}
                >
                  <ModeIcon className="w-3 h-3" />
                  <span>{cfg.label}</span>
                </motion.button>
              )
            })}
            <motion.button
              onClick={() => !disabled && setShowModeMenu(!showModeMenu)}
              disabled={disabled}
              className="p-1.5 rounded-full text-[var(--sam-text-muted)] hover:bg-[var(--sam-border-hover)] transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Mode dropdown */}
        <AnimatePresence>
          {showModeMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-b border-[var(--sam-border)]/50"
            >
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {modes.map(([mode, cfg]) => {
                  const ModeIcon = cfg.icon
                  const isSelected = selectedMode === mode
                  return (
                    <motion.button
                      key={mode}
                      onClick={() => { onModeChange(mode); setShowModeMenu(false); }}
                      className={`
                        flex flex-col items-center gap-2 p-3 rounded-xl transition-all
                        ${isSelected 
                          ? "ring-2" 
                          : "hover:bg-[var(--sam-surface)]"
                        }
                      `}
                      style={{ 
                        backgroundColor: isSelected ? `${cfg.color}10` : undefined,
                        ...(isSelected ? { "--tw-ring-color": cfg.color } : {})
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${cfg.color}15` }}
                      >
                        <ModeIcon className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-[var(--sam-text-primary)]">{cfg.label}</p>
                        <p className="text-[10px] text-[var(--sam-text-muted)] hidden sm:block">{cfg.description}</p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick suggestions */}
        <AnimatePresence>
          {showSuggestions && !value.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[var(--sam-border)]/50">
                {config.suggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onChange(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium
                               bg-[var(--sam-surface)] text-[var(--sam-text-secondary)]
                               hover:bg-[var(--sam-border-hover)] hover:text-[var(--sam-text-primary)]
                               transition-all border border-[var(--sam-border)]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="flex items-end gap-3 p-4">
          <motion.button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`
              p-2.5 rounded-xl shrink-0 transition-all relative
              ${isVoiceActive 
                ? "text-white bg-[var(--sam-accent)]" 
                : "text-[var(--sam-text-muted)] hover:bg-[var(--sam-surface)]"
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic className="w-5 h-5" />
            {isVoiceActive && (
              <motion.span
                className="absolute inset-0 rounded-xl border-2 border-[var(--sam-accent)]"
                animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />)}
          </motion.button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, 3000))}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={config.placeholder}
              disabled={disabled}
              rows={1}
              className="w-full bg-transparent text-[var(--sam-text-primary)] text-sm
                         placeholder:text-[var(--sam-text-faint)] resize-none
                         focus:outline-none disabled:opacity-50 leading-relaxed"
            />
          </div>

          <motion.button
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="p-2.5 rounded-xl bg-[var(--sam-accent)] text-white
                       hover:opacity-90 transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="flex justify-center pb-3">
          <span className="text-[var(--sam-text-faint)] text-[10px] flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--sam-surface)] rounded text-[9px] font-mono">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--sam-surface)] rounded text-[9px] font-mono">↵</kbd>
            <span className="ml-0.5">to send</span>
          </span>
        </div>
      </motion.div>
    </div>
  )
}

// Output Card
function OutputCard({ 
  title, 
  icon: Icon, 
  children,
  delay = 0
}: { 
  title: string
  icon: typeof Sparkles
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-[var(--sam-card)] border border-[var(--sam-border)] rounded-2xl p-5
                 hover:border-[var(--sam-border-hover)] transition-colors"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[var(--sam-accent)]" />
        <span className="text-[var(--sam-text-secondary)] text-xs font-medium uppercase tracking-wide">
          {title}
        </span>
      </div>
      {children}
    </motion.div>
  )
}

// Thinking Output
function ThinkingOutput({ output, isStreaming }: { output: Message["output"]; isStreaming: boolean }) {
  const [playingCard, setPlayingCard] = useState<string | null>(null)

  const hasSummary = Boolean(output.summary)
  const hasKeyPoints = Boolean(output.keyPoints?.length)
  const hasBlindSpots = Boolean(output.blindSpots?.length)
  const hasQuestions = Boolean(output.questions?.length)
  const hasContent = hasSummary || hasKeyPoints || hasBlindSpots || hasQuestions

  if (isStreaming && !hasContent) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i}
            className="h-40 rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)] animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
      {hasSummary && (
        <OutputCard title="Summary" icon={Sparkles} delay={0}>
          <div className="flex justify-end mb-2">
            <motion.button
              onClick={() => setPlayingCard(playingCard === "summary" ? null : "summary")}
              className={`p-1.5 rounded-lg transition-all ${
                playingCard === "summary" 
                  ? "text-[var(--sam-accent)] bg-[var(--sam-accent)]/10" 
                  : "text-[var(--sam-text-muted)] hover:bg-[var(--sam-surface)]"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Volume2 className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-[var(--sam-text-primary)] text-sm leading-relaxed">
            <p>
              {output.summary}
              {isStreaming && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-[var(--sam-accent)] ml-1"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </p>
          </div>
        </OutputCard>
      )}

      {hasKeyPoints && (
        <OutputCard title="Key Points" icon={Zap} delay={0.1}>
          <div className="flex justify-end mb-2">
            <motion.button
              onClick={() => setPlayingCard(playingCard === "keyPoints" ? null : "keyPoints")}
              className={`p-1.5 rounded-lg transition-all ${
                playingCard === "keyPoints" 
                  ? "text-[var(--sam-accent)] bg-[var(--sam-accent)]/10" 
                  : "text-[var(--sam-text-muted)] hover:bg-[var(--sam-surface)]"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Volume2 className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-[var(--sam-text-primary)] text-sm leading-relaxed">
            <ul className="space-y-2">
              {output.keyPoints?.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <span className="text-[var(--sam-accent)] mt-1">•</span>
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </OutputCard>
      )}

      {hasBlindSpots && (
        <OutputCard title="Blind Spots" icon={Brain} delay={0.2}>
          <div className="flex justify-end mb-2">
            <motion.button
              onClick={() => setPlayingCard(playingCard === "blindSpots" ? null : "blindSpots")}
              className={`p-1.5 rounded-lg transition-all ${
                playingCard === "blindSpots" 
                  ? "text-[var(--sam-accent)] bg-[var(--sam-accent)]/10" 
                  : "text-[var(--sam-text-muted)] hover:bg-[var(--sam-surface)]"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Volume2 className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-[var(--sam-text-primary)] text-sm leading-relaxed">
            <ul className="space-y-2">
              {output.blindSpots?.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <span className="text-[var(--sam-accent)] mt-1">•</span>
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </OutputCard>
      )}

      {hasQuestions && (
        <OutputCard title="Questions" icon={MessageSquare} delay={0.3}>
          <div className="flex justify-end mb-2">
            <motion.button
              onClick={() => setPlayingCard(playingCard === "questions" ? null : "questions")}
              className={`p-1.5 rounded-lg transition-all ${
                playingCard === "questions" 
                  ? "text-[var(--sam-accent)] bg-[var(--sam-accent)]/10" 
                  : "text-[var(--sam-text-muted)] hover:bg-[var(--sam-surface)]"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Volume2 className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-[var(--sam-text-primary)] text-sm leading-relaxed">
            <ul className="space-y-2">
              {output.questions?.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <span className="text-[var(--sam-accent)] mt-1">•</span>
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </OutputCard>
      )}
    </div>
  )
}

// Chat Bubble
function ChatBubble({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-[var(--sam-card)] border border-[var(--sam-border)] rounded-2xl px-5 py-4">
        <p className="text-[var(--sam-text-primary)] text-sm leading-relaxed">
          {content}
          {isStreaming && (
            <motion.span 
              className="inline-block w-0.5 h-4 bg-[var(--sam-accent)] ml-1"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </p>
      </div>
    </motion.div>
  )
}

// Search Output
function SearchOutput({ isLoading }: { isLoading: boolean }) {
  return (
    <OutputCard title="Search Results" icon={Search}>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-[var(--sam-surface)] animate-pulse" style={{ width: `${100 - i * 20}%` }} />
          ))}
        </div>
      ) : (
        <p className="text-[var(--sam-text-muted)] text-sm">Search coming soon</p>
      )}
    </OutputCard>
  )
}

// Status Indicator
function StatusIndicator({ state, tool }: { state: StreamingState; tool: ToolName | null }) {
  const config = {
    idle: { label: "Ready", color: "var(--sam-text-faint)", icon: Sparkles },
    routing: { label: "Routing...", color: "var(--sam-accent)", icon: Zap },
    streaming: {
      unfold: { label: "Thinking", color: "var(--sam-accent)", icon: Brain },
      search: { label: "Searching", color: "#3b82f6", icon: Search },
      none: { label: "Responding", color: "var(--sam-text-muted)", icon: MessageSquare }
    },
    done: { label: "Done", color: "#22c55e", icon: Sparkles }
  }

  let current = config.idle
  if (state === "streaming" && tool) {
    current = config.streaming[tool]
  } else if (state in config) {
    current = config[state as keyof typeof config] as typeof current
  }

  const Icon = current.icon

  return (
    <motion.div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--sam-surface)] border border-[var(--sam-border)]"
      animate={{ boxShadow: state === "streaming" ? `0 0 12px ${current.color}20` : "none" }}
    >
      <motion.div
        animate={state === "streaming" ? { rotate: 360 } : {}}
        transition={{ duration: 2, repeat: state === "streaming" ? Infinity : 0, ease: "linear" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: current.color }} />
      </motion.div>
      <span className="text-xs font-medium" style={{ color: current.color }}>{current.label}</span>
      {state === "streaming" && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: current.color }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

function RoutingPill({ tool }: { tool: ToolName | null }) {
  const label = tool === "unfold" ? "Thinking" : tool === "none" ? "Responding" : "Routing"
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--sam-surface)] border border-[var(--sam-border)] text-[var(--sam-text-secondary)] text-xs">
      <Zap className="w-3.5 h-3.5 text-[var(--sam-accent)]" />
      <span>{label}</span>
    </div>
  )
}

// Empty State
function EmptyState() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center h-full text-center px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="relative mb-6"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--sam-accent)] to-[#3b82f6] flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl bg-[var(--sam-accent)]/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      <h2 className="text-lg font-medium text-[var(--sam-text-primary)] mb-1">
        Hey, I&apos;m Sam
      </h2>
      <p className="text-[var(--sam-text-secondary)] text-sm max-w-sm">
        Your personal AI assistant. Choose a mode and ask me anything.
      </p>
    </motion.div>
  )
}

// Main Page
export default function SamPage() {
  const { submit, messages, output: liveOutput, streamingState, currentTool, clearMessages } = useSamChat()
  const [inputValue, setInputValue] = useState("")
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<AssistantMode>("daily")
  const bottomRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async () => {
    if (!inputValue.trim() || streamingState !== "idle") return

    setInputValue("")
    await submit(inputValue)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingState])

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--sam-bg)]">
      {/* Sidebar - always visible on desktop */}
      <div className="hidden lg:flex">
        <HistorySidebar
          messages={messages}
          activeId={activeMessageId}
          onSelect={setActiveMessageId}
          onClear={() => { clearMessages(); setActiveMessageId(null); }}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <HistorySidebar
          messages={messages}
          activeId={activeMessageId}
          onSelect={setActiveMessageId}
          onClear={() => { clearMessages(); setActiveMessageId(null); }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimal Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--sam-border)]">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[var(--sam-text-muted)] hover:bg-[var(--sam-surface)] transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu className="w-5 h-5" />
            </motion.button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--sam-accent)]" />
              <span className="text-[var(--sam-text-primary)] font-semibold">Sam</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusIndicator state={streamingState} tool={currentTool} />
            <ThemeToggle />
          </div>
        </header>

        {/* Main content - clean, no background decorations */}
        <main className="flex-1 overflow-y-auto sam-scrollbar p-4 md:p-6 bg-[var(--sam-bg)]">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    {msg.role === "user" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end"
                      >
                        <div className="max-w-xl px-4 py-3 rounded-2xl rounded-br-sm bg-[var(--sam-accent)]/15 border border-[var(--sam-accent)]/20 text-[var(--sam-text-primary)] text-sm">
                          {msg.content}
                        </div>
                      </motion.div>
                    )}

                    {msg.role === "assistant" && (
                      <div>
                        {msg.tool === "unfold" && <ThinkingOutput output={msg.output} isStreaming={false} />}
                        {msg.tool === "none" && msg.output.chat && (
                          <ChatBubble content={msg.output.chat} isStreaming={false} />
                        )}
                        {msg.tool === "search" && <SearchOutput isLoading={false} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {(streamingState === "streaming" || streamingState === "routing") && (
                <div className="space-y-4">
                  {streamingState === "routing" && <RoutingPill tool={currentTool} />}
                  {currentTool === "unfold" && <ThinkingOutput output={liveOutput} isStreaming={true} />}
                  {currentTool === "none" && liveOutput.chat && (
                    <ChatBubble content={liveOutput.chat} isStreaming={true} />
                  )}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {/* Floating Prompt Box */}
        <footer className="p-4 pb-6">
          <PromptBox
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={streamingState !== "idle"}
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            showSuggestions={streamingState === "idle"}
          />
        </footer>
      </div>
    </div>
  )
}
