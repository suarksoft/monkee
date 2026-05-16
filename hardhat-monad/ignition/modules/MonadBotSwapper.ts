import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Bean Exchange Router on Monad Testnet
const BEAN_ROUTER = "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89";

// Fee recipient — replace with your wallet address
const FEE_RECIPIENT = process.env.FEE_RECIPIENT || "0x0000000000000000000000000000000000000001";

const MonadBotSwapperModule = buildModule("MonadBotSwapper", (m) => {
  const router = m.getParameter("router", BEAN_ROUTER);
  const feeRecipient = m.getParameter("feeRecipient", FEE_RECIPIENT);

  const swapper = m.contract("MonadBotSwapper", [router, feeRecipient]);

  return { swapper };
});

export default MonadBotSwapperModule;
