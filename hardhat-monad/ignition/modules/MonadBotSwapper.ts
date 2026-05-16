import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Monad Mainnet — Uniswap V3
const V3_ROUTER   = "0xfe31f71c1b106eac32f1a19239c9a9a72ddfb900";
const WMON        = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const FEE_RECIPIENT = process.env.FEE_RECIPIENT || "0x94C0Eed75bD91684621D0b8464e289356E95A3EF";

const MonadBotSwapperModule = buildModule("MonadBotSwapper", (m) => {
  const router       = m.getParameter("router", V3_ROUTER);
  const wmon         = m.getParameter("wmon", WMON);
  const feeRecipient = m.getParameter("feeRecipient", FEE_RECIPIENT);

  const swapper = m.contract("MonadBotSwapper", [router, wmon, feeRecipient]);
  return { swapper };
});

export default MonadBotSwapperModule;
