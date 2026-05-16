import { Context } from 'telegraf';
import { parseIntent, getTradeAdvice, chatResponse } from '../services/ai.service';
import { executeBuy, executeSell, getPortfolio } from '../services/trading.service';
import { analyzeToken, getTrending, analyzeWallet } from '../services/analytics.service';
import { getBalance, getWallet } from '../services/wallet.service';
import {
  formatMON,
  formatPercent,
  formatScore,
  formatWhaleRisk,
  shortenAddress,
} from '../utils/formatter';
import { logError } from '../utils/logger';

export async function handleMessage(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) return;

  const userId = ctx.from!.id.toString();
  const message = ctx.message.text;

  if (message.startsWith('/')) return;

  try {
    await ctx.sendChatAction('typing');

    const intent = await parseIntent(message);

    switch (intent.action) {
      case 'BUY':
        await handleBuy(ctx, intent.token!, intent.amount || '1');
        break;
      case 'SELL':
        await handleSell(ctx, intent.token!, intent.amount || 'all');
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
        await handleAnalyzeToken(ctx, intent.token!);
        break;
      case 'ANALYZE_WALLET':
        await handleAnalyzeWallet(ctx, intent.address!);
        break;
      case 'ADVICE':
        await handleAdvice(ctx, userId);
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

async function handleBuy(ctx: Context, token: string, amount: string) {
  try {
    const analysis = await analyzeToken(token);

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

async function handleSell(ctx: Context, token: string, amount: string) {
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

async function handleAnalyzeToken(ctx: Context, token: string) {
  const analysis = await analyzeToken(token);

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

async function handleAnalyzeWallet(ctx: Context, address: string) {
  const analysis = await analyzeWallet(address);

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
}

async function handleAdvice(ctx: Context, userId: string) {
  await ctx.sendChatAction('typing');
  const portfolio = await getPortfolio(userId);
  const trending = await getTrending();
  const advice = await getTradeAdvice(portfolio, trending);

  await ctx.reply(
    `🤖 *AI Tavsiye:*\n\n${advice}`,
    { parse_mode: 'Markdown' },
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
