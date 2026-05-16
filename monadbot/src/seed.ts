import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  // Monad Mainnet token addresses (verified on-chain)
  const tokens = [
    {
      symbol: 'CHOG',
      name: 'Chog',
      address: '0x350035555e10d9afaf1566aaebfced5ba6c27777',
      volume24h: '48000',
      holderCount: 1200,
      lastPrice: '0.00001',
      decimals: 18,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
      volume24h: '500000',
      holderCount: 5000,
      lastPrice: '0.027',
      decimals: 6,
    },
    {
      symbol: 'WMON',
      name: 'Wrapped MON',
      address: '0x3bd359c1119da7da1d913d1c4d2b7c461115433a',
      volume24h: '120000',
      holderCount: 8000,
      lastPrice: '1.0',
      decimals: 18,
    },
  ];

  for (const token of tokens) {
    await prisma.token.upsert({
      where: { address: token.address },
      update: {
        symbol: token.symbol,
        name: token.name,
        volume24h: token.volume24h,
        holderCount: token.holderCount,
        lastPrice: token.lastPrice,
        decimals: token.decimals,
      },
      create: token,
    });
    console.log(`✅ ${token.symbol} → ${token.address}`);
  }

  console.log('\n🚀 Seed complete — Monad Mainnet tokens loaded');
  await prisma.$disconnect();
}

seed().catch(console.error);
