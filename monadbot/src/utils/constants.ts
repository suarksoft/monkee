// MonadBotSwapper — V3 wrapper with 1% fee
export const SWAPPER_ABI = [
  'function buyTokens(address tokenOut, uint24 poolFee, uint256 amountOutMinimum, address recipient) payable returns (uint256 tokensOut)',
  'function sellTokens(address tokenIn, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum, address recipient) returns (uint256 monOut)',
  'function feeBps() view returns (uint256)',
  'function feeRecipient() view returns (address)',
];

// Uniswap V3 SwapRouter02
export const V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountIn)',
  'function multicall(bytes[] calldata data) payable returns (bytes[] memory results)',
];

// WMON (Wrapped MON) — same as WETH interface
export const WMON_ABI = [
  'function deposit() payable',
  'function withdraw(uint256 amount)',
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// ERC20
export const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

// Uniswap V3 Pool — for reading price
export const V3_POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
];

// Uniswap V3 Factory
export const V3_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
];

export const MONAD_CONFIG = {
  chainId: 143,
  name: 'Monad Mainnet',
  rpcUrl: process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz',
  blockExplorer: 'https://monadexplorer.com',
};

export const TRADING_DEFAULTS = {
  maxSlippageBps: 500,    // 5% slippage
  defaultBuyAmount: '1',
  gasLimit: 500000,
  txDeadlineSeconds: 300,
  minBuyAmount: '0.01',
  maxBuyAmount: '10000',
  defaultPoolFee: 3000,   // 0.3% — fallback fee tier
};

// Known V3 pool addresses on Monad Mainnet
export const KNOWN_POOLS: Record<string, { poolAddress: string; fee: number }> = {
  'CHOG': { poolAddress: '0x745355f47db8c57e7911ef3da2e989b16039d12f', fee: 10000 },
  'USDC': { poolAddress: '0x659bd0bc4167ba25c62e05656f78043e7ed4a9da', fee: 3000 },
};
