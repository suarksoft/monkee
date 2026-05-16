import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger';

const prisma = new PrismaClient();
const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);

export async function getOrCreateWallet(telegramId: string, username?: string, firstName?: string) {
  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    const wallet = ethers.Wallet.createRandom();

    user = await prisma.user.create({
      data: {
        telegramId,
        username: username ?? null,
        firstName: firstName ?? null,
        walletAddress: wallet.address,
        privateKey: wallet.privateKey,
        settings: {
          create: {},
        },
      },
    });

    log('Wallet', `New wallet created for ${telegramId}: ${wallet.address}`);
  }

  return user;
}

export async function getWallet(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { settings: true },
  });
  if (!user) throw new Error('Wallet bulunamadı. /start ile başla.');
  return user;
}

export async function getBalance(address: string): Promise<string> {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export async function getSigner(privateKey: string): Promise<ethers.Wallet> {
  return new ethers.Wallet(privateKey, provider);
}

export function getProvider(): ethers.JsonRpcProvider {
  return provider;
}
