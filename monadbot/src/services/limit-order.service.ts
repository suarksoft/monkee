import { PrismaClient } from '@prisma/client';
import { Telegraf } from 'telegraf';
import { executeBuy, executeSell } from './trading.service';
import { getProvider } from './wallet.service';
import { ROUTER_ABI } from '../utils/constants';
import { ethers } from 'ethers';
import { formatTxLink } from '../utils/formatter';
import { log, logError } from '../utils/logger';

const prisma = new PrismaClient();
const POLL_INTERVAL_MS = 15000;

interface LimitOrderParams {
  tokenSymbol: string;
  tokenAddress: string;
  side: 'BUY' | 'SELL';
  monAmount: string;
  targetPrice: string;
  condition: 'BELOW' | 'ABOVE'; // BUY when BELOW, SELL when ABOVE
}

async function getLivePrice(tokenAddress: string): Promise<number> {
  try {
    const provider = getProvider();
    const ROUTER = process.env.DEX_ROUTER_ADDRESS!;
    const WMON = process.env.WMON_ADDRESS!;
    const router = new ethers.Contract(ROUTER, ROUTER_ABI, provider);
    const oneToken = ethers.parseUnits('1', 18);
    const amounts = await router.getAmountsOut(oneToken, [tokenAddress, WMON]) as bigint[];
    return parseFloat(ethers.formatEther(amounts[1]));
  } catch {
    return 0;
  }
}

export async function createLimitOrder(
  telegramId: string,
  tokenSymbol: string,
  monAmount: string,
  targetPrice: string,
  side: 'BUY' | 'SELL',
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) throw new Error('Kullanıcı bulunamadı');

  const token = await prisma.token.findFirst({ where: { symbol: tokenSymbol.toUpperCase() } });
  if (!token) throw new Error(`$${tokenSymbol} bulunamadı`);

  const currentPrice = await getLivePrice(token.address);
  const target = parseFloat(targetPrice);
  const condition: 'BELOW' | 'ABOVE' = side === 'BUY' ? 'BELOW' : 'ABOVE';

  // Validate the order makes sense
  if (side === 'BUY' && currentPrice > 0 && currentPrice <= target) {
    throw new Error(`Şu an fiyat zaten ${currentPrice.toFixed(8)} MON — hedef fiyat ${target} MON'dan yüksek, limit order oluşturmak için hedef daha düşük olmalı.`);
  }
  if (side === 'SELL' && currentPrice > 0 && currentPrice >= target) {
    throw new Error(`Şu an fiyat zaten ${currentPrice.toFixed(8)} MON — hedef fiyat ${target} MON'dan düşük, limit order oluşturmak için hedef daha yüksek olmalı.`);
  }

  const params: LimitOrderParams = {
    tokenSymbol: tokenSymbol.toUpperCase(),
    tokenAddress: token.address,
    side,
    monAmount,
    targetPrice,
    condition,
  };

  await prisma.alert.create({
    data: {
      userId: user.id,
      type: 'LIMIT_ORDER',
      params: params as object,
      active: true,
    },
  });

  log('LimitOrder', `Created: ${side} ${tokenSymbol} @ ${targetPrice} MON for ${monAmount} MON`);
}

export async function getActiveOrders(telegramId: string) {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return [];

  return prisma.alert.findMany({
    where: { userId: user.id, type: 'LIMIT_ORDER', active: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function cancelOrder(orderId: number, telegramId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;

  await prisma.alert.updateMany({
    where: { id: orderId, userId: user.id },
    data: { active: false },
  });
}

export function startLimitOrderMonitor(bot: Telegraf): void {
  setInterval(async () => {
    try {
      const orders = await prisma.alert.findMany({
        where: { type: 'LIMIT_ORDER', active: true },
        include: { user: true },
      });

      for (const order of orders) {
        const params = order.params as unknown as LimitOrderParams;
        const currentPrice = await getLivePrice(params.tokenAddress);
        if (currentPrice === 0) continue;

        const target = parseFloat(params.targetPrice);
        const triggered =
          (params.condition === 'BELOW' && currentPrice <= target) ||
          (params.condition === 'ABOVE' && currentPrice >= target);

        if (!triggered) continue;

        // Mark as inactive first to prevent double execution
        await prisma.alert.update({ where: { id: order.id }, data: { active: false, triggeredAt: new Date() } });

        log('LimitOrder', `Triggered: ${params.side} ${params.tokenSymbol} @ ${currentPrice}`);

        try {
          let result;
          if (params.side === 'BUY') {
            result = await executeBuy(order.user.telegramId, params.tokenSymbol, params.monAmount);
          } else {
            result = await executeSell(order.user.telegramId, params.tokenSymbol, params.monAmount);
          }

          const emoji = params.side === 'BUY' ? '🟢' : '🔴';
          const action = params.side === 'BUY' ? 'Alım' : 'Satış';

          if (result.success) {
            await bot.telegram.sendMessage(
              order.user.telegramId,
              `${emoji} *Limit Order Tetiklendi!*\n\n` +
              `$${params.tokenSymbol} hedef fiyata ulaştı.\n` +
              `├── Fiyat: ${currentPrice.toFixed(8)} MON\n` +
              `├── ${action}: ${result.tokenAmount}\n` +
              `└── TX: ${formatTxLink(result.txHash)}`,
              { parse_mode: 'Markdown' },
            );
          } else {
            await bot.telegram.sendMessage(
              order.user.telegramId,
              `⚠️ *Limit Order başarısız:* ${result.error}`,
              { parse_mode: 'Markdown' },
            );
          }
        } catch (execError) {
          logError('LimitOrder', 'Execution failed', execError);
        }
      }
    } catch (error) {
      logError('LimitOrder', 'Monitor tick failed', error);
    }
  }, POLL_INTERVAL_MS);

  log('LimitOrder', 'Monitor started (15s interval)');
}
