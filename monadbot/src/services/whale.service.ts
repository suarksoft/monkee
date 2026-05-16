import { PrismaClient } from '@prisma/client';
import { Telegraf } from 'telegraf';
import { getPriceFromPool } from './trading.service';
import { log, logError } from '../utils/logger';

const prisma = new PrismaClient();

const priceCache = new Map<string, number>();
const WHALE_THRESHOLD_PERCENT = 4;
const POLL_INTERVAL_MS = 20000;

async function getLivePriceMON(tokenAddress: string, decimals: number): Promise<number> {
  try {
    const price = await getPriceFromPool(tokenAddress, decimals);
    return parseFloat(price);
  } catch {
    return 0;
  }
}

async function notifyWhaleAlert(
  bot: Telegraf,
  symbol: string,
  tokenAddress: string,
  changePercent: number,
  direction: 'up' | 'down',
) {
  // Find users who have traded this token
  const trades = await prisma.trade.findMany({
    where: { tokenAddress: tokenAddress.toLowerCase() },
    include: { user: true },
    distinct: ['userId'],
  });

  const userIds = [...new Set(trades.map(t => t.user.telegramId))];

  if (userIds.length === 0) {
    // No specific holders — broadcast to all users
    const allUsers = await prisma.user.findMany({ take: 50 });
    userIds.push(...allUsers.map(u => u.telegramId));
  }

  const emoji = direction === 'up' ? '🚀' : '🔴';
  const action = direction === 'up' ? 'alım yapıldı' : 'satış yapıldı';
  const suggestion = direction === 'up'
    ? `\n\n💡 _Momentum var. Pozisyon açmak için: "${symbol} al 2 mon"_`
    : `\n\n⚠️ _Dikkat et. Varsa çıkmak için: "${symbol} sat hepsini"_`;

  const message =
    `${emoji} *Whale Hareketi: $${symbol}*\n\n` +
    `Büyük hacimli ${action} tespit edildi.\n` +
    `Fiyat: *${direction === 'up' ? '+' : '-'}${Math.abs(changePercent).toFixed(1)}%* hareket etti.` +
    suggestion;

  for (const telegramId of userIds) {
    try {
      await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    } catch {
      // User may have blocked the bot
    }
  }

  log('Whale', `Alert sent: ${symbol} ${direction} ${changePercent.toFixed(1)}% to ${userIds.length} users`);
}

export async function startWhaleMonitor(bot: Telegraf) {
  const tokens = await prisma.token.findMany({
    where: { symbol: { not: 'WMON' } },
  });

  if (tokens.length === 0) {
    log('Whale', 'No tokens to monitor');
    return;
  }

  // Init price cache
  for (const token of tokens) {
    const price = await getLivePriceMON(token.address, token.decimals);
    if (price > 0) priceCache.set(token.address, price);
  }

  log('Whale', `Monitoring ${tokens.length} tokens for whale activity`);

  setInterval(async () => {
    for (const token of tokens) {
      try {
        const currentPrice = await getLivePriceMON(token.address, token.decimals);
        if (currentPrice === 0) continue;

        const lastPrice = priceCache.get(token.address);

        if (lastPrice && lastPrice > 0) {
          const changePercent = ((currentPrice - lastPrice) / lastPrice) * 100;

          if (Math.abs(changePercent) >= WHALE_THRESHOLD_PERCENT) {
            const direction = changePercent > 0 ? 'up' : 'down';
            await notifyWhaleAlert(bot, token.symbol, token.address, changePercent, direction);
          }
        }

        priceCache.set(token.address, currentPrice);
      } catch (error) {
        logError('Whale', `Price check failed for ${token.symbol}`, error);
      }
    }
  }, POLL_INTERVAL_MS);
}
