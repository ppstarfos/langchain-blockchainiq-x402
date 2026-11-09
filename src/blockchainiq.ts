// LangChain tool wrapping the Blockchain IQ x402 pay-per-call crypto data API.
// Source of truth for the payment flow: https://www.blockchainiq.co/agents
// (official copy-paste example uses @x402/fetch + @x402/evm + viem, x402 v2,
// USDC on Base eip155:8453, no account / no API key).
// The cheapest qualifying call is the market brief: GET /api/x402/v1/brief ($0.01).

import { DynamicStructuredTool } from "@langchain/core/tools";
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

const BASE_URL = "https://www.blockchainiq.co/api/x402/v1";

/** Build a fetch wrapper that answers HTTP 402 with a signed USDC payment on Base. */
export function createPaidFetch() {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("Set AGENT_PRIVATE_KEY (a dedicated wallet holding a little USDC on Base).");
  const account = privateKeyToAccount(key as `0x${string}`);
  const client = x402Client.fromConfig({
    schemes: [{ network: "eip155:*", client: new ExactEvmScheme(account) }],
    // The dearest Blockchain IQ call is $2.00; cap a single payment at $0.60
    // so a typo can never spend more than the brief/event-risk calls need.
    spendControls: { maxAmountPerPayment: 0.6 },
  });
  return wrapFetchWithPayment(fetch, client);
}

const briefSchema = z.object({});

const eventRiskSchema = z.object({
  days: z.number().int().min(1).max(90).default(7).describe("Lookahead window in days (1-90, default 7)."),
  minImportance: z.number().int().min(1).max(3).default(1).describe("Minimum event importance 1-3 (default 1 = everything)."),
});

async function paidGet(path: string) {
  const payFetch = createPaidFetch();
  const res = await payFetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Blockchain IQ call failed: HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  const body = await res.json();
  // Proof of settlement: payer, network and transaction hash. A missing or
  // undecodable header must not fail the call — the data is already paid for.
  const header = res.headers.get("payment-response") ?? res.headers.get("x-payment-response") ?? "";
  let settlement: unknown = null;
  if (header) {
    try {
      settlement = decodePaymentResponseHeader(header);
    } catch {
      try {
        settlement = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
      } catch {
        settlement = null;
      }
    }
  }
  return JSON.stringify({ data: body.data ?? body, settlement });
}

export const blockchainIqBriefTool = new DynamicStructuredTool({
  name: "blockchain_iq_market_brief",
  description:
    "Crypto market brief in one parameter-free call ($0.01, paid in USDC on Base via x402): " +
    "BTC, ETH, SOL and XRP prices with 24h/7d/30d moves, scheduled macro and crypto events in the next 48 hours, and short risk flags. " +
    "Use as the opening call of a trading, portfolio or research agent loop.",
  schema: briefSchema,
  func: async () => paidGet("/brief"),
});

export const blockchainIqEventRiskTool = new DynamicStructuredTool({
  name: "blockchain_iq_event_risk",
  description:
    "Scheduled market-moving events for the next N days ($0.05, paid in USDC on Base via x402): " +
    "US data releases with times, FOMC/ECB/BoJ decisions, Treasury auctions and dated crypto milestones, each with importance 1-3 and source. " +
    "Use before any trade to know what is on the calendar.",
  schema: eventRiskSchema,
  func: async ({ days, minImportance }) =>
    paidGet(`/event-risk?days=${days}&minImportance=${minImportance}`),
});

export const blockchainIqTools = [blockchainIqBriefTool, blockchainIqEventRiskTool];
