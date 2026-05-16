import { Context } from 'telegraf';
import { executeBuy, executeSell } from '../services/trading.service';
import { generatePostMortem } from '../services/ai.service';
import { cancelOrder } from '../services/limit-order.service';
import { generateShareCard } from '../services/share.service';
import { formatMON, formatTxLink } from '../utils/formatter';
import { logError } from '../utils/logger';

export async function handleCallback(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

  const data = ctx.callbackQuery.data;
  const userId = ctx.from!.id.toString();

  try {
    await ctx.answerCbQuery();

    if (data === 'cancel') {
      await ctx.editMessageText('❌ İptal edildi.');
      return;
    }

    if (data.startsWith('buy:')) {
      const [, token, amount] = data.split(':');
      await ctx.editMessageText(`⏳ $${token} alınıyor...`);

      const result = await executeBuy(userId, token, amount);

      if (result.success) {
        await ctx.editMessageText(
          `✅ *Alım tamamlandı!*\n\n` +
          `├── ${formatMON(result.tokenAmount)} $${token} aldın\n` +
          `├── TX: ${formatTxLink(result.txHash)}\n` +
          `└── ⏱️ ${result.executionTimeMs}ms`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '📢 Paylaş', callback_data: `share:BUY:${token}:${amount}:${result.tokenAmount}:${result.txHash.slice(0, 10)}:${result.executionTimeMs}` },
                { text: `🛡️ Stop-loss koy`, callback_data: `suggest_sl:${token}` },
              ]],
            },
          },
        );
      } else {
        await ctx.editMessageText(`❌ Alım başarısız: ${result.error}`);
      }
    }

    if (data.startsWith('sell:')) {
      const [, token, amount] = data.split(':');
      await ctx.editMessageText(`⏳ $${token} satılıyor...`);

      const result = await executeSell(userId, token, amount);

      if (result.success) {
        await ctx.editMessageText(
          `✅ *Satış tamamlandı!*\n\n` +
          `├── ${formatMON(result.tokenAmount)} MON aldın\n` +
          `├── TX: ${formatTxLink(result.txHash)}\n` +
          `└── ⏱️ ${result.executionTimeMs}ms`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '📢 Paylaş', callback_data: `share:SELL:${token}:${result.tokenAmount}:${amount}:${result.txHash.slice(0, 10)}:${result.executionTimeMs}` },
              ]],
            },
          },
        );

        // AI post-mortem — follow-up message
        const pmText = await generatePostMortem({
          tokenSymbol: token,
          type: 'SELL',
          monAmount: result.tokenAmount,
          tokenAmount: amount,
          executionTimeMs: result.executionTimeMs,
          txHash: result.txHash,
        });

        if (pmText) {
          await ctx.reply(`🧠 *Trade Post-Mortem:*\n\n${pmText}`, { parse_mode: 'Markdown' });
        }
      } else {
        await ctx.editMessageText(`❌ Satış başarısız: ${result.error}`);
      }
    }

    if (data.startsWith('share:')) {
      const parts = data.split(':');
      const [, type, token, monAmount, tokenAmount, shortTx, ms] = parts;
      const card = generateShareCard({
        type: type as 'BUY' | 'SELL',
        tokenSymbol: token,
        monAmount,
        tokenAmount,
        txHash: shortTx + '...',
        executionTimeMs: parseInt(ms),
      });
      await ctx.reply(card, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('suggest_sl:')) {
      const token = data.split(':')[1];
      await ctx.reply(
        `🛡️ Stop-loss koymak için yaz:\n_"${token} stop loss %15"_`,
        { parse_mode: 'Markdown' },
      );
    }

    if (data.startsWith('cancel_order:')) {
      const orderId = parseInt(data.split(':')[1]);
      await cancelOrder(orderId, userId);
      await ctx.editMessageText('✅ Limit order iptal edildi.');
    }

    if (data.startsWith('track:')) {
      const address = data.split(':')[1];
      await ctx.editMessageText(
        `🔔 *${address.slice(0, 10)}...* takibe alındı.\nHer alım/satımda bildirim alacaksın.`,
        { parse_mode: 'Markdown' },
      );
    }

    if (data.startsWith('copy:')) {
      await ctx.editMessageText(
        `📋 *Copy trading aktif!*\nBu cüzdan alım yaptığında aynısını yapacağım.`,
        { parse_mode: 'Markdown' },
      );
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    logError('Callback', 'Callback handling failed', error);
    await ctx.editMessageText(`❌ Hata: ${err.message}`);
  }
}
