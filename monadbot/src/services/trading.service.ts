import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { V3_ROUTER_ABI, SWAPPER_ABI, WMON_ABI, ERC20_ABI, V3_POOL_ABI, V3_FACTORY_ABI, TRADING_DEFAULTS, KNOWN_POOLS } from '../utils/constants';
import { getSigner, getProvider, getBalance } from './wallet.service';
import { TradeResult, Portfolio } from '../types';
import { log, logError } from '../utils/logger';

const prisma = new PrismaClient();
const V3_ROUTER  = process.env.V3_ROUTER_ADDRESS!;
const WMON_ADDR  = process.env.WMON_ADDRESS!;
const SWAPPER    = process.env.SWAPPER_ADDRESS;
const V3_FACTORY = '0x204faca1764b154221e35c0d20abb3c525710498';

async function getPoolAddress(tokenAddress: string): Promise<{ poolAddress: string; fee: number } | null> {
  const symbol = Object.keys(KNOWN_POOLS).find(k => {
    const token = KNOWN_POOLS[k];
    return token !== undefined;
  });

  // Check known pools first by token address match
  for (const [, info] of Object.entries(KNOWN_POOLS)) {
    // We'll verify against what's in the DB
    if (info.poolAddress) {
      try {
        const provider = getProvider();
        const pool = new ethers.Contract(info.poolAddress, V3_POOL_ABI, provider);
        const [t0, t1] = await Promise.all([pool.token0(), pool.token1()]);
        if (t0.toLowerCase() === tokenAddress.toLowerCase() || t1.toLowerCase() === tokenAddress.toLowerCase()) {
          return info;
        }
      } catch { continue; }
    }
  }

  // Try to find pool via factory for common fee tiers
  const provider = getProvider();
  const factory = new ethers.Contract(V3_FACTORY, V3_FACTORY_ABI, provider);
  for (const fee of [3000, 500, 10000, 100]) {
    try {
      const poolAddr = await factory.getPool(WMON_ADDR, tokenAddress, fee) as string;
      if (poolAddr && poolAddr !== ethers.ZeroAddress) {
        return { poolAddress: poolAddr, fee };
      }
    } catch { continue; }
  }
  return null;
}

export async function getPriceFromPool(tokenAddress: string, tokenDecimals: number): Promise<string> {
  try {
    const provider = getProvider();
    const poolInfo = await getPoolAddress(tokenAddress);
    if (!poolInfo) return '0';

    const pool = new ethers.Contract(poolInfo.poolAddress, V3_POOL_ABI, provider);
    const [slot0, token0] = await Promise.all([pool.slot0(), pool.token0()]);
    const sqrtPriceX96 = slot0[0] as bigint;

    if (sqrtPriceX96 === 0n) return '0';

    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const price = (sqrtPriceX96 * sqrtPriceX96 * (10n ** BigInt(tokenDecimals))) / (Q96 * Q96 * (10n ** 18n));

    // If token0 is WMON, price is WMON/token = we want token/WMON
    const isToken0Wmon = token0.toLowerCase() === WMON_ADDR.toLowerCase();
    if (isToken0Wmon) {
      // price = WMON per token → invert for MON per token
      return price === 0n ? '0' : (1 / Number(ethers.formatUnits(price, tokenDecimals))).toFixed(10);
    } else {
      return ethers.formatUnits(price, 18);
    }
  } catch {
    return '0';
  }
}

export async function executeBuy(
  telegramId: string,
  tokenSymbol: string,
  monAmount: string,
): Promise<TradeResult> {
  const startTime = Date.now();

  try {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new Error('Wallet bulunamadı');

    const token = await prisma.token.findFirst({ where: { symbol: tokenSymbol.toUpperCase() } });
    if (!token) throw new Error(`$${tokenSymbol} bulunamadı`);

    const balance = await getBalance(user.walletAddress);
    const amountIn = ethers.parseEther(monAmount);
    if (parseFloat(balance) < parseFloat(monAmount) + 0.01) {
      throw new Error(`Yetersiz bakiye. ${parseFloat(balance).toFixed(4)} MON var.`);
    }

    const poolInfo = await getPoolAddress(token.address);
    if (!poolInfo) throw new Error(`$${tokenSymbol} için likidite havuzu bulunamadı`);

    const signer = await getSigner(user.privateKey);
    const wmon = new ethers.Contract(WMON_ADDR, WMON_ABI, signer);
    const router = new ethers.Contract(V3_ROUTER, V3_ROUTER_ABI, signer);
    const deadline = Math.floor(Date.now() / 1000) + TRADING_DEFAULTS.txDeadlineSeconds;

    // Step 1: Wrap MON → WMON
    const wrapTx = await wmon.deposit({ value: amountIn, gasLimit: 100000 });
    await wrapTx.wait();

    // Step 2: Approve router
    const allowance = await wmon.allowance(user.walletAddress, V3_ROUTER) as bigint;
    if (allowance < amountIn) {
      const approveTx = await wmon.approve(V3_ROUTER, ethers.MaxUint256, { gasLimit: 100000 });
      await approveTx.wait();
    }

    // Step 3: Swap WMON → token
    const tx = await router.exactInputSingle({
      tokenIn: WMON_ADDR,
      tokenOut: token.address,
      fee: poolInfo.fee,
      recipient: user.walletAddress,
      amountIn,
      amountOutMinimum: 0n, // Accept any output (hackathon mode)
      sqrtPriceLimitX96: 0n,
    }, { gasLimit: TRADING_DEFAULTS.gasLimit });

    const receipt = await tx.wait();
    const executionTimeMs = Date.now() - startTime;

    // Estimate token amount from price
    const price = await getPriceFromPool(token.address, token.decimals);
    const tokenAmount = price !== '0'
      ? (parseFloat(monAmount) / parseFloat(price)).toFixed(token.decimals > 6 ? 4 : 2)
      : '0';

    await prisma.trade.create({
      data: {
        userId: user.id,
        tokenSymbol: tokenSymbol.toUpperCase(),
        tokenAddress: token.address,
        type: 'BUY',
        monAmount,
        tokenAmount,
        price: price || '0',
        txHash: receipt.hash,
        executionTimeMs,
        status: 'SUCCESS',
      },
    });

    log('Trade', `BUY ${tokenSymbol} ${monAmount} MON`, { txHash: receipt.hash });
    return { success: true, tokenAmount, txHash: receipt.hash, executionTimeMs };

  } catch (error: unknown) {
    const err = error as { message?: string };
    logError('Trade', `BUY failed: ${tokenSymbol}`, error);
    return { success: false, tokenAmount: '0', txHash: '', executionTimeMs: Date.now() - startTime, error: err.message };
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

    const token = await prisma.token.findFirst({ where: { symbol: tokenSymbol.toUpperCase() } });
    if (!token) throw new Error(`$${tokenSymbol} bulunamadı`);

    const signer = await getSigner(user.privateKey);
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
    const wmon = new ethers.Contract(WMON_ADDR, WMON_ABI, signer);
    const router = new ethers.Contract(V3_ROUTER, V3_ROUTER_ABI, signer);

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

    const poolInfo = await getPoolAddress(token.address);
    if (!poolInfo) throw new Error(`$${tokenSymbol} için likidite havuzu bulunamadı`);

    // Approve router for token
    const allowance = await tokenContract.allowance(user.walletAddress, V3_ROUTER) as bigint;
    if (allowance < sellAmount) {
      const approveTx = await tokenContract.approve(V3_ROUTER, ethers.MaxUint256, { gasLimit: 100000 });
      await approveTx.wait();
    }

    // Swap token → WMON (router delivers to this contract first)
    const deadline = Math.floor(Date.now() / 1000) + TRADING_DEFAULTS.txDeadlineSeconds;
    const tx = await router.exactInputSingle({
      tokenIn: token.address,
      tokenOut: WMON_ADDR,
      fee: poolInfo.fee,
      recipient: user.walletAddress, // WMON goes to user
      amountIn: sellAmount,
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    }, { gasLimit: TRADING_DEFAULTS.gasLimit });

    const receipt = await tx.wait();

    // Unwrap WMON → MON
    const wmonReceived = await wmon.balanceOf(user.walletAddress) as bigint;
    if (wmonReceived > 0n) {
      const unwrapTx = await wmon.withdraw(wmonReceived, { gasLimit: 100000 });
      await unwrapTx.wait();
    }

    const executionTimeMs = Date.now() - startTime;
    const monReceived = ethers.formatEther(wmonReceived);
    const tokenAmountSold = ethers.formatUnits(sellAmount, token.decimals);

    await prisma.trade.create({
      data: {
        userId: user.id,
        tokenSymbol: tokenSymbol.toUpperCase(),
        tokenAddress: token.address,
        type: 'SELL',
        monAmount: monReceived,
        tokenAmount: tokenAmountSold,
        price: wmonReceived > 0n ? (parseFloat(monReceived) / parseFloat(tokenAmountSold)).toString() : '0',
        txHash: receipt.hash,
        executionTimeMs,
        status: 'SUCCESS',
      },
    });

    log('Trade', `SELL ${tokenSymbol} → ${monReceived} MON`, { txHash: receipt.hash });
    return { success: true, tokenAmount: monReceived, txHash: receipt.hash, executionTimeMs };

  } catch (error: unknown) {
    const err = error as { message?: string };
    logError('Trade', `SELL failed: ${tokenSymbol}`, error);
    return { success: false, tokenAmount: '0', txHash: '', executionTimeMs: Date.now() - startTime, error: err.message };
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
    const avgBuy = buysForToken.reduce((s, b) => s + parseFloat(b.price), 0) / buysForToken.length;
    return parseFloat(t.price) > avgBuy;
  });
  const winRate = sellTrades.length > 0 ? Math.round((winTrades.length / sellTrades.length) * 100) : 0;

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
        const price = await getPriceFromPool(token.address, token.decimals);
        const value = price !== '0' ? (parseFloat(tokenAmount) * parseFloat(price)).toFixed(4) : '0';

        const avgEntry = buyTrades
          .filter(t => t.tokenSymbol === symbol)
          .reduce((s, t) => s + parseFloat(t.price), 0) / buyTrades.filter(t => t.tokenSymbol === symbol).length;
        const pnl = avgEntry > 0 && price !== '0' ? ((parseFloat(price) - avgEntry) / avgEntry) * 100 : 0;

        positions.push({ symbol, tokenAmount, value, pnl, entryPrice: avgEntry.toFixed(10), currentPrice: price });
      }
    } catch { continue; }
  }

  const totalValue = parseFloat(freeBalance) + positions.reduce((s, p) => s + parseFloat(p.value), 0);

  return {
    totalValue: totalValue.toFixed(4),
    totalPnl: positions.reduce((s, p) => s + p.pnl, 0) / (positions.length || 1),
    freeBalance,
    positions,
    totalTrades: trades.length,
    winRate,
  };
}
