import { Telegraf } from 'telegraf';
import { handleStart } from './handlers/start.handler';
import { handleMessage } from './handlers/message.handler';
import { handleCallback } from './handlers/callback.handler';
import { log } from './utils/logger';

export function createBot(): Telegraf {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

  bot.catch((err: unknown, ctx) => {
    console.error(`Bot error for ${ctx.updateType}`, err);
    ctx.reply('❌ Bir hata oluştu. Tekrar dene.').catch(() => {});
  });

  bot.start(handleStart);
  bot.help(handleMessage);
  bot.on('callback_query', handleCallback);
  bot.on('text', handleMessage);

  log('Bot', 'MonadBot initialized');
  return bot;
}
