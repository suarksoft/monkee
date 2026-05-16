interface ShareCardData {
  type: 'BUY' | 'SELL';
  tokenSymbol: string;
  monAmount: string;
  tokenAmount: string;
  txHash: string;
  executionTimeMs: number;
  pnlPercent?: number;
  entryPrice?: string;
  exitPrice?: string;
}

export function generateShareCard(data: ShareCardData): string {
  const emoji = data.type === 'BUY' ? '🟢' : '🔴';
  const action = data.type === 'BUY' ? 'ALDI' : 'SATTI';
  const speed = data.executionTimeMs < 500 ? '⚡ Ultra hızlı' : `⏱ ${data.executionTimeMs}ms`;

  const pnlLine = data.pnlPercent !== undefined
    ? `\n📈 PnL: *${data.pnlPercent > 0 ? '+' : ''}${data.pnlPercent.toFixed(1)}%*`
    : '';

  const priceLine = data.entryPrice
    ? `\n💱 Fiyat: ${parseFloat(data.entryPrice).toFixed(8)} MON`
    : '';

  return (
    `${emoji} *MonadBot ile $${data.tokenSymbol} ${action}!*\n\n` +
    `├── Miktar: ${parseFloat(data.tokenAmount).toFixed(2)} $${data.tokenSymbol}\n` +
    `├── Değer: ${parseFloat(data.monAmount).toFixed(4)} MON` +
    priceLine +
    pnlLine + '\n' +
    `├── ${speed}\n` +
    `└── 🔗 [TX'i gör](https://testnet.monadexplorer.com/tx/${data.txHash})\n\n` +
    `_@MonadBot ile sen de trade et_ 🚀\n` +
    `#Monad #MonadBot #DeFi`
  );
}

export function generateShareButton(
  type: 'BUY' | 'SELL',
  token: string,
  monAmount: string,
  tokenAmount: string,
  txHash: string,
  executionTimeMs: number,
) {
  // Encode share data as callback — keep it short
  const shortTx = txHash.slice(0, 10);
  const ms = executionTimeMs;
  return `share:${type}:${token}:${monAmount}:${tokenAmount}:${shortTx}:${ms}`;
}
