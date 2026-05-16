export function formatMON(amount: string): string {
  const num = parseFloat(amount);
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatPnl(value: number): string {
  const emoji = value >= 0 ? '🟢' : '🔴';
  return `${emoji} ${formatPercent(value)}`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTxLink(txHash: string): string {
  return `[${txHash.slice(0, 10)}...](https://testnet.monadexplorer.com/tx/${txHash})`;
}

export function formatScore(score: number): string {
  if (score >= 7) return `🟢 ${score}/10`;
  if (score >= 4) return `🟡 ${score}/10`;
  return `🔴 ${score}/10`;
}

export function formatWhaleRisk(risk: string): string {
  if (risk === 'Low') return '✅ Düşük';
  if (risk === 'Medium') return '⚠️ Orta';
  return '🚨 Yüksek';
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
