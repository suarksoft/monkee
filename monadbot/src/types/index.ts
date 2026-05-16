export interface ParsedIntent {
  action: 'BUY' | 'SELL' | 'PORTFOLIO' | 'TRENDING' | 'ANALYZE_TOKEN' | 'ANALYZE_WALLET' | 'SNIPER_ON' | 'SNIPER_OFF' | 'ADVICE' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'HELP' | 'CHAT' | 'BALANCE' | 'BRIEFING' | 'LIMIT_ORDER' | 'MY_ORDERS';
  token?: string;
  amount?: string;
  address?: string;
  percentage?: string;
  targetPrice?: string;
}

export interface TradePostMortem {
  tokenSymbol: string;
  type: 'BUY' | 'SELL';
  monAmount: string;
  tokenAmount: string;
  entryPrice?: string;
  exitPrice?: string;
  pnlPercent?: number;
  executionTimeMs: number;
  txHash: string;
}

export interface WalletDNA {
  address: string;
  totalTrades: number;
  winRate: number;
  avgHoldTimeHours: number;
  favoriteToken: string;
  totalPnlMon: number;
  tradeFrequency: string;
}

export interface TokenAnalysis {
  symbol: string;
  address: string;
  price: string;
  volume24h: string;
  volumeChange: string;
  holderCount: number;
  topHolderPercent: number;
  whaleRisk: 'Low' | 'Medium' | 'High';
  honeypotRisk: boolean;
  score: number;
  aiComment: string;
  estimatedTokens: string;
}

export interface WalletAnalysis {
  address: string;
  totalTrades: number;
  winRate: number;
  bestTrade: { token: string; pnl: number };
  avgHoldTime: string;
  riskProfile: string;
  currentHoldings: { symbol: string; value: string; pnl: string }[];
}

export interface Portfolio {
  totalValue: string;
  totalPnl: number;
  freeBalance: string;
  positions: {
    symbol: string;
    tokenAmount: string;
    value: string;
    pnl: number;
    entryPrice: string;
    currentPrice: string;
  }[];
  totalTrades: number;
  winRate: number;
}

export interface TrendingToken {
  symbol: string;
  address: string;
  score: number;
  volume: string;
  holders: number;
  change: number;
  aiComment: string;
}

export interface TradeResult {
  success: boolean;
  tokenAmount: string;
  txHash: string;
  executionTimeMs: number;
  error?: string;
}
