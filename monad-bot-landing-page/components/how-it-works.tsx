"use client";

import { motion } from "framer-motion";
import { MessageSquare, Wallet, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Open Telegram",
    description: "Search @MonadBot and hit Start",
  },
  {
    number: "02",
    icon: Wallet,
    title: "Fund Your Wallet",
    description: "Send MON to your auto-generated wallet address",
  },
  {
    number: "03",
    icon: Send,
    title: "Start Trading",
    description: "Chat naturally — buy, sell, analyze, monitor",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4" id="how-it-works">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">How It Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get started in three simple steps
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step circle */}
                <div className="relative z-10 w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent p-px">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                {/* Step number */}
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-xs font-mono text-primary/60">
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
