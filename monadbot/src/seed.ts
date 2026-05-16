import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  const tokens = [
    {
      symbol: 'CHOG',
      name: 'Chog',
      address: '0xe0590015a873bf326bd645c3e1266d4db41c4e6b',
      volume24h: '48000',
      holderCount: 1200,
      lastPrice: '0.000337',
      decimals: 18,
    },
    {
      symbol: 'YAKI',
      name: 'Moyaki',
      address: '0xfe140e1dce99be9f4f15d657cd9b7bf622270c50',
      volume24h: '32000',
      holderCount: 890,
      lastPrice: '0.0130',
      decimals: 18,
    },
    {
      symbol: 'DAK',
      name: 'Molandak',
      address: '0x0f0bdebf0f83cd1ee3974779bcb7315f9808c714',
      volume24h: '8500',
      holderCount: 340,
      lastPrice: '0.0021',
      decimals: 18,
    },
    {
      symbol: 'BEAN',
      name: 'Bean Exchange',
      address: '0x268e4e24e0051ec27b3d27a95977e71ce6875a05',
      volume24h: '15000',
      holderCount: 560,
      lastPrice: '0.0087',
      decimals: 18,
    },
    {
      symbol: 'WMON',
      name: 'Wrapped MON',
      address: '0x760afe86e5de5fa0ee542fc7b7b713e1c5425701',
      volume24h: '120000',
      holderCount: 5000,
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
      },
      create: token,
    });
    console.log(`✅ ${token.symbol} → ${token.address}`);
  }

  console.log('\n🚀 Seed complete — 5 real Monad testnet tokens loaded');
  await prisma.$disconnect();
}

seed().catch(console.error);
