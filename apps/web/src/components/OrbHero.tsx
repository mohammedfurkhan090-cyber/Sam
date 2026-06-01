"use client";

import { motion } from "framer-motion";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function OrbHero() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      width: "100%",
      textAlign: "center",
      gap: 24,
      position: "relative",
    }}>
      {/* Upper bloom */}
      <div style={{
        position: "absolute",
        top: "4%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 720,
        height: 440,
        borderRadius: "50%",
        background: "radial-gradient(ellipse at 50% 36%, rgba(212,160,23,0.22) 0%, rgba(212,160,23,0.08) 40%, transparent 65%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Floor bloom */}
      <div style={{
        position: "absolute",
        top: "38%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 520,
        height: 320,
        borderRadius: "50%",
        background: "radial-gradient(ellipse at 50% 18%, rgba(180,115,0,0.16) 0%, rgba(140,85,0,0.06) 48%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Orb wrapper */}
      <div style={{
        position: "relative",
        width: 140,
        height: 140,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        zIndex: 1,
      }}>
        {/* Ring 1 */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.025, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -18,
            borderRadius: "50%",
            border: "1px solid rgba(212,160,23,0.28)",
            pointerEvents: "none",
          }}
        />
        {/* Ring 2 */}
        <motion.div
          animate={{ opacity: [0.3, 0.65, 0.3], scale: [1, 1.03, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          style={{
            position: "absolute",
            inset: -36,
            borderRadius: "50%",
            border: "1px solid rgba(212,160,23,0.12)",
            pointerEvents: "none",
          }}
        />

        {/* Orb sphere — overflow hidden so face dots clip correctly to circle */}
        <motion.div
          animate={{ scale: [1, 1.035, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "relative",
            width: 120,
            height: 120,
            borderRadius: "50%",
            overflow: "hidden",
            background: "radial-gradient(circle at 34% 30%, #FFF5CC 0%, #F7CC00 16%, #C88500 42%, #6B3600 70%, #200E00 88%, #0D0500 100%)",
            boxShadow: `
              0 0 0 1px rgba(212,160,23,0.14),
              0 0 35px 10px rgba(212,160,23,0.58),
              0 0 80px 28px rgba(212,160,23,0.26),
              0 0 140px 55px rgba(180,110,0,0.13),
              inset 0 0 35px rgba(0,0,0,0.50)
            `,
          }}
        >
          {/* Specular hotspot */}
          <div style={{
            position: "absolute",
            width: 44,
            height: 32,
            top: "13%",
            left: "17%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.88) 0%, rgba(255,255,220,0.50) 38%, transparent 70%)",
            filter: "blur(2px)",
            pointerEvents: "none",
            zIndex: 5,
          }} />

          {/* Rim light */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 72% 76%, rgba(255,185,40,0.18) 0%, transparent 48%)",
            pointerEvents: "none",
            zIndex: 4,
          }} />

          {/* Face dots — position absolute relative to orb (position:relative parent) */}
          <motion.div
            style={{ position: "absolute", inset: 0 }}
            animate={{ opacity: [0.55, 0.90, 0.55] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div style={{
              position: "absolute",
              left: 38,
              top: 52,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.88)",
              boxShadow: "0 0 8px 3px rgba(255,255,255,0.75)",
              zIndex: 10,
            }} />
            <div style={{
              position: "absolute",
              left: 68,
              top: 52,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.88)",
              boxShadow: "0 0 8px 3px rgba(255,255,255,0.75)",
              zIndex: 10,
            }} />
          </motion.div>
        </motion.div>
      </div>

      {/* Greeting */}
      <div style={{ zIndex: 1 }}>
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--sam-text-bright)",
          margin: 0,
          letterSpacing: "-0.03em",
        }}>
          {getGreeting()}, Khan 👋 <span style={{ fontSize: 18 }}>✦</span>
        </h2>
        <p style={{
          marginTop: 8,
          fontSize: 15,
          color: "var(--sam-text-nav)",
          letterSpacing: "0.01em",
        }}>
          How can I help you today?
        </p>
      </div>
    </div>
  );
}
