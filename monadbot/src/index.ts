import dotenv from 'dotenv';
dotenv.config();

import { createBot } from './bot';
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

  await bot.launch();
  log('Bot', 'MonadBot is running!');
  log('Bot', 'Press Ctrl+C to stop');
}

main().catch((err) => {
  logError('Main', 'Failed to start bot', err);
  process.exit(1);
});
