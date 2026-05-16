"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const terminalLines = [
  { type: "user", text: "Trending ne var?" },
  { type: "bot", text: "📊 Top 3 Trending Tokens:" },
  { type: "bot", text: "" },
  { type: "token", name: "CHOG", score: "94", volume: "12.4K MON", comment: "Strong momentum, whale accumulation detected" },
  { type: "token", name: "PEPE", score: "87", volume: "8.2K MON", comment: "High social activity, bullish sentiment" },
  { type: "token", name: "DOGE", score: "82", volume: "5.1K MON", comment: "Steady growth, low volatility" },
  { type: "bot", text: "" },
  { type: "user", text: "CHOG al 5 MON" },
  { type: "bot", text: "🔄 Executing trade..." },
  { type: "success", text: "✅ 5 MON → 12,450 CHOG | Tx: 0x3f4a...8b2c" },
];

export function LiveTerminal() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (visibleLines < terminalLines.length) {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorTimer);
  }, []);

  return (
    <section className="py-24 px-4" id="terminal">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">See It in Action</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Real bot interactions, real-time execution
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          {/* Terminal header */}
          <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-2 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-4 text-xs text-muted-foreground font-mono">MonadBot Terminal</span>
          </div>

          {/* Terminal content */}
          <div className="p-6 font-mono text-sm min-h-[400px] bg-[#0a0a0a]">
            {terminalLines.slice(0, visibleLines).map((line, index) => (
              <div key={index} className="mb-2">
                {line.type === "user" && (
                  <div className="flex items-start gap-2">
                    <span className="text-accent">{">"}</span>
                    <span className="text-foreground">{line.text}</span>
                  </div>
                )}
                {line.type === "bot" && line.text && (
                  <div className="text-muted-foreground pl-4">{line.text}</div>
                )}
                {line.type === "bot" && !line.text && <div className="h-2" />}
                {line.type === "token" && (
                  <div className="pl-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-1">
                    <span className="text-primary font-semibold">{line.name}</span>
                    <span className="text-[#22c55e]">Score: {line.score}</span>
                    <span className="text-muted-foreground">Vol: {line.volume}</span>
                    <span className="text-muted-foreground/70 text-xs">— {line.comment}</span>
                  </div>
                )}
                {line.type === "success" && (
                  <div className="text-[#22c55e] pl-4 font-semibold">{line.text}</div>
                )}
              </div>
            ))}
            {/* Cursor */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-accent">{">"}</span>
              <span className={`w-2 h-4 bg-foreground ${showCursor ? "opacity-100" : "opacity-0"}`} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
