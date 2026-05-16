import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { FACTORY_ABI } from '../utils/constants';
import { getProvider } from './wallet.service';
import { log } from '../utils/logger';

const prisma = new PrismaClient();

export function startSniperMonitor(
  factoryAddress: string,
  onNewToken: (symbol: string, address: string) => void,
) {
  const provider = getProvider();
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

  factory.on('PairCreated', async (token0: string, token1: string, pair: string) => {
    log('Sniper', `New pair: ${pair}`, { token0, token1 });
    onNewToken(token0, pair);
  });

  log('Sniper', 'Sniper monitor started');
}

export async function getActiveSnipeUsers(): Promise<string[]> {
  const users = await prisma.userSettings.findMany({
    where: { sniperActive: true },
    include: { user: true },
  });
  return users.map(s => s.user.telegramId);
}
