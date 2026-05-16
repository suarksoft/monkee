import Anthropic from '@anthropic-ai/sdk';
import { ParsedIntent, Portfolio, TrendingToken, TokenAnalysis } from '../types';
import { log, logError } from '../utils/logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const INTENT_SYSTEM_PROMPT = `Sen MonadBot'sun — Monad blockchain'de çalışan bir Telegram trading bot'u.
Kullanıcının mesajını analiz et ve ne yapmak istediğini çıkar.

SADECE aşağıdaki JSON formatında cevap ver, başka hiçbir şey yazma:
{"action":"ACTION","token":"TOKEN","amount":"AMOUNT","address":"ADDRESS","percentage":"PERCENT"}

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
"merhaba" → {"action":"CHAT"}
"yardım" → {"action":"HELP"}

Token sembollerini her zaman BÜYÜK HARF yaz. Türkçe ve İngilizce mesajları anlayabilmelisin.`;

const CHAT_SYSTEM_PROMPT = `Sen MonadBot'sun. Monad blockchain'de çalışan bir Telegram trading asistanısın.
Kullanıcıyla arkadaşça, kısa konuş. Türkçe.
Trading ile ilgili sorulara cevap ver.
Monad testnet'teki aktif tokenlar: CHOG, YAKI (Moyaki), DAK (Molandak), BEAN.
Gerektiğinde kullanıcıyı yönlendir:
- Token almak için: "chog al 5 mon" yaz
- Portföy görmek için: "portföyüm" yaz
- Trending görmek için: "trending" yaz
- Tavsiye için: "ne alayım" yaz`;

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

export async function getTradeAdvice(portfolio: Portfolio, trending: TrendingToken[]): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: `Sen MonadBot'sun — Monad blockchain trading asistanısın.
Kullanıcının portföyünü ve trending tokenları analiz edip kısa, actionable tavsiye ver.
Telegram Markdown formatında yaz. Emoji kullan ama abartma.
Her zaman risk uyarısı ekle ama kısa tut.
3'ten fazla token önerme. Her öneri için neden önerdiğini 1 cümleyle açıkla.
Monad testnet tokenları: CHOG, YAKI, DAK, BEAN.
Türkçe yaz.`,
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

export async function generateTokenComment(analysis: Partial<TokenAnalysis>): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: [
        {
          type: 'text',
          text: 'Kısa (max 1 cümle) token analizi yap. Türkçe. Emoji yok. Sadece analiz.',
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
