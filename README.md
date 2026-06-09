# SoSoMon — AI-Managed Thematic Crypto Indexes

> Built on SoSoValue ValueChain · Powered by SoDEX · Managed by AI

**SoSoMon** is a one-person on-chain financial business that runs three autonomous AI agents to manage thematic crypto index funds. Users deposit USDC, the platform allocates capital across curated token baskets, and AI agents handle everything — screening, rebalancing, and reporting — automatically.

---

## Live Demo

- **App:** https://sosomon.ekem.com.br:8443
- **API Docs:** https://sosomon.ekem.com.br:8443/api/docs
- **Network:** Base (USDC deposits) + SoSoValue ValueChain (trading via SoDEX)

---

## The Problem

Retail investors want exposure to thematic crypto sectors (AI, RWA, DePIN) but lack the time, tools, and expertise to manage a diversified portfolio. Existing solutions are either too centralized, too complex, or don't use real on-chain infrastructure.

---

## The Solution

SoSoMon provides institutional-quality thematic index management powered by AI agents — fully automated, transparent, and built on SoSoValue ValueChain.

Three indexes, three agents, zero manual intervention:

| Index | Theme | Description |
|---|---|---|
| AI × Crypto Infrastructure | ai-crypto | AI-native protocols powering the next compute layer |
| Real World Assets Top 10 | rwa | Leading tokenized RWA protocols bridging TradFi and DeFi |
| DePIN Momentum | depin | Decentralized physical infrastructure with real-world traction |

---

## AI Agents

### Scout — Daily Screening
- Runs daily at 06:00 UTC
- Screens 400+ tokens using SoSoValue SSI index constituents as universe
- Uses SoSoValue sector flows, news, and macro context as inputs
- Powered by Google Gemini — generates ranked inclusion lists with AI rationale
- Saves proposals to DB for admin review

### Rebalancer — Portfolio Maintenance
- Runs every Monday at 08:00 UTC + drift check every 4 hours
- Monitors portfolio drift against target weights
- Reads macro sentiment score (derived from SoSoValue real data)
- Triggers risk overrides: sentiment < 25 → 30% USDC buffer; < 15 → 50% buffer
- Executes trades on SoDEX via EIP-712 signed API calls

### Narrator — Weekly Content
- Runs every Sunday at 18:00 UTC
- Generates weekly Alpha Memo using real SoSoValue data:
  - BTC/ETH ETF flows
  - Macro calendar (CPI, NFP, FOMC)
  - Hot news and sector sentiment
  - Portfolio performance vs benchmark

### Deposit Monitor — On-Chain Settlement (Wave 2)
- Runs every 2 minutes via APScheduler + AsyncIO on two independent threads (Mainnet + Testnet)
- Polls `eth_getLogs` on Base Mainnet (8453) and Base Sepolia (84532) for USDC `Transfer` events to the fund wallet
- On confirmed deposit: validates amount, attributes to investor portfolio, allocates index tokens at current NAV, writes `AgentActivityLog` entry
- Deposits below $5 minimum: triggers `refund_executor` which builds and broadcasts a USDC transfer back to sender — refund TX hash stored and shown to investor
- All events (deposits, refunds, unattributed transfers) recorded in `agent_activity_logs` with full metadata (tx hash, amount, wallet, network, index)

---

## On-Chain Addresses

| Resource | Network | Address |
|---|---|---|
| Fund Wallet | Base Mainnet + Base Sepolia | `0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b` |
| USDC Contract | Base Mainnet (8453) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDC Contract | Base Sepolia (84532) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

**Verify on Basescan:**
- Mainnet: https://basescan.org/address/0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b
- Testnet: https://sepolia.basescan.org/address/0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b

---

## SoSoValue Integration

**Base URL:** `https://openapi.sosovalue.com/openapi/v1`

SoSoMon uses the SoSoValue API throughout the entire decision pipeline:

| Endpoint | Usage |
|---|---|
| `/currencies/sector-spotlight` | 24h sector performance → proprietary sentiment score (0-100) |
| `/indices` + `/indices/{ticker}` | SSI index constituents as token universe for Scout |
| `/etfs/summary-history` | BTC/ETH ETF flow data for macro context |
| `/news/hot` | Market news for Scout and Narrator context |
| `/macro/events` | Macro calendar (CPI, NFP, FOMC) for Narrator |

**Sentiment Score** is derived in real-time from sector spotlight 24h change averages + ETF flow adjustments — giving a proprietary 0-100 score that drives all agent risk decisions (sentiment < 25 → 30% USDC buffer; < 15 → 50% buffer).

---

## SoDEX Integration

**Base URL:** `https://mainnet-gw.sodex.dev/api/v1/spot`

SoSoMon uses the SoDEX Spot API for all trading operations:

| Feature | Endpoint |
|---|---|
| Market data | `GET /markets/symbols`, `/markets/tickers`, `/markets/{sym}/klines` |
| Portfolio | `GET /accounts/{addr}/balances`, `/accounts/{addr}/trades` |
| Trading | `POST /trade/orders/batch` (EIP-712 signed) |
| Cancel | `DELETE /trade/orders/batch` (EIP-712 signed) |

**Authentication:** EIP-712 `ExchangeAction` typed data — chainId 286623 (ValueChain mainnet), nonce = Unix timestamp ms, `0x01` signature prefix.

**Fund Wallet:** `0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b` — publicly auditable on Base network.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SoSoMon                          │
│                                                     │
│  Next.js Frontend (React, wagmi, RainbowKit)        │
│  ├── Home          — live stats + index cards       │
│  ├── Indexes       — detail + constituents          │
│  ├── Dashboard     — portfolio + AI activity + macro│
│  ├── Transparency  — rebalance history + deposits   │
│  ├── Faucet Sepolia— testnet token faucet (ETH+USDC)│
│  ├── What's New    — API integration showcase       │
│  └── Admin         — wallet-signed auth (EIP-191)   │
│                                                     │
│  FastAPI Backend (Python)                           │
│  ├── /api/indexes    — index data + constituents    │
│  ├── /api/macro      — SoSoValue macro context      │
│  ├── /api/agents     — AI activity log              │
│  ├── /api/invest     — portfolio + fund wallet      │
│  ├── /api/stats      — public platform stats        │
│  ├── /api/faucet     — testnet ETH faucet           │
│  └── /api/admin      — admin operations             │
│                                                     │
│  APScheduler                                        │
│  ├── Scout      — daily 06:00 UTC                  │
│  ├── Rebalancer — Mon 08:00 + drift every 4h       │
│  ├── Narrator   — Sun 18:00 UTC                    │
│  └── DepositMonitor — every 2 minutes              │
│                                                     │
│  SQLite DB                                          │
│  ├── alpha_indexes         — index definitions      │
│  ├── index_constituents    — token weights          │
│  ├── rebalance_proposals   — agent proposals        │
│  ├── subscribers           — investor wallets       │
│  ├── subscriber_portfolios — positions              │
│  └── agent_activity_logs   — full audit trail       │
│                                                     │
│  File-based storage                                 │
│  └── faucet_claims.json    — claim history per wallet│
└─────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
  SoSoValue API              SoDEX Spot API
  (market intelligence)      (trade execution)
         │                          │
         └──────────────────────────┘
                      │
                      ▼
              Base Mainnet (8453) + Base Sepolia (84532)
              SoSoValue ValueChain (chainId: 286623)
```

---

## Security

- **No private keys in code or config files** — all sensitive values encrypted with AES-256-GCM at rest
- **Admin access** via EIP-191 wallet signature — no passwords stored anywhere
- **API keys and private keys** stored encrypted — never in source code, logs, or version control
- **Fund wallet** is a dedicated SoDEX API key account — separate from the operator master wallet
- **Deposits** detected automatically via `eth_getLogs` on Base — no user action needed after transfer
- **Open source** — full code on GitHub for public audit. `.env` files excluded via `.gitignore`

---

## Revenue Model

- **0.75%/year** management fee on AUM
- **15% performance fee** on profits above high-water mark (HWM)
- Fees accrue automatically, tracked per subscriber portfolio

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, wagmi v2, RainbowKit v2 |
| Backend | Python 3.11, FastAPI, SQLAlchemy, APScheduler |
| Database | SQLite (upgradeable to PostgreSQL) |
| AI | Google Gemini (agent reasoning) |
| Blockchain | Base (USDC deposits), SoSoValue ValueChain (trading) |
| Auth | EIP-191 (admin), EIP-712 (SoDEX trading) |
| Infra | Ubuntu 24.04, Nginx, PM2, Let's Encrypt SSL |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- SoSoValue API key
- SoDEX API key (from sodex.com/apikeys)
- Google Gemini API key

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys — never commit .env
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL
npm run build
npm start
```

### Environment Variables

All secrets are set in `backend/.env` — see `backend/.env.example` for the list of required keys. **Never commit `.env` files.**

Private keys are stored encrypted via AES-256-GCM. Use `backend/utils/crypto.py` to encrypt before storing. The `MASTER_ENCRYPTION_KEY` and all API keys must be set only in the server environment — never hardcoded.

---

## What's New — Post-Buildathon (2026-06-09)

### Testnet Faucet (`/faucet-sepolia`)
- Dedicated faucet page completely independent from the main investment flow
- **ETH faucet:** 0.0001 ETH per claim, up to 3 claims per wallet, with progress bar and Basescan link per transaction
- **USDC faucet:** external link to Circle's official faucet ($20 USDC, Base Sepolia)
- How-to guide with 4 numbered steps and 5 testing tips for testers and early investors
- Claims tracked in `faucet_claims.json` — no DB schema changes required
- Backend: `POST /api/faucet/claim` and `GET /api/faucet/status/{wallet}`
- **EIP-55 fix:** `to_checksum_address()` applied to the recipient address before signing the transaction
- **API URL fix:** relative `/api/faucet/...` URLs — Nginx proxies these to the backend; avoids browser resolving `localhost:8000`

### Navigation — Faucet Link + Network Lock
- "Faucet" added to the top nav between Transparency and What's New
- On mainnet: link is grayed out and unclickable with an explanatory tooltip
- On `/faucet-sepolia`: network toggle locked with a padlock icon — prevents switching away from testnet while using the faucet

### What's New — Faucet Card
- Sky-blue highlight card added to the What's New page describing the open invitation for testers and early investors
- Generic framing — no buildathon-specific language
- Available in all 7 languages, updates instantly on language switch

### Dashboard — Cleanup
- `FaucetPanel` removed from the dashboard (was cluttering the investor view)
- `FaucetPanel.tsx` kept as a standalone component for potential reuse

### Internationalization (7 Languages) — Faucet
- ~30 new translation keys per language covering the entire `/faucet-sepolia` page
- 7 new `wn_faucet_*` keys per language for the What's New card
- Languages: `en` · `pt` · `zh` · `ja` · `hi` · `id` · `ko`

### Bug Fixes
- **Gemini/Rebalancer:** `'Models' object has no attribute 'generate'` — switched to `gemini-2.5-flash-lite` and corrected async call to `client.aio.models.generate_content()`
- **nav_updater.py:** `ImportError: FUND_WALLET` — replaced with `NETWORKS["mainnet"]["fund_wallet"]` from the existing config dict

---

## What's New — Wave 2

### Real On-Chain Deposits & Auto-Refunds
- `deposit_monitor` service polls `eth_getLogs` every 2 minutes on both Base Mainnet (8453) and Base Sepolia (84532)
- Incoming USDC transfers to the fund wallet are detected automatically and credited to the investor's portfolio with NAV-based token allocation
- Deposits below the $5 minimum are automatically refunded to the originating wallet — refund TX hash stored and displayed to the investor
- Three real testnet transactions confirmed on Base Sepolia during Wave 2: AI×Crypto ($5), RWA ($5), DePIN ($5) — AUM reached $14.59

### Dual Network Architecture
- Testnet (Base Sepolia, orange banner) and Mainnet (Base, green toggle) run as fully independent environments
- All state — portfolios, deposits, NAV, activity logs — is isolated per network
- Single toggle switches context with no data leakage between environments

### Investor Dashboard
- Real-time portfolio value, P&L, 30-day return
- HWM-based performance fee tracker (15% above high-water mark)
- NAV chart with synthetic daily series anchored to real inception/current NAV
- Full deposit history with ISO timestamps rendered in the viewer's local timezone
- AI Activity Feed: deposit, refund, and withdrawal events translated in real time on language switch

### Transparency Page
- Live rebalance history, constituent allocation breakdown, AI rationale per token
- Investor deposit timeline — all sourced from real on-chain and backend data, no mocks

### What's New Page
- Dedicated section showcasing SoSoValue API and SoDEX API integrations with function signatures — available in all 7 languages

### Internationalization (7 Languages)
- Full i18n coverage across all pages: English, Portuguese BR, Chinese, Japanese, Hindi, Indonesian, Korean
- All Wave 2 features fully translated — language switch is instant, no page reload

### Admin Panel
- Fund wallet live balance (ETH + USDC) per network
- Full movement history (deposits, refunds, withdrawals, manual credits) with expandable TX details and Basescan links

---

## Buildathon

Built for the **SoDEX × SoSoValue Buildathon** — Wave 2 submission.

- SoSoValue API used throughout the agent decision pipeline
- SoDEX Spot API used for all trade execution
- Real on-chain deposits and auto-refunds on Base Mainnet + Base Sepolia
- Deployed on SoSoValue ValueChain mainnet (chainId 286623)
- Fund wallet on Base network accepting USDC deposits

> Wave 1 code preserved in the [`wave1`](https://github.com/markinho1970/sosomon/tree/wave1) branch.

---

## License

MIT — open source for public audit and community contribution.
