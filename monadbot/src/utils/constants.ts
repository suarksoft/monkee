export const ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function WETH() external pure returns (address)',
];

// MonadBotSwapper contract ABI
export const SWAPPER_ABI = [
  'function buyTokens(address[] calldata path, uint256 amountOutMin, address to, uint256 deadline) external payable returns (uint256[] memory amounts)',
  'function sellTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'function getTokensOut(uint256 monAmount, address[] calldata path) external view returns (uint256 tokensOut, uint256 fee)',
  'function feeBps() external view returns (uint256)',
];

export const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
];

export const FACTORY_ABI = [
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
];

export const MONAD_CONFIG = {
  chainId: 10143,
  name: 'Monad Testnet',
  rpcUrl: process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
  blockExplorer: 'https://testnet.monadexplorer.com',
};

export const TRADING_DEFAULTS = {
  maxSlippage: 5,
  defaultBuyAmount: '1',
  gasLimit: 300000,
  txDeadlineSeconds: 300,
  minBuyAmount: '0.01',
  maxBuyAmount: '1000',
};
