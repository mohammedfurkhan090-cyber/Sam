"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function OrbHero() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        textAlign: "center",
        gap: 20,
      }}
    >
      <div
        className="absolute -z-10 h-56 w-56 rounded-full blur-3xl opacity-30"
        style={{
          background: "radial-gradient(circle, #D4A017 0%, transparent 70%)",
        }}
      />
...
      <motion.div
        className="relative h-28 w-28 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #FEF9C3 0%, #D4A017 35%, #92400E 70%, #1C1007 100%)",
          boxShadow: "0 0 60px 16px rgba(212,160,23,0.4), 0 0 120px 40px rgba(212,160,23,0.15)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.25) 0%, transparent 60%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="absolute h-0 w-0 opacity-0" aria-hidden="true" />
          <span className="select-none text-3xl">✨</span>
        </div>
      </motion.div>

      <div>
        <h2 className="text-2xl font-semibold text-white">Hey, I&apos;m Sam</h2>
        <p className="mt-1 text-sm text-[var(--sam-text-secondary)]">How can I help you today?</p>
      </div>
    </div>
  );
}
