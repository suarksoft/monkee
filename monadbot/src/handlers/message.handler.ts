import { Context } from 'telegraf';
import { parseIntent, getTradeAdvice, chatResponse } from '../services/ai.service';
import { executeBuy, executeSell, getPortfolio } from '../services/trading.service';
import { analyzeToken, getTrending, analyzeWallet } from '../services/analytics.service';
import { sendBriefingToUser } from '../services/briefing.service';
import { createLimitOrder, getActiveOrders, cancelOrder } from '../services/limit-order.service';
import { getBalance, getWallet } from '../services/wallet.service';
import {
  formatMON,
  formatPercent,
  formatScore,
  formatWhaleRisk,
  shortenAddress,
} from '../utils/formatter';
import { logError } from '../utils/logger';

function detectLang(text: string): string {
  if (/[çğışöüÇĞİŞÖÜ]/.test(text)) return 'Turkish';
  if (/[a-zA-Z]{3,}/.test(text)) return 'English';
  return 'Turkish';
}

export async function handleMessage(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) return;

  const userId = ctx.from!.id.toString();
  const message = ctx.message.text;
  const lang = detectLang(message);

  if (message.startsWith('/')) return;

  try {
    await ctx.sendChatAction('typing');

    const intent = await parseIntent(message);

    switch (intent.action) {
      case 'BUY':
        await handleBuy(ctx, intent.token!, intent.amount || '1', lang);
        break;
      case 'SELL':
        await handleSell(ctx, intent.token!, intent.amount || 'all', lang);
        break;
      case 'PORTFOLIO':
        await handlePortfolio(ctx, userId);
        break;
      case 'BALANCE':
        await handleBalance(ctx, userId);
        break;
      case 'TRENDING':
        await handleTrending(ctx);
        break;
      case 'ANALYZE_TOKEN':
        await handleAnalyzeToken(ctx, intent.token!, lang);
        break;
      case 'ANALYZE_WALLET':
        await handleAnalyzeWallet(ctx, intent.address!, lang);
        break;
      case 'ADVICE':
        await handleAdvice(ctx, userId, lang);
        break;
      case 'SNIPER_ON':
        await ctx.reply('🎯 *Sniper modu açıldı!*\nYeni token çıktığında bildireceğim.', { parse_mode: 'Markdown' });
        break;
      case 'SNIPER_OFF':
        await ctx.reply('🎯 Sniper modu kapatıldı.', { parse_mode: 'Markdown' });
        break;
      case 'HELP':
        await handleHelp(ctx);
        break;
      case 'BRIEFING':
        await ctx.sendChatAction('typing');
        await sendBriefingToUser(null as never, userId, ctx);
        break;
      case 'LIMIT_ORDER':
        await handleLimitOrder(ctx, userId, intent.token!, intent.amount || '1', intent.targetPrice!, intent.amount === 'all' ? 'SELL' : 'BUY');
        break;
      case 'MY_ORDERS':
        await handleMyOrders(ctx, userId);
        break;
      case 'STOP_LOSS':
        await ctx.reply(
          `🛡️ *Stop-loss ayarlandı*\n$${intent.token} → -%${intent.percentage} düşerse otomatik satılacak.`,
          { parse_mode: 'Markdown' },
        );
        break;
      case 'TAKE_PROFIT':
        await ctx.reply(
          `🎯 *Take-profit ayarlandı*\n$${intent.token} → +%${intent.percentage} çıkarsa otomatik satılacak.`,
          { parse_mode: 'Markdown' },
        );
        break;
      case 'CHAT':
      default: {
        const response = await chatResponse(message);
        await ctx.reply(response, { parse_mode: 'Markdown' });
      }
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    logError('Handler', 'Message handling failed', error);
    await ctx.reply(`❌ Hata: ${err.message || 'Bir şeyler ters gitti. Tekrar dene.'}`);
  }
}

async function handleBuy(ctx: Context, token: string, amount: string, lang = 'Turkish') {
  try {
    const analysis = await analyzeToken(token, lang);

    await ctx.reply(
      `🔍 *$${token}* analiz ediyorum...\n\n` +
      `📊 *Güven:* ${formatScore(analysis.score)}\n` +
      `├── Fiyat: ${analysis.price} MON\n` +
      `├── Volume 24h: ${analysis.volume24h}\n` +
      `├── Holders: ${analysis.holderCount}\n` +
      `├── Whale riski: ${formatWhaleRisk(analysis.whaleRisk)}\n` +
      `└── 🤖 _"${analysis.aiComment}"_\n\n` +
      `💰 *${amount} MON* ile alıyorum\n\n` +
      `Onaylıyor musun?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Al', callback_data: `buy:${token}:${amount}` },
            { text: '❌ İptal', callback_data: 'cancel' },
          ]],
        },
      },
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    await ctx.reply(`❌ $${token} analiz edilemedi: ${err.message}`);
  }
}

async function handleSell(ctx: Context, token: string, amount: string, lang = 'Turkish') {
  await ctx.reply(
    `📤 *$${token}* satmak istiyorsun.\n` +
    `Miktar: ${amount === 'all' ? 'Tamamını' : amount}\n\n` +
    `Onaylıyor musun?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Sat', callback_data: `sell:${token}:${amount}` },
          { text: '❌ İptal', callback_data: 'cancel' },
        ]],
      },
    },
  );
}

async function handlePortfolio(ctx: Context, userId: string) {
  const portfolio = await getPortfolio(userId);

  let positionText = '';
  if (portfolio.positions.length > 0) {
    positionText = portfolio.positions.map(p =>
      `├── $${p.symbol}: ${formatMON(p.tokenAmount)} token • ${formatPercent(p.pnl)}`,
    ).join('\n');
  } else {
    positionText = '├── Henüz pozisyon yok';
  }

  await ctx.reply(
    `📊 *Portföyün:*\n\n` +
    `💰 Toplam: *${formatMON(portfolio.totalValue)} MON*\n\n` +
    `📈 Pozisyonlar:\n${positionText}\n` +
    `└── Serbest: ${formatMON(portfolio.freeBalance)} MON\n\n` +
    `🏆 ${portfolio.totalTrades} trade | Win rate: %${portfolio.winRate}`,
    { parse_mode: 'Markdown' },
  );
}

async function handleBalance(ctx: Context, userId: string) {
  const user = await getWallet(userId);
  const balance = await getBalance(user.walletAddress);

  await ctx.reply(
    `💰 *Bakiyen:* ${balance} MON\n📍 \`${user.walletAddress}\``,
    { parse_mode: 'Markdown' },
  );
}

async function handleTrending(ctx: Context) {
  const trending = await getTrending();

  const list = trending.map(t => {
    const emoji = t.score >= 7 ? '🟢' : t.score >= 4 ? '🟡' : '🔴';
    return (
      `${emoji} *$${t.symbol}* (${t.score}/10)\n` +
      `   Vol: ${t.volume} | ${t.holders} holder | ${t.change > 0 ? '+' : ''}${t.change}%\n` +
      `   _${t.aiComment}_`
    );
  }).join('\n\n');

  await ctx.reply(
    `🔥 *Trending on Monad:*\n\n${list}\n\n` +
    `Almak istediğin varsa: _"CHOG al 5 MON"_ yaz`,
    { parse_mode: 'Markdown' },
  );
}

async function handleAnalyzeToken(ctx: Context, token: string, lang = 'Turkish') {
  const analysis = await analyzeToken(token, lang);

  await ctx.reply(
    `🔍 *$${token} Analizi:*\n\n` +
    `📊 Güven: ${formatScore(analysis.score)}\n` +
    `├── Fiyat: ${analysis.price} MON\n` +
    `├── Volume 24h: ${analysis.volume24h}\n` +
    `├── Holders: ${analysis.holderCount}\n` +
    `├── Top holder: %${analysis.topHolderPercent}\n` +
    `├── Whale riski: ${formatWhaleRisk(analysis.whaleRisk)}\n` +
    `├── Honeypot: ${analysis.honeypotRisk ? '🚨 Evet' : '✅ Hayır'}\n` +
    `└── 🤖 _"${analysis.aiComment}"_\n\n` +
    `Almak istersen: _"${token} al 5 MON"_ yaz`,
    { parse_mode: 'Markdown' },
  );
}

async function handleAnalyzeWallet(ctx: Context, address: string, lang = 'Turkish') {
  await ctx.sendChatAction('typing');
  const analysis = await analyzeWallet(address, lang);

  const holdings = analysis.currentHoldings.map(h =>
    `├── $${h.symbol}: ${h.value} (${h.pnl})`,
  ).join('\n');

  await ctx.reply(
    `🔍 *Cüzdan Analizi:*\n\n` +
    `📍 \`${shortenAddress(analysis.address)}\`\n\n` +
    `├── Trades: ${analysis.totalTrades}\n` +
    `├── Win rate: %${analysis.winRate}\n` +
    `├── En iyi: $${analysis.bestTrade.token} (+${analysis.bestTrade.pnl}%)\n` +
    `├── Ort. hold: ${analysis.avgHoldTime}\n` +
    `└── Profil: ${analysis.riskProfile}\n\n` +
    `📦 Holdings:\n${holdings}\n\n` +
    `🔔 Takip etmek ister misin?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🔔 Takip et', callback_data: `track:${address}` },
          { text: '📋 Copy trade', callback_data: `copy:${address}` },
        ]],
      },
    },
  );

  if (analysis.dnaText) {
    await ctx.reply(
      `🧬 *Wallet DNA:*\n\n${analysis.dnaText}`,
      { parse_mode: 'Markdown' },
    );
  }
}

async function handleAdvice(ctx: Context, userId: string, lang = 'Turkish') {
  await ctx.sendChatAction('typing');
  const portfolio = await getPortfolio(userId);
  const trending = await getTrending();
  const advice = await getTradeAdvice(portfolio, trending, lang);

  await ctx.reply(
    `🤖 *AI Tavsiye:*\n\n${advice}`,
    { parse_mode: 'Markdown' },
  );
}

async function handleLimitOrder(
  ctx: Context,
  userId: string,
  token: string,
  amount: string,
  targetPrice: string,
  side: 'BUY' | 'SELL',
) {
  if (!targetPrice) {
    await ctx.reply('❌ Hedef fiyat belirtmelisin.\nÖrnek: _"CHOG 0.0003\'e düşünce 5 MON al"_', { parse_mode: 'Markdown' });
    return;
  }

  try {
    // Detect side from context: if price is below current → BUY, above → SELL
    await createLimitOrder(userId, token, amount, targetPrice, side);

    const emoji = side === 'BUY' ? '🟢' : '🔴';
    const actionText = side === 'BUY' ? `${amount} MON ile alınacak` : `${amount === 'all' ? 'tamamı' : amount} satılacak`;

    await ctx.reply(
      `${emoji} *Limit Order Oluşturuldu!*\n\n` +
      `├── Token: $${token}\n` +
      `├── Hedef fiyat: ${targetPrice} MON\n` +
      `├── İşlem: ${actionText}\n` +
      `└── Durum: ⏳ Bekliyor\n\n` +
      `_Fiyat hedefe ulaştığında otomatik işlem yapılacak._\n` +
      `Emirlerini görmek için: "emirlerim" yaz`,
      { parse_mode: 'Markdown' },
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    await ctx.reply(`❌ ${err.message}`);
  }
}

async function handleMyOrders(ctx: Context, userId: string) {
  const orders = await getActiveOrders(userId);

  if (orders.length === 0) {
    await ctx.reply('📋 Aktif limit order yok.\n\nOluşturmak için: _"CHOG 0.0003\'e düşünce 5 MON al"_', { parse_mode: 'Markdown' });
    return;
  }

  const list = orders.map((o, i) => {
    const p = o.params as { tokenSymbol: string; side: string; targetPrice: string; monAmount: string };
    const emoji = p.side === 'BUY' ? '🟢' : '🔴';
    return `${i + 1}. ${emoji} $${p.tokenSymbol} @ ${p.targetPrice} MON → ${p.side === 'BUY' ? p.monAmount + ' MON al' : p.monAmount + ' sat'}`;
  }).join('\n');

  const buttons = orders.map((o, i) => [{
    text: `❌ #${i + 1} iptal`,
    callback_data: `cancel_order:${o.id}`,
  }]);

  await ctx.reply(
    `📋 *Aktif Emirlerin (${orders.length}):*\n\n${list}`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    },
  );
}

async function handleHelp(ctx: Context) {
  await ctx.reply(
    `📖 *MonadBot Yardım*\n\n` +
    `Benimle doğal konuşabilirsin:\n\n` +
    `💬 *Trading:*\n` +
    `├── "CHOG al 5 MON"\n` +
    `├── "CHOG sat hepsini"\n` +
    `├── "CHOG sat 50%"\n` +
    `└── "CHOG'a stop loss %15"\n\n` +
    `⏰ *Limit Order:*\n` +
    `├── "CHOG 0.0003'e düşünce 5 MON al"\n` +
    `├── "YAKI 0.02 olunca sat hepsini"\n` +
    `└── "emirlerim"\n\n` +
    `📊 *Analiz:*\n` +
    `├── "CHOG nasıl"\n` +
    `├── "Trending ne var"\n` +
    `├── "Ne almalıyım"\n` +
    `└── "0x... cüzdanına bak"\n\n` +
    `💼 *Portföy:*\n` +
    `├── "Portföyüm"\n` +
    `├── "Bakiyem"\n` +
    `└── "Cüzdanım"\n\n` +
    `🎯 *Sniper:*\n` +
    `├── "Sniper aç"\n` +
    `└── "Sniper kapat"\n\n` +
    `Aklına ne gelirse yaz, ben anlarım! 🧠`,
    { parse_mode: 'Markdown' },
  );
}
