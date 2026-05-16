import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { ROUTER_ABI, SWAPPER_ABI, ERC20_ABI, TRADING_DEFAULTS } from '../utils/constants';
import { getSigner, getProvider, getBalance } from './wallet.service';
import { TradeResult, Portfolio } from '../types';
import { log, logError } from '../utils/logger';

const prisma = new PrismaClient();
const ROUTER = process.env.DEX_ROUTER_ADDRESS!;
const WMON = process.env.WMON_ADDRESS!;
// Use swapper contract if deployed, otherwise fall back to direct DEX
const SWAPPER = process.env.SWAPPER_ADDRESS;

export async function executeBuy(
  telegramId: string,
  tokenSymbol: string,
  monAmount: string,
): Promise<TradeResult> {
  const startTime = Date.now();

  try {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new Error('Wallet bulunamadı');

    const token = await prisma.token.findFirst({
      where: { symbol: tokenSymbol.toUpperCase() },
    });
    if (!token) throw new Error(`$${tokenSymbol} token'ı bulunamadı`);

    const balance = await getBalance(user.walletAddress);
    if (parseFloat(balance) < parseFloat(monAmount)) {
      throw new Error(`Yetersiz bakiye. ${balance} MON var, ${monAmount} MON gerekiyor.`);
    }

    const signer = await getSigner(user.privateKey);
    const amountIn = ethers.parseEther(monAmount);
    const path = [WMON, token.address];
    const deadline = Math.floor(Date.now() / 1000) + TRADING_DEFAULTS.txDeadlineSeconds;

    let receipt: { hash: string };
    let tokenAmount: string;

    if (SWAPPER) {
      // Route through MonadBotSwapper (fee included)
      const swapper = new ethers.Contract(SWAPPER, SWAPPER_ABI, signer);
      const [tokensOut] = await swapper.getTokensOut(amountIn, path) as [bigint, bigint];
      const minOut = (tokensOut * BigInt(100 - TRADING_DEFAULTS.maxSlippage)) / 100n;
      const tx = await swapper.buyTokens(path, minOut, user.walletAddress, deadline, {
        value: amountIn,
        gasLimit: TRADING_DEFAULTS.gasLimit,
      });
      receipt = await tx.wait();
      tokenAmount = ethers.formatUnits(tokensOut, token.decimals);
    } else {
      // Direct DEX fallback
      const router = new ethers.Contract(ROUTER, ROUTER_ABI, signer);
      const amountsOut = await router.getAmountsOut(amountIn, path) as bigint[];
      const minOut = (amountsOut[1] * BigInt(100 - TRADING_DEFAULTS.maxSlippage)) / 100n;
      const tx = await router.swapExactETHForTokens(minOut, path, user.walletAddress, deadline, {
        value: amountIn,
        gasLimit: TRADING_DEFAULTS.gasLimit,
      });
      receipt = await tx.wait();
      tokenAmount = ethers.formatUnits(amountsOut[1], token.decimals);
    }

    const executionTimeMs = Date.now() - startTime;

    await prisma.trade.create({
      data: {
        userId: user.id,
        tokenSymbol: tokenSymbol.toUpperCase(),
        tokenAddress: token.address,
        type: 'BUY',
        monAmount,
        tokenAmount,
        price: (parseFloat(monAmount) / parseFloat(tokenAmount)).toString(),
        txHash: receipt.hash,
        executionTimeMs,
        status: 'SUCCESS',
      },
    });

    log('Trade', `BUY ${tokenSymbol} for ${monAmount} MON`, { txHash: receipt.hash });

    return {
      success: true,
      tokenAmount,
      txHash: receipt.hash,
      executionTimeMs,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    logError('Trade', `BUY failed: ${tokenSymbol}`, error);
    return {
      success: false,
      tokenAmount: '0',
      txHash: '',
      executionTimeMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

export async function executeSell(
  telegramId: string,
  tokenSymbol: string,
  amount: string,
): Promise<TradeResult> {
  const startTime = Date.now();

  try {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new Error('Wallet bulunamadı');

    const token = await prisma.token.findFirst({
      where: { symbol: tokenSymbol.toUpperCase() },
    });
    if (!token) throw new Error(`$${tokenSymbol} bulunamadı`);

    const signer = await getSigner(user.privateKey);
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
    const deadline = Math.floor(Date.now() / 1000) + TRADING_DEFAULTS.txDeadlineSeconds;

    let sellAmount: bigint;
    const tokenBalance = await tokenContract.balanceOf(user.walletAddress) as bigint;

    if (amount === 'all') {
      sellAmount = tokenBalance;
    } else if (amount.endsWith('%')) {
      const percent = parseInt(amount.replace('%', ''));
      sellAmount = (tokenBalance * BigInt(percent)) / 100n;
    } else {
      sellAmount = ethers.parseUnits(amount, token.decimals);
    }

    if (sellAmount === 0n) throw new Error('Satılacak token yok');

    const path = [token.address, WMON];
    let receipt: { hash: string };
    let monReceived: string;

    if (SWAPPER) {
      // Approve swapper contract
      const allowance = await tokenContract.allowance(user.walletAddress, SWAPPER) as bigint;
      if (allowance < sellAmount) {
        const approveTx = await tokenContract.approve(SWAPPER, ethers.MaxUint256);
        await approveTx.wait();
      }
      const swapper = new ethers.Contract(SWAPPER, SWAPPER_ABI, signer);
      const router = new ethers.Contract(ROUTER, ROUTER_ABI, signer);
      const amountsOut = await router.getAmountsOut(sellAmount, path) as bigint[];
      const minOut = (amountsOut[1] * BigInt(100 - TRADING_DEFAULTS.maxSlippage)) / 100n;
      const tx = await swapper.sellTokens(sellAmount, minOut, path, user.walletAddress, deadline, {
        gasLimit: TRADING_DEFAULTS.gasLimit,
      });
      receipt = await tx.wait();
      monReceived = ethers.formatEther(amountsOut[1]);
    } else {
      // Direct DEX fallback
      const router = new ethers.Contract(ROUTER, ROUTER_ABI, signer);
      const allowance = await tokenContract.allowance(user.walletAddress, ROUTER) as bigint;
      if (allowance < sellAmount) {
        const approveTx = await tokenContract.approve(ROUTER, ethers.MaxUint256);
        await approveTx.wait();
      }
      const amountsOut = await router.getAmountsOut(sellAmount, path) as bigint[];
      const minOut = (amountsOut[1] * BigInt(100 - TRADING_DEFAULTS.maxSlippage)) / 100n;
      const tx = await router.swapExactTokensForETH(sellAmount, minOut, path, user.walletAddress, deadline, {
        gasLimit: TRADING_DEFAULTS.gasLimit,
      });
      receipt = await tx.wait();
      monReceived = ethers.formatEther(amountsOut[1]);
    }

    const executionTimeMs = Date.now() - startTime;
    const tokenAmountSold = ethers.formatUnits(sellAmount, token.decimals);

    await prisma.trade.create({
      data: {
        userId: user.id,
        tokenSymbol: tokenSymbol.toUpperCase(),
        tokenAddress: token.address,
        type: 'SELL',
        monAmount: monReceived,
        tokenAmount: tokenAmountSold,
        price: (parseFloat(monReceived) / parseFloat(tokenAmountSold)).toString(),
        txHash: receipt.hash,
        executionTimeMs,
        status: 'SUCCESS',
      },
    });

    log('Trade', `SELL ${tokenSymbol} for ${monReceived} MON`, { txHash: receipt.hash });

    return {
      success: true,
      tokenAmount: monReceived,
      txHash: receipt.hash,
      executionTimeMs,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    logError('Trade', `SELL failed: ${tokenSymbol}`, error);
    return {
      success: false,
      tokenAmount: '0',
      txHash: '',
      executionTimeMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

export async function getPortfolio(telegramId: string): Promise<Portfolio> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { trades: true },
  });
  if (!user) throw new Error('Wallet bulunamadı');

  const provider = getProvider();
  const balance = await provider.getBalance(user.walletAddress);
  const freeBalance = ethers.formatEther(balance);

  const trades = user.trades;
  const buyTrades = trades.filter(t => t.type === 'BUY');
  const sellTrades = trades.filter(t => t.type === 'SELL');
  const winTrades = sellTrades.filter(t => {
    const buysForToken = buyTrades.filter(b => b.tokenSymbol === t.tokenSymbol);
    if (buysForToken.length === 0) return false;
    const buyAvg = buysForToken.reduce((sum, b) => sum + parseFloat(b.price), 0) / buysForToken.length;
    return parseFloat(t.price) > buyAvg;
  });

  const winRate = sellTrades.length > 0
    ? Math.round((winTrades.length / sellTrades.length) * 100)
    : 0;

  const positions: Portfolio['positions'] = [];
  const tokenSymbols = [...new Set(buyTrades.map(t => t.tokenSymbol))];

  for (const symbol of tokenSymbols) {
    const token = await prisma.token.findFirst({ where: { symbol } });
    if (!token) continue;

    try {
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const tokenBalance = await tokenContract.balanceOf(user.walletAddress) as bigint;

      if (tokenBalance > 0n) {
        const tokenAmount = ethers.formatUnits(tokenBalance, token.decimals);
        positions.push({
          symbol,
          tokenAmount,
          value: '0',
          pnl: 0,
          entryPrice: '0',
          currentPrice: '0',
        });
      }
    } catch {
      // Token contract unreadable — skip
    }
  }

  const totalValue = parseFloat(freeBalance) + positions.reduce((sum, p) => sum + parseFloat(p.value), 0);

  return {
    totalValue: totalValue.toFixed(4),
    totalPnl: 0,
    freeBalance,
    positions,
    totalTrades: trades.length,
    winRate,
  };
}
