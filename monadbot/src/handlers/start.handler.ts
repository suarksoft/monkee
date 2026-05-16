import { Context } from 'telegraf';
import { getOrCreateWallet, getBalance } from '../services/wallet.service';

export async function handleStart(ctx: Context) {
  const userId = ctx.from!.id.toString();
  const username = ctx.from!.username;
  const firstName = ctx.from!.first_name;

  const user = await getOrCreateWallet(userId, username, firstName);
  const balance = await getBalance(user.walletAddress);

  await ctx.reply(
    `👋 *Merhaba${firstName ? ' ' + firstName : ''}! Ben MonadBot.*\n\n` +
    `Monad'da AI ile trade yapmanı sağlıyorum.\n\n` +
    `📍 *Cüzdanın:*\n\`${user.walletAddress}\`\n\n` +
    `💰 *Bakiye:* ${balance} MON\n\n` +
    `Bu adrese MON gönder, sonra benimle konuş:\n\n` +
    `💬 *"CHOG al 5 MON"* → token al\n` +
    `💬 *"Ne almalıyım?"* → AI tavsiye\n` +
    `💬 *"Trending ne var?"* → popüler tokenlar\n` +
    `💬 *"Portföyüm"* → pozisyonların\n` +
    `💬 *"0x... cüzdanına bak"* → cüzdan analizi\n\n` +
    `Hadi başlayalım! 🚀`,
    { parse_mode: 'Markdown' },
  );
}
