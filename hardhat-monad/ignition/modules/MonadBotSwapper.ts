import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Uniswap V2 Router on Monad Testnet
const BEAN_ROUTER = "0xfb8e1c3b833f9e67a71c859a132cf783b645e436";

// Fee recipient — replace with your wallet address
const FEE_RECIPIENT = process.env.FEE_RECIPIENT || "0x0000000000000000000000000000000000000001";

const MonadBotSwapperModule = buildModule("MonadBotSwapper", (m) => {
  const router = m.getParameter("router", BEAN_ROUTER);
  const feeRecipient = m.getParameter("feeRecipient", FEE_RECIPIENT);

  const swapper = m.contract("MonadBotSwapper", [router, feeRecipient]);

  return { swapper };
});

export default MonadBotSwapperModule;
