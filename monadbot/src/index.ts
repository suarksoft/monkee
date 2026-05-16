import dotenv from 'dotenv';
dotenv.config();

import { createBot, startBackgroundServices } from './bot';
import { log, logError } from './utils/logger';

async function main() {
  const required = ['TELEGRAM_BOT_TOKEN', 'ANTHROPIC_API_KEY', 'MONAD_RPC_URL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing env: ${key}`);
    }
  }

  const bot = createBot();

  process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(0); });
  process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });

  // Launch bot (non-blocking) then start background services
  bot.launch().catch((err) => logError('Bot', 'Launch error', err));
  log('Bot', 'MonadBot is running!');

  // Wait a tick for bot to connect, then start services
  setTimeout(() => {
    startBackgroundServices(bot).catch((err) => logError('Bot', 'Background services error', err));
  }, 2000);
}

main().catch((err) => {
  logError('Main', 'Failed to start bot', err);
  process.exit(1);
});
