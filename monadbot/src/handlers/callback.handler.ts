import { Context } from 'telegraf';
import { executeBuy, executeSell } from '../services/trading.service';
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
          `└── ⏱️ ${result.executionTimeMs}ms\n\n` +
          `Stop-loss koymak ister misin?\n_"${token} stop loss %15" yaz_`,
          { parse_mode: 'Markdown' },
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
          { parse_mode: 'Markdown' },
        );
      } else {
        await ctx.editMessageText(`❌ Satış başarısız: ${result.error}`);
      }
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
