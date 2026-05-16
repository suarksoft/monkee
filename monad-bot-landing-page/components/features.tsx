"use client";

import { motion } from "framer-motion";
import { Bot, Zap, Fish, BarChart3, Bell, Shield } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Trade Advisor",
    description: "Ask anything. Get real-time token analysis, risk scores, and AI-powered recommendations powered by Claude.",
  },
  {
    icon: Zap,
    title: "Instant Execution",
    description: "Say 'Buy CHOG for 5 MON' and the bot executes it on-chain within seconds via Monad's DEX.",
  },
  {
    icon: Fish,
    title: "Whale Monitoring",
    description: "24/7 whale wallet tracking. Get alerts when big players move — before the market reacts.",
  },
  {
    icon: BarChart3,
    title: "Token Analytics",
    description: "Deep dive into any token: live price, volume, holder distribution, honeypot risk, and AI sentiment.",
  },
  {
    icon: Bell,
    title: "Daily Briefings",
    description: "Automated morning briefings with trending tokens, market sentiment, and personalized portfolio updates.",
  },
  {
    icon: Shield,
    title: "Non-Custodial Wallet",
    description: "Your bot wallet, your keys. Fully on-chain, no middlemen, no trust required.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section className="py-24 px-4" id="features">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">Powerful Features</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Everything you need to trade smarter on Monad, powered by cutting-edge AI.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group glass-card rounded-2xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
