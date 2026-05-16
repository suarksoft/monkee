# MonadBot 🤖

**The AI-powered Telegram trading bot for Monad.** Talk to it like a friend, trade like a pro.

---

## What is MonadBot?

MonadBot is an AI trading assistant that lives inside Telegram. It lets you buy and sell tokens on Monad by just typing what you want — in plain language, no commands, no UI, no wallet extensions.

Just open Telegram, type *"buy 5 MON worth of CHOG"*, and MonadBot handles the rest. It manages your wallet, executes the swap on-chain, and gives you a trade recap powered by AI.

No clicking through DEX interfaces. No copy-pasting contract addresses. Just chat.

---

## Why should you use it?

**Natural language trading:** Type "chog al 5 mon" or "buy chog 5 mon" — MonadBot understands both Turkish and English and figures out what you mean.

**AI trade coaching:** After every sell, MonadBot writes a short post-mortem: what you did right, what you could improve, and your PnL — like having a trading coach in your pocket.

**Wallet DNA:** Ask MonadBot to analyze any wallet address and it generates a trader personality profile — "Early Degen", "Patient Whale", "FOMO Hunter" — based on on-chain behavior.

**Whale radar:** MonadBot tracks whale wallets in real-time and alerts you when smart money is moving. Know before the crowd.

**Morning briefing:** Every morning, MonadBot sends you a personalized market summary — portfolio status, trending tokens, and today's top opportunities.

**Sniper mode:** Enable auto-buy on new token listings. MonadBot watches the mempool and executes the moment a new token launches.

**Stop loss / Take profit:** Set your exits in plain language. *"chog stop loss %15"* — MonadBot monitors and executes automatically.

---

## How it works

```
You type a message in Telegram
        |
MonadBot sends it to Claude (AI) for intent parsing
        |
Claude identifies: BUY / SELL / ANALYZE / ADVICE / CHAT / ...
        |
MonadBot executes on-chain via MonadBotSwapper contract
        |
Swap confirmed on Monad in <1 second
        |
AI generates a trade recap + post-mortem
        |
You see the result in Telegram
```

Supported actions: `BUY` · `SELL` · `PORTFOLIO` · `TRENDING` · `ANALYZE_TOKEN` · `ANALYZE_WALLET` · `SNIPER_ON/OFF` · `STOP_LOSS` · `TAKE_PROFIT` · `BALANCE` · `BRIEFING` · `ADVICE`

---

## What does this bring to Monad?

**DeFi onboarding:** A first-time crypto user can make their first trade via Telegram without ever seeing a wallet extension or a DEX UI. That is a genuinely new user on Monad.

**AI + Blockchain convergence:** MonadBot is a real example of an AI agent (Claude) deciding and routing on-chain transactions based on unstructured human input — not a button click, but a conversation.

**Speed showcase:** Monad's sub-second finality is what makes this feel instant. The bot confirms swaps before the user finishes reading the response. That experience is only possible on Monad.

**Composable fee layer:** MonadBotSwapper is a standalone smart contract that other Telegram bots or frontends can plug into — a shared swap infrastructure for the Monad ecosystem.

**Always-on liquidity routing:** MonadBot keeps routing trades 24/7, adding consistent volume and liquidity utilization across Monad DEX pools.

---

## Meet Monke

Monke is MonadBot's AI brain — powered by Claude (Anthropic). Monke can:

- Parse any trade intent from natural language (Turkish, English, or a mix)
- Give personalized buy/sell recommendations based on your portfolio and market trends
- Write honest, human trade post-mortems after every sell
- Generate trader personality profiles from on-chain wallet data
- Brief you every morning on what the market looks like and what to watch

Monke gets smarter as the conversation continues. The more you trade, the better its advice becomes.

---

## Future Plans

MonadBot is a working prototype on Monad Testnet. Here's where it's going:

**More tokens:** Auto-discover new token launches and add them without any manual config.

**Smarter Monke:** Feed Monke real-time price feeds, historical PnL data, and on-chain signals for better, data-grounded advice.

**Copy trading:** Follow a wallet address and automatically mirror its trades within your own risk limits.

**Group bots:** Deploy MonadBot in a Telegram group — everyone in the group can trade from the same chat, see each other's calls, and compete on a leaderboard.

**Gasless trades:** Meta-transactions so users never think about gas.

**Multi-chain:** The same bot architecture, extended to other EVM chains as the Monad ecosystem expands.

Our vision: make on-chain trading as easy as texting a friend — with the speed of Monad and the intelligence of AI.

---

## Contract Addresses (Monad Testnet)

| Contract | Address |
|---|---|
| MonadBotSwapper | `0x...` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Bot interface | Telegram (Telegraf) |
| AI engine | Claude by Anthropic (Haiku + Sonnet) |
| Blockchain | Monad Testnet (EVM) |
| Smart contract | Solidity — MonadBotSwapper |
| On-chain execution | Ethers.js |
| Database | PostgreSQL + Prisma |
| Language | TypeScript |
| Deployment | Docker / Railway |

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-repo/monadbot
cd monadbot/monadbot

# Install
npm install

# Configure
cp .env.example .env
# Fill in: TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY, DATABASE_URL, DEX_ROUTER_ADDRESS, WMON_ADDRESS

# Database
npm run prisma:push
npm run prisma:generate

# Run
npm run dev
```

---

Built for the Monad hackathon · Powered by Claude AI · Running on Monad Testnet
