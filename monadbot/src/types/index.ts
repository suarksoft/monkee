export interface ParsedIntent {
  action: 'BUY' | 'SELL' | 'PORTFOLIO' | 'TRENDING' | 'ANALYZE_TOKEN' | 'ANALYZE_WALLET' | 'SNIPER_ON' | 'SNIPER_OFF' | 'ADVICE' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'HELP' | 'CHAT' | 'BALANCE';
  token?: string;
  amount?: string;
  address?: string;
  percentage?: string;
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
