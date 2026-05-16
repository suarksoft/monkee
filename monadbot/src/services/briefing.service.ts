import { PrismaClient } from '@prisma/client';
import { Telegraf, Context } from 'telegraf';
import { getPortfolio } from './trading.service';
import { getTrending } from './analytics.service';
import { generateDailyBriefing } from './ai.service';
import { log, logError } from '../utils/logger';

const prisma = new PrismaClient();

async function buildMarketSummary(): Promise<string> {
  const trending = await getTrending();
  const top = trending[0];
  if (!top) return 'Market sakin.';

  const movers = trending
    .filter(t => Math.abs(t.change) > 5)
    .map(t => `$${t.symbol} ${t.change > 0 ? '+' : ''}${t.change}%`)
    .join(', ');

  return movers.length > 0
    ? `En aktif hareketler: ${movers}`
    : `$${top.symbol} en yüksek volumede (${top.volume})`;
}

// Called from message handler (ctx available) or scheduled (bot only)
export async function sendBriefingToUser(
  botOrTelegram: Telegraf | never,
  telegramId: string,
  ctx?: Context,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    const [portfolio, trending, marketSummary] = await Promise.all([
      getPortfolio(telegramId),
      getTrending(),
      buildMarketSummary(),
    ]);

    const firstName = user.firstName || 'Trader';
    const briefing = await generateDailyBriefing(firstName, portfolio, trending, marketSummary);

    if (!briefing) return;

    const text = `🌅 *Günlük Brifing*\n\n${briefing}`;
    const opts = { parse_mode: 'Markdown' as const };

    if (ctx) {
      await ctx.reply(text, opts);
    } else {
      const bot = botOrTelegram as Telegraf;
      await bot.telegram.sendMessage(telegramId, text, opts);
    }

    log('Briefing', `Sent to ${telegramId}`);
  } catch (error) {
    logError('Briefing', `Failed for ${telegramId}`, error);
  }
}

async function sendBriefingToAll(bot: Telegraf): Promise<void> {
  const users = await prisma.user.findMany();
  log('Briefing', `Sending to ${users.length} users`);

  for (const user of users) {
    await sendBriefingToUser(bot, user.telegramId);
    // Small delay to avoid Telegram rate limits
    await new Promise(r => setTimeout(r, 300));
  }
}

function msUntilNextHour(targetHour: number): number {
  const now = new Date();
  const next = new Date();
  next.setHours(targetHour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function startDailyBriefing(bot: Telegraf, hourUTC = 6): void {
  const scheduleNext = () => {
    const delay = msUntilNextHour(hourUTC);
    const hoursUntil = (delay / 1000 / 60 / 60).toFixed(1);
    log('Briefing', `Next briefing in ${hoursUntil}h (${hourUTC}:00 UTC)`);

    setTimeout(async () => {
      await sendBriefingToAll(bot);
      scheduleNext(); // reschedule for tomorrow
    }, delay);
  };

  scheduleNext();
}
