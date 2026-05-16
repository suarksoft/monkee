"use client";

import { motion } from "framer-motion";
import { MessageSquare, Github } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left"
        >
          <div className="flex items-center gap-4 mb-6 justify-center lg:justify-start">
            <Image src="/logo.png" alt="MonadBot Logo" width={64} height={64} className="rounded-2xl" />
            <span className="text-2xl font-bold text-foreground">MonadBot</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="gradient-text">Trade Smarter</span>
            <br />
            <span className="text-foreground">on Monad</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 text-pretty">
            AI-powered Telegram bot that analyzes, executes, and monitors your trades on Monad blockchain — all in a single chat.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <motion.a
              href="#"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <MessageSquare className="w-5 h-5" />
              Launch Bot
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border bg-secondary/50 text-foreground font-semibold hover:bg-secondary transition-colors"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </motion.a>
          </div>
        </motion.div>

        {/* Right content - Telegram mockup */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="relative mx-auto w-full max-w-sm">
            {/* Phone frame */}
            <div className="relative rounded-[2.5rem] bg-[#1c1c1e] p-2 shadow-2xl shadow-primary/20">
              <div className="rounded-[2rem] bg-[#0a0a0a] overflow-hidden">
                {/* Header */}
                <div className="bg-[#1c1c1e] px-4 py-3 flex items-center gap-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                    <Image src="/logo.png" alt="MonadBot" width={40} height={40} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm">MonadBot</p>
                    <p className="text-muted-foreground text-xs">online</p>
                  </div>
                </div>
                {/* Chat messages */}
                <div className="p-4 space-y-3 min-h-[320px]">
                  {/* User message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-end"
                  >
                    <div className="bg-primary/20 text-foreground px-4 py-2 rounded-2xl rounded-br-md max-w-[80%]">
                      <p className="text-sm">CHOG al 5 MON</p>
                    </div>
                  </motion.div>
                  {/* Bot response */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-start"
                  >
                    <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%]">
                      <p className="text-sm text-muted-foreground mb-2">🔄 Processing trade...</p>
                      <div className="bg-[#0a0a0a] rounded-lg p-3 space-y-2">
                        <p className="text-[#22c55e] text-sm font-mono">✅ Trade Executed</p>
                        <p className="text-foreground text-sm">5 MON → 12,450 CHOG</p>
                        <p className="text-muted-foreground text-xs font-mono">Tx: 0x3f4a...8b2c</p>
                      </div>
                    </div>
                  </motion.div>
                  {/* Bot follow-up */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="flex justify-start"
                  >
                    <div className="glass-card px-4 py-2 rounded-2xl rounded-bl-md">
                      <p className="text-sm text-foreground">📊 CHOG +12.4% (24h)</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 glass-card px-3 py-2 rounded-lg"
            >
              <p className="text-xs text-[#22c55e] font-mono">+24.5%</p>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-4 glass-card px-3 py-2 rounded-lg"
            >
              <p className="text-xs text-accent font-mono">{"< 3s"}</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
