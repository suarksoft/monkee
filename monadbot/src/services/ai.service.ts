import Anthropic from '@anthropic-ai/sdk';
import { ParsedIntent, Portfolio, TrendingToken, TokenAnalysis, TradePostMortem, WalletDNA } from '../types';
import { log, logError } from '../utils/logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const INTENT_SYSTEM_PROMPT = `Sen MonadBot'sun — Monad blockchain'de çalışan bir Telegram trading bot'u.
Kullanıcının mesajını analiz et ve ne yapmak istediğini çıkar.

SADECE aşağıdaki JSON formatında cevap ver, başka hiçbir şey yazma:
{"action":"ACTION","token":"TOKEN","amount":"AMOUNT","address":"ADDRESS","percentage":"PERCENT","targetPrice":"PRICE"}

Olası action'lar:
- BUY → kullanıcı token almak istiyor (token ve amount gerekli)
- SELL → kullanıcı token satmak istiyor (token gerekli, amount opsiyonel, "all/hepsini" = tamamını sat)
- PORTFOLIO → kullanıcı portföyünü görmek istiyor
- TRENDING → kullanıcı trending/popüler tokenları görmek istiyor
- ANALYZE_TOKEN → kullanıcı bir token hakkında bilgi istiyor
- ANALYZE_WALLET → kullanıcı bir cüzdan adresi analiz etmek istiyor (address gerekli)
- SNIPER_ON → kullanıcı sniper modunu açmak istiyor
- SNIPER_OFF → kullanıcı sniper modunu kapatmak istiyor
- ADVICE → kullanıcı ne yapması gerektiğini soruyor
- STOP_LOSS → kullanıcı stop loss koymak istiyor (token ve percentage gerekli)
- TAKE_PROFIT → kullanıcı take profit koymak istiyor (token ve percentage gerekli)
- LIMIT_ORDER → kullanıcı belirli fiyatta otomatik alım/satım istiyor (token, amount, targetPrice gerekli)
- MY_ORDERS → kullanıcı aktif emirlerini görmek istiyor
- BALANCE → kullanıcı bakiyesini öğrenmek istiyor
- HELP → kullanıcı yardım istiyor
- CHAT → yukarıdakilerin hiçbirine uymayan genel sohbet

Örnekler:
"chog al 5 mon" → {"action":"BUY","token":"CHOG","amount":"5"}
"chog al" → {"action":"BUY","token":"CHOG","amount":"1"}
"5 monluk chog al" → {"action":"BUY","token":"CHOG","amount":"5"}
"10 mon chog al" → {"action":"BUY","token":"CHOG","amount":"10"}
"chog sat hepsini" → {"action":"SELL","token":"CHOG","amount":"all"}
"chog sat 50%" → {"action":"SELL","token":"CHOG","amount":"50%"}
"portföyüm" → {"action":"PORTFOLIO"}
"portföyüm nasıl" → {"action":"PORTFOLIO"}
"cüzdanım" → {"action":"BALANCE"}
"ne alayım" → {"action":"ADVICE"}
"trending" → {"action":"TRENDING"}
"trend ne" → {"action":"TRENDING"}
"popüler tokenlar" → {"action":"TRENDING"}
"chog analiz et" → {"action":"ANALYZE_TOKEN","token":"CHOG"}
"chog nasıl" → {"action":"ANALYZE_TOKEN","token":"CHOG"}
"yaki nasıl" → {"action":"ANALYZE_TOKEN","token":"YAKI"}
"dak al 2 mon" → {"action":"BUY","token":"DAK","amount":"2"}
"0xabc123 cüzdanına bak" → {"action":"ANALYZE_WALLET","address":"0xabc123"}
"sniper aç" → {"action":"SNIPER_ON"}
"sniper kapat" → {"action":"SNIPER_OFF"}
"chog'a stop loss %15" → {"action":"STOP_LOSS","token":"CHOG","percentage":"15"}
"chog take profit %50" → {"action":"TAKE_PROFIT","token":"CHOG","percentage":"50"}
"chog 0.0003'e düşünce 5 mon al" → {"action":"LIMIT_ORDER","token":"CHOG","amount":"5","targetPrice":"0.0003"}
"chog 0.001 olunca al 2 mon" → {"action":"LIMIT_ORDER","token":"CHOG","amount":"2","targetPrice":"0.001"}
"yaki 0.005'e çıkınca sat hepsini" → {"action":"LIMIT_ORDER","token":"YAKI","amount":"all","targetPrice":"0.005"}
"emirlerim" → {"action":"MY_ORDERS"}
"aktif emirlerim" → {"action":"MY_ORDERS"}
"merhaba" → {"action":"CHAT"}
"yardım" → {"action":"HELP"}
"sabah özeti" → {"action":"BRIEFING"}
"brifing" → {"action":"BRIEFING"}
"günlük özet" → {"action":"BRIEFING"}

Token sembollerini her zaman BÜYÜK HARF yaz. Türkçe ve İngilizce mesajları anlayabilmelisin.`;

const CHAT_SYSTEM_PROMPT = `You are MonadBot, a Telegram trading assistant running on Monad blockchain.
Be friendly and concise. ALWAYS respond in the exact same language the user writes in — if they write Turkish, reply in Turkish; if English, reply in English; etc.
Answer trading-related questions.
Active tokens on Monad testnet: CHOG, YAKI (Moyaki), DAK (Molandak), BEAN.
Guide the user when needed:
- To buy a token: write "buy chog 5 mon" or "chog al 5 mon"
- To see portfolio: write "portfolio" or "portföyüm"
- To see trending: write "trending"
- For advice: write "what should I buy" or "ne alayım"`;

export async function parseIntent(message: string): Promise<ParsedIntent> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: [
        {
          type: 'text',
          text: INTENT_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{ role: 'user', content: message }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as ParsedIntent;

    log('AI', `Intent: "${message}" → ${parsed.action}`, parsed);
    return parsed;
  } catch (error) {
    logError('AI', 'Intent parse failed', error);
    return { action: 'CHAT' };
  }
}

export async function getTradeAdvice(portfolio: Portfolio, trending: TrendingToken[], lang = 'Turkish'): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: `You are MonadBot — a Monad blockchain trading assistant.
Analyze the user's portfolio and trending tokens and give short, actionable advice.
Write in Telegram Markdown format. Use emojis but don't overdo it.
Always add a brief risk warning.
Don't suggest more than 3 tokens. Explain each suggestion in 1 sentence.
Monad testnet tokens: CHOG, YAKI, DAK, BEAN.
IMPORTANT: Respond in ${lang}.`,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{
        role: 'user',
        content: `Portföy:\n${JSON.stringify(portfolio, null, 2)}\n\nTrending:\n${JSON.stringify(trending, null, 2)}\n\nNe yapmalıyım?`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : 'Analiz yapılamadı.';
  } catch (error) {
    logError('AI', 'Advice failed', error);
    return '🤖 Şu an analiz yapamıyorum, biraz sonra tekrar dene.';
  }
}

export async function generateTokenComment(analysis: Partial<TokenAnalysis>, lang = 'Turkish'): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: [
        {
          type: 'text',
          text: `Write a short (max 1 sentence) token analysis. No emojis. Analysis only. Respond in ${lang}.`,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{
        role: 'user',
        content: `Token: ${analysis.symbol} | Volume: ${analysis.volume24h} MON | Holder: ${analysis.holderCount} | Top holder: %${analysis.topHolderPercent} | Whale risk: ${analysis.whaleRisk}`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text.trim() : 'Yeterli veri yok.';
  } catch (error) {
    logError('AI', 'Token comment failed', error);
    return 'Yeterli veri yok.';
  }
}

export async function chatResponse(message: string): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: [
        {
          type: 'text',
          text: CHAT_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{ role: 'user', content: message }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '🤖 Anlamadım, tekrar yazar mısın?';
  } catch (error) {
    logError('AI', 'Chat failed', error);
    return '🤖 Bir hata oluştu, tekrar dene.';
  }
}

export async function generatePostMortem(pm: TradePostMortem, lang = 'Turkish'): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: [
        {
          type: 'text',
          text: `You are a crypto trading coach. Analyze the user's trade and write a short, honest post-mortem.
Use Telegram Markdown format. Highlight strengths and areas to improve.
Use a positive but realistic tone. Max 5 lines. Respond in ${lang}.`,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{
        role: 'user',
        content: `Trade: ${pm.type} $${pm.tokenSymbol}
MON miktarı: ${pm.monAmount}
Token miktarı: ${pm.tokenAmount}
${pm.pnlPercent !== undefined ? `PnL: ${pm.pnlPercent > 0 ? '+' : ''}${pm.pnlPercent.toFixed(1)}%` : ''}
${pm.entryPrice ? `Giriş fiyatı: ${pm.entryPrice}` : ''}
${pm.exitPrice ? `Çıkış fiyatı: ${pm.exitPrice}` : ''}
Execution süresi: ${pm.executionTimeMs}ms`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error) {
    logError('AI', 'Post-mortem failed', error);
    return '';
  }
}

export async function generateWalletDNA(dna: WalletDNA, lang = 'Turkish'): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: [
        {
          type: 'text',
          text: `You are a crypto trader psychologist. Extract a personality profile from wallet statistics.
Use Telegram Markdown format. Be creative and original — use archetypes like "Early Degen", "Patient Whale", "FOMO Hunter".
Clearly state strengths and weaknesses. Make it feel specific and personal. Respond in ${lang}.`,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{
        role: 'user',
        content: `Adres: ${dna.address}
Toplam trade: ${dna.totalTrades}
Win rate: %${dna.winRate}
Ortalama holding süresi: ${dna.avgHoldTimeHours} saat
En çok işlem yapılan token: ${dna.favoriteToken}
Toplam PnL: ${dna.totalPnlMon} MON
Trade sıklığı: ${dna.tradeFrequency}`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error) {
    logError('AI', 'Wallet DNA failed', error);
    return '';
  }
}

export async function generateDailyBriefing(
  firstName: string,
  portfolio: Portfolio,
  trending: TrendingToken[],
  marketSummary: string,
  lang = 'Turkish',
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: `You are MonadBot. Every morning you send users a personalized market briefing.
Use Telegram Markdown format. Be friendly and energetic.
Include portfolio status, key opportunities, and today's recommendations.
Max 10 lines, clear and actionable. Respond in ${lang}.`,
          cache_control: { type: 'ephemeral' },
        },
      ] as Anthropic.Messages.TextBlockParam[],
      messages: [{
        role: 'user',
        content: `Kullanıcı: ${firstName}
Portföy değeri: ${portfolio.totalValue} MON
Serbest bakiye: ${portfolio.freeBalance} MON
Pozisyonlar: ${portfolio.positions.length > 0 ? portfolio.positions.map(p => `${p.symbol}: ${p.tokenAmount}`).join(', ') : 'Yok'}
Win rate: %${portfolio.winRate}
Market özeti: ${marketSummary}
Trending tokenlar: ${trending.map(t => `${t.symbol} (${t.change > 0 ? '+' : ''}${t.change}%)`).join(', ')}`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error) {
    logError('AI', 'Daily briefing failed', error);
    return '';
  }
}
