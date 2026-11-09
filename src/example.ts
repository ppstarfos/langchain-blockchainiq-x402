// Minimal runnable proof: one paid call to the $0.01 market brief.
// Run: AGENT_PRIVATE_KEY=0x... npm run example
// The wallet needs a little USDC on Base. Settlement is gasless for the payer.
// Prints the brief plus the PAYMENT-RESPONSE settlement (incl. tx hash),
// which is the hash to include in the bounty claim email.
import { blockchainIqBriefTool } from "./blockchainiq.js";

const out = await blockchainIqBriefTool.invoke({});
console.log(out);
