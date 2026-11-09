# LangChain tools for the Blockchain IQ x402 API

Two LangChain `DynamicStructuredTool`s that call the [Blockchain IQ](https://www.blockchainiq.co/agents)
pay-per-call crypto data API through the x402 protocol — USDC on Base
(eip155:8453), no account, no API key. An unpaid request returns HTTP 402,
the tool signs the payment with `@x402/fetch` + `@x402/evm` (x402 v2), and
the response includes the settlement proof (payer, network, transaction
hash) alongside the data.

| Tool | Endpoint | Price |
| --- | --- | --- |
| `blockchain_iq_market_brief` | `GET /api/x402/v1/brief` | $0.01 |
| `blockchain_iq_event_risk` | `GET /api/x402/v1/event-risk` | $0.05 |

A spend control caps any single payment at $0.60, so a typo can never spend
more than these calls need.

## Quick start

```bash
npm install
cp .env.example .env   # set AGENT_PRIVATE_KEY to a dedicated wallet holding a little USDC on Base
npm run example        # runs the $0.01 brief call and prints data + settlement proof
```

Never use a main wallet, and never commit a private key — `AGENT_PRIVATE_KEY`
is read from the environment only.

## Use in an agent

```ts
import { blockchainIqTools } from "./src/blockchainiq.js";
// pass blockchainIqTools to your LangChain agent alongside its other tools
```

## License

MIT
