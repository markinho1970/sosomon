# SoSoMon — AI-Managed Thematic Crypto Indexes

> Built on SoSoValue ValueChain · Powered by SoDEX · Managed by AI · Wave 3 Builtathon

**SoSoMon** is a one-person on-chain financial business that runs autonomous AI agents to manage thematic crypto index funds. Users deposit USDC on Base, the platform allocates capital across curated token baskets, and AI agents handle everything — daily screening, autonomous rebalancing, risk management, and weekly reporting — with human approval on every execution.

**100% SoSoValue + SoDEX** — all market data, price feeds, token universe, and trade execution come exclusively from SoSoValue and SoDEX. No third-party APIs. No CoinGecko.

---

## Live Demo

| Resource | URL |
|---|---|
| **App** | https://sosomon.ekem.com.br:8443 |
| **API Docs (Swagger)** | https://sosomon.ekem.com.br:8443/api/docs |
| **Public Audit Trail** | https://sosomon.ekem.com.br:8443/api/audit/proposals |
| **On-Chain Fund Wallet** | https://basescan.org/address/0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b |

---

## Network Environments

SoSoMon runs **two fully independent environments** — investors choose before connecting their wallet.

### 🟢 Mainnet (Base, Chain ID 8453) — **OPEN**
- Real USDC deposits detected on Base Mainnet via `eth_getLogs`
- Real token purchases executed on SoDEX mainnet (`mainnet-gw.sodex.dev`)
- Real NAV tracked from live SoDEX prices
- Real management (2%/yr) and performance (20% HWM) fees
- Fund wallet: `0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b` on Basescan

### 🧪 Testnet (Base Sepolia, Chain ID 84532) — Always available
- Simulated USDC (no real value) — testnet faucet at `/faucet-sepolia`
- Same deposit/buy/sell/NAV/rebalance flow as mainnet — 100% functional
- SoDEX testnet gateway: `testnet-gw.sodex.dev`
- Same fund wallet address, different USDC contract (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)
- Use to explore SoSoMon without real risk

**Network isolation is strict:** a wallet connected on testnet cannot make mainnet deposits, and vice versa. The network is locked at wallet connection and resets to mainnet on disconnect.

---

## The Three Indexes

### AI & Tech Index (`ai-crypto-infrastructure`)
> Thematic: AI, Large Tech, Layer-1 infrastructure

| Token | Symbol | Weight | Type |
|---|---|---|---|
| Mag7 SSI Index | vMAG7.ssi | 40% | SoSoValue SSI — Magnificent 7 stocks synthetic |
| Ethereum | vETH | 20% | Layer-1 |
| Solana | vSOL | 15% | Layer-1 |
| SoSo Token | WSOSO | 15% | SoSoValue ecosystem |
| Bitcoin | vBTC | 10% | Store of value |

### DeFi Infrastructure Index (`depin-momentum`)
> Thematic: Decentralized Finance protocols

| Token | Symbol | Weight | Type |
|---|---|---|---|
| DeFi SSI Index | vDEFI.ssi | 40% | SoSoValue SSI — DeFi blue chips |
| Aave | vAAVE | 20% | Lending protocol |
| Uniswap | vUNI | 20% | DEX |
| Chainlink | vLINK | 20% | Oracle infrastructure |

### Real World Assets Index (`real-world-assets-top10`)
> Thematic: Tokenized real-world assets and stores of value

| Token | Symbol | Weight | Type |
|---|---|---|---|
| US Stock SSI Index | vUSSI | 35% | SoSoValue SSI — US equities synthetic |
| Gold Token | vXAUt | 30% | Tokenized gold |
| Bitcoin | vBTC | 20% | Digital store of value |
| SoSo Token | WSOSO | 15% | SoSoValue ecosystem |

### Anchor Tokens (never removed by AI agents)
`vMAG7.ssi`, `vDEFI.ssi`, `vUSSI`, `WSOSO` are permanent anchors — they define the thematic thesis of each index. Only explicit founder action can change them.

---

## SoDEX Token Universe — Confirmed Live (2026-07-10)

SoDEX mainnet has **34 markets total** — 25 TRADING + 9 HALT.

### TRADING (25 tokens — can be bought/sold)
`WSOSO` · `vAAVE` · `vADA` · `vARB` · `vAVAX` · `vBNB` · `vBTC` · `vDEFI.ssi` · `vDOGE` · `vETH` · `vHYPE` · `vLINK` · `vLTC` · `vMAG7.ssi` · `vMEME.ssi` · `vPEPE` · `vSHIB` · `vSOL` · `vSUI` · `vUNI` · `vUSDT` · `vUSSI` · `vXAUt` · `vXLM` · `vXRP`

### HALT (9 tokens — listed but trading suspended)
`vAAPL` · `vAMZN` · `vGOOGL` · `vMETA` · `vMSFT` · `vNVDA` · `vTON` · `vTSLA` · `vZEC`

> HALT tokens are automatically excluded from baskets. The Scout and Rebalancer both check HALT status before any buy/add action.

---

## AI Agents

### Scout — Daily Screening (06:00 UTC)
- Fetches SSI constituents from SoSoValue API for each theme (ssiAI, ssiRWA, ssiDEFI)
- Enriches candidates with live SoDEX prices and 30d momentum from candles
- **Ejection rule:** any basket token with >−40% loss in 7 days → immediate ejection proposal
- **Cooldown:** ejected tokens cannot re-enter for 90 days
- **HALT guard:** tokens with HALT status on SoDEX are blocked from inclusion even if SSI-ranked
- **Anchor protection:** `vMAG7.ssi`, `vDEFI.ssi`, `vUSSI`, `WSOSO` are immune to Scout exclusions
- **Replacement rule:** Scout only recommends removing a token if it has a validated SoDEX-listed replacement ready. No replacements available → no removals recommended
- Powered by Google Gemini

### Rebalancer — Portfolio Maintenance (Mon 08:00 UTC + drift check every 4h)
- **Drift detection:** estimates each token's current market weight from 7d price changes, compares against each token's actual target weight (not equal weight). Triggers if drift > 5%
- **Drift scope:** drift trigger adjusts weights only — never removes or replaces tokens. Token replacement only via weekly or emergency triggers
- **HALT awareness:** fetches SoDEX HALT status before generating proposals; LLM is explicitly informed which tokens cannot be traded
- **Human approval mandatory** before any execution — no autonomous trading
- Reads macro sentiment from SoSoValue (0–100 score):
  - Score < 25 → 30% USDC buffer
  - Score < 15 → 50% USDC buffer
- Enforces max 25% weight per single token
- Executes trades on SoDEX via EIP-712 signed batch orders

### Deposit Monitor — On-Chain Settlement (every 2 min)
- Polls `eth_getLogs` on Base Mainnet (8453) and Base Sepolia (84532) simultaneously
- Detects USDC `Transfer` events to the fund wallet
- On confirmed deposit: validates amount, buys index tokens at current NAV via SoDEX, records to portfolio
- Deposits below minimum ($5 per token slot): automatic USDC refund to sender
- Last scanned block persisted to `system_state` — survives PM2 restarts without missing deposits

### NAV Updater — Hourly Price Update
- Fetches all live prices from SoDEX `get_all_tickers()` — no external data
- Recognizes SoDEX `v`-prefixed tokens (`vUSDC`, `vETH`) correctly as stablecoin or priced asset
- **Sanity guard:** price movement >5%/hr is rejected and logged — prevents corrupt data from distorting NAV
- Updates portfolio values and P&L for all investors

### Narrator — Weekly Alpha Memo (Sun 18:00 UTC)
- Generates weekly market commentary using real SoSoValue data
- Inputs: BTC/ETH ETF flows, macro calendar (CPI, NFP, FOMC), sector sentiment, hot news
- Outputs: draft memo saved to file — founder reviews before publishing

### Fee Manager — Monthly (Day 1, 08:00 UTC)
- **Management fee:** 2%/year pro-rated monthly on AUM
- **Performance fee:** 20% on profits above the high-water mark (HWM)

---

## Security Architecture

### Admin Authentication — EIP-191 Wallet Signature
All admin endpoints (`/api/admin/*`) require a signed message:
- **Message:** `SoSoMon Admin Access\nWallet: {address}\nTimestamp: {ISO8601}`
- **Validation:** `eth_account.Account.recover_message()` → must match hardcoded founder wallet
- **Replay protection:** timestamp must be within 1 hour of server time
- **No session tokens, no passwords** — stateless, re-verified on every request

### Investor Protection — EIP-191 Risk Consent
Before any deposit is attributed, the investor must:
1. Read and check all 8 risk disclosure items in the UI
2. Sign the full risk disclosure with their wallet (EIP-191)
3. Signature stored in `investment_consents` with wallet, terms version, signed message, timestamp

No signature → no deposit attribution.

### Risk Management System

| Rule | Value | Description |
|---|---|---|
| Ejection threshold | −40% / 7 days | Token removed from basket if breached |
| Post-ejection cooldown | 90 days | Token cannot re-enter any index |
| Max single-token weight | 25% | Excess redistributed proportionally |
| Stablecoin buffer (fear) | Sentiment < 25 → 30% USDC | Defensive allocation |
| Stablecoin buffer (extreme fear) | Sentiment < 15 → 50% USDC | Maximum defensive posture |
| NAV sanity guard | >5%/hr blocked | Corrupt price data rejected |
| Human approval | Mandatory | No rebalance executes without founder sign-off |
| Anchor tokens | 4 tokens immune | MAG7ssi, DEFIssi, USSIssi, WSOSO cannot be removed by agents |
| Drift-only rule | Drift trigger = weight adjust only | Token replacement requires weekly or emergency trigger |

### Audit Trail — Two Layers

**Layer 1 — File-based (SHA-256 signed):**
Every executed proposal writes a JSON record to `backend/audit/proposals/`:
```json
{
  "proposal_id": 42,
  "index_id": "ai-crypto-infrastructure",
  "trigger": "weekly",
  "changes": [{"symbol": "AAVE", "old_weight": 20, "new_weight": 25, "action": "increase"}],
  "executed_at": "2026-06-23T14:30:00",
  "network_mode": "mainnet",
  "sha256": "a3f8c2..."
}
```
Public endpoint: `GET /api/audit/proposals` — verifies integrity on read.

**Layer 2 — On-chain (Basescan):**
Every execution emits a 0 ETH Base transaction with calldata:
```
SoSoMon Rebalance #42 | ai-crypto-infrastructure | mainnet | AAVE 20%→25% | executed:2026-06-23T14:30:00
```
Permanent, immutable, verifiable on Basescan without trusting SoSoMon.

### Private Key Security
- SoDEX private key stored encrypted with **AES-256-GCM** at rest
- `MASTER_ENCRYPTION_KEY` set only in server environment — never in source code
- `.env` files excluded via `.gitignore` — never committed

---

## What's New — July 2026

### Mainnet Open for Investors
Real USDC deposits on Base Mainnet are now fully active. SoDEX mainnet gateway processes real token purchases. NAV reflects real market prices from SoDEX live tickers.

### Treasury Admin Panel — 4-Card Layout
The admin Treasury tab now shows a complete financial reconciliation:
- **Reconciliation card:** total assets (on-chain + SoDEX) vs investor AUM → admin balance
- **Fund Wallet card:** ETH gas + USDC on-chain + full SoDEX position breakdown
- **Investor Portfolios card:** all investor wallets with individual values and P&L
- **SoDEX Positions card:** live token positions in the fund wallet

### Agent Protection Layer — Rebalancer
- **Correct drift calculation:** compares each token's estimated market weight against its actual target weight, not an artificial equal-weight baseline
- **HALT detection:** fetches SoDEX market status before generating proposals; LLM prompt explicitly lists HALT tokens and prohibits buy/add for them
- **Basket filter:** query now correctly filters `in_basket=True, network_mode=mainnet` — candidate tokens with weight=0% can no longer appear in proposals
- **Drift scope:** drift trigger cannot remove or replace tokens — only weight adjustments allowed

### Agent Protection Layer — Scout
- **Permanent anchors:** `vMAG7.ssi`, `vDEFI.ssi`, `vUSSI`, `WSOSO` are immune to exclusion recommendations regardless of SSI ranking changes
- **No-replacement rule:** if no SoDEX-validated replacement token is available, exclusion recommendations are suppressed. The basket is kept intact rather than emptied
- **HALT filter:** tokens with HALT status are excluded from inclusions even if they have a SoDEX ticker
- **SSI context:** SSI API provides macro/benchmark context and candidate rankings. Basket changes only happen when SSI-ranked tokens are also TRADING on SoDEX

### vUSDC / vETH Token Recognition
SoDEX mainnet uses `v`-prefixed token symbols (`vUSDC`, `vETH`). All stablecoin detection and price lookup logic now correctly handles both plain (`USDC`) and prefixed (`vUSDC`) formats.

### Dashboard F5 Fix
Dashboard data now loads correctly after hard refresh. Switched from `Promise.all` (which silently discarded all data on any single API failure) to `Promise.allSettled` (each API call independent — partial results displayed on failure).

---

## What's New — Wave 3 RC2 (2026-06)

### Security & Transparency — All Four Gaps Implemented

#### Gap 1 — Quantitative Risk Data in UI
Every index page shows a risk panel per token:
- **Ejection risk bar** (0–100%) — proximity to the −40%/7d ejection threshold
- 7-day and 30-day returns per token
- Risk rules panel — ejection threshold, cooldown period, max weight, stablecoin buffer triggers
- Last rebalance proposal — changes, trigger, status, AI rationale

#### Gap 2 — Cooldown Dashboard
Tokens ejected for breaching the risk threshold enter a **90-day cooldown**. The risk panel shows:
- All tokens in cooldown with ejection date, re-entry date, days remaining
- Sourced from `agent_activity` logs — updated automatically each Scout run

#### Gap 3 — External Audit Trail (SHA-256)
Every executed rebalance proposal persisted as a signed JSON file at `backend/audit/proposals/`:
- SHA-256 hash embedded — integrity verifiable by anyone with API access
- Public endpoint: `GET /api/audit/proposals`

#### Gap 4 — On-Chain Event per Rebalance
Every executed rebalance emits a 0 ETH Base transaction with human-readable calldata:
- Destination: `0x000000000000000000000000000000000000dEaD` (burn address)
- Permanent, immutable, verifiable on Basescan — no smart contract needed

### Independent Network Architecture
- `network_mode` column on `IndexConstituent`, `RebalanceProposal`, `SubscriberPortfolio`, `InvestmentIntent`
- Investor network locked after wallet connection
- Admin toggles freely — all endpoints filter by `?network_mode=`

### i18n — 7 Languages
English · Portuguese BR · Chinese · Japanese · Hindi · Indonesian · Korean — 100% coverage

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         SoSoMon                                │
│                                                                │
│  Next.js Frontend (React 18, TypeScript, wagmi v2)             │
│  ├── /                  Home — live stats, network selector    │
│  ├── /indexes           Index list with NAV, return, min deposit│
│  ├── /indexes/[slug]    Detail — constituents, risk panel, invest│
│  ├── /dashboard         Investor portfolio — P&L, history       │
│  ├── /transparency      Agent activity log, rebalance history   │
│  ├── /faucet-sepolia    Testnet ETH faucet (Base Sepolia)       │
│  ├── /whats-new         Feature changelog                       │
│  └── /admin             Wallet-signed admin panel (EIP-191)     │
│                                                                │
│  FastAPI Backend (Python 3.11)                                 │
│  ├── /api/indexes        Index data + constituents + /risk      │
│  ├── /api/macro          SoSoValue macro context                │
│  ├── /api/agents         AI activity log                        │
│  ├── /api/invest         Portfolio, fund wallet, invest, withdraw│
│  ├── /api/stats          Public platform stats                  │
│  ├── /api/audit          /deposits + /proposals (public)        │
│  ├── /api/performance    NAV chart data                         │
│  └── /api/admin          Admin operations (EIP-191 protected)   │
│                                                                │
│  APScheduler                                                   │
│  ├── Scout        — daily 06:00 UTC                            │
│  ├── Rebalancer   — Mon 08:00 UTC + drift every 4h             │
│  ├── NAV Updater  — every 1h                                   │
│  ├── Deposit Monitor — every 2 minutes (mainnet + testnet)      │
│  └── Fee Manager  — 1st of month, 08:00 UTC                    │
│                                                                │
│  SQLite DB                                                     │
│  ├── indexes               Index definitions + NAV             │
│  ├── constituents          Token weights, prices, network_mode  │
│  ├── rebalance_proposals   Proposals with status + audit        │
│  ├── subscribers           Investor wallets                     │
│  ├── portfolios            Positions, HWM, network_mode         │
│  ├── agent_activity        Full event log (deposits, ejections…)│
│  ├── investment_consents   EIP-191 signed risk disclosures      │
│  ├── system_state          Persistent KV (last_block, etc.)     │
│  └── faucet_claims         Testnet ETH claim history            │
│                                                                │
│  File-based Audit                                              │
│  └── audit/proposals/*.json  SHA-256 signed rebalance records  │
└────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
   SoSoValue API                   SoDEX Spot API
   (market intelligence)           (trade execution)
           │                              │
           └──────────────────────────────┘
                          │
                          ▼
               Base Mainnet (8453) + Base Sepolia (84532)
               SoSoValue ValueChain (chainId: 286623)
                          │
                          ▼
               On-chain rebalance events → Basescan
```

---

## SoSoValue Integration

**Base URL:** `https://openapi.sosovalue.com/openapi/v1`
**Auth:** `x-soso-api-key` header · Rate limit: 20 req/min

| Endpoint | Agent | Usage |
|---|---|---|
| `/currencies/sector-spotlight` | Scout, Rebalancer | 24h sector performance → sentiment score (0–100) |
| `/indices/{ticker}/constituents` | Scout | SSI ranked token universe per theme |
| `/indices/{ticker}/market-snapshot` | Scout | SSI benchmark performance |
| `/etfs/summary-history` | Narrator | BTC/ETH ETF flow data |
| `/news/hot` | Scout, Narrator | Market news for agent reasoning |
| `/macro/events` | Narrator | CPI, NFP, FOMC calendar |

**Sentiment Score:**
```
sentiment = avg(sector_24h_changes) → normalized 0–100
          + ETF_flow_adjustment (positive inflows: +3 to +8 pts)
```
Drives all risk decisions: buffer allocations, rebalance urgency, scout aggressiveness.

---

## SoDEX Integration

**Mainnet:** `https://mainnet-gw.sodex.dev/api/v1/spot`
**Testnet:** `https://testnet-gw.sodex.dev/api/v1/spot`

| Feature | Endpoint | Notes |
|---|---|---|
| Token universe | `GET /markets/symbols` | Source of truth for TRADING/HALT status |
| Live prices | `GET /markets/tickers` | NAV Updater + Rebalancer |
| Price history | `GET /markets/{sym}/klines` | 7d/30d returns for Scout and risk panel |
| Portfolio | `GET /accounts/{addr}/balances` | Fund wallet positions |
| Batch orders | `POST /trade/orders/batch` | EIP-712 signed |

**Authentication:** EIP-712 `ExchangeAction` typed data — chainId `286623`, nonce: unix ms timestamp, `0x01` prefix.

---

## On-Chain Addresses

| Resource | Network | Address |
|---|---|---|
| Fund Wallet | Base Mainnet (8453) | `0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b` |
| Fund Wallet | Base Sepolia (84532) | Same address — different USDC contract |
| USDC | Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDC | Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Rebalance Audit | Base Mainnet | `0x000000000000000000000000000000000000dEaD` (calldata target) |

---

## Revenue Model

| Fee | Rate | Description |
|---|---|---|
| Management fee | **2% / year** | Pro-rated monthly on AUM |
| Performance fee | **20%** | On profits above high-water mark (HWM) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, wagmi v2, RainbowKit v2 |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, APScheduler 4, Pydantic v2 |
| Database | SQLite (upgradeable to PostgreSQL) |
| AI | Google Gemini 2.5 Flash (agent reasoning) |
| Blockchain | Base (USDC deposits + audit logging), SoSoValue ValueChain (trading) |
| Auth | EIP-191 (admin + investor consent), EIP-712 (SoDEX trading) |
| Infra | Ubuntu 24.04, Nginx, PM2, Let's Encrypt |
| Encryption | AES-256-GCM (private keys at rest) |

---

## Setup

### Prerequisites
- Python 3.11+, Node.js 18+
- SoSoValue API key (`x-soso-api-key`)
- SoDEX account with API key
- Google Gemini API key
- Wallet with ETH on Base (gas for on-chain audit events)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in all keys
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm start
```

### Environment Variables

```env
# SoDEX
SODEX_PRIVATE_KEY_ENC=<AES-256-GCM encrypted>
SODEX_WALLET_ADDRESS=0x...
SODEX_ACCOUNT_ID=0
SODEX_USE_TESTNET=false        # true = testnet SoDEX gateway

# Fund wallet (Base — receives USDC deposits)
FUND_WALLET_ADDRESS=0x...
TESTNET_FUND_WALLET_ADDRESS=0x...   # optional, defaults to FUND_WALLET_ADDRESS

# Encryption
MASTER_ENCRYPTION_KEY=<32-byte hex>

# AI
GEMINI_API_KEY=...
OPENAI_API_KEY=...   # fallback

# SoSoValue
SOSOVALUE_API_KEY=...

# Base RPC
BASE_RPC_URL=https://mainnet.base.org

# Notifications (optional)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

**Encrypting the SoDEX private key:**
```bash
cd backend
python utils/crypto.py encrypt "0xYOUR_PRIVATE_KEY"
# → paste output into SODEX_PRIVATE_KEY_ENC
```

### Production Deploy (PM2)

```bash
# Backend
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name alphagrid-backend --cwd /opt/alphagrid/backend

# Frontend (after npm run build)
pm2 start "npm start" --name alphagrid-frontend --cwd /opt/alphagrid/frontend
```

### Database Migrations (run in order on a fresh server)

```bash
cd backend
python migrate_constituent_network_mode.py
python migrate_proposal_network_mode.py
python migrate_indexes_wave3.py
python migrate_target_constituents.py
python migrate_add_in_basket.py
```

---

## Key Backend Files

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app — `load_dotenv()` must be first line |
| `backend/models.py` | SQLAlchemy models — `network_mode`, `in_basket`, `target_constituents` |
| `backend/agents/scout.py` | Daily screening — SSI candidates, SoDEX enrichment, HALT filter, anchor protection |
| `backend/agents/rebalancer.py` | Rebalance proposals — real drift calc, HALT detection, `in_basket` filter |
| `backend/agents/narrator.py` | Weekly AI market commentary — saves drafts, founder publishes |
| `backend/services/sodex.py` | SoDEX API — markets, tickers (vUSDC aware), orders, portfolio snapshot |
| `backend/services/sosovalue.py` | SoSoValue API — SSI, macro, ETF flows, news, sentiment score |
| `backend/services/deposit_monitor.py` | Base chain polling — USDC detection, auto-refund, portfolio credit |
| `backend/services/nav_updater.py` | Hourly NAV — 100% SoDEX tickers, sanity guard, vUSDC/vETH aware |
| `backend/services/fee_manager.py` | Management + performance fees |
| `backend/services/onchain_logger.py` | 0 ETH Base tx with rebalance calldata |
| `backend/api/admin.py` | Admin endpoints — EIP-191 auth, Treasury reconciliation |
| `backend/api/audit.py` | Public audit: `/deposits` + `/proposals` with SHA-256 verification |
| `backend/api/indexes.py` | Index data + `/risk` — ejection risk, cooldown tokens |

---

## Public API Endpoints

### Public (no auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/indexes` | List all active indexes |
| GET | `/api/indexes/{slug}` | Index detail with constituents |
| GET | `/api/indexes/{slug}/risk` | Risk data: ejection risk, cooldown tokens, risk rules |
| GET | `/api/macro` | SoSoValue macro context + sentiment score |
| GET | `/api/stats` | Platform stats (AUM, subscribers, rebalances) |
| GET | `/api/audit/deposits` | On-chain deposits detected by Deposit Monitor |
| GET | `/api/audit/proposals` | Executed rebalance proposals with SHA-256 verification |
| GET | `/api/agents/activity` | Recent agent activity log |
| GET | `/api/performance/{index_id}` | NAV chart data |

### Investor

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/invest/portfolio/{wallet}` | Investor portfolio with P&L |
| GET | `/api/invest/fund-wallet` | Fund wallet address + USDC balance |
| POST | `/api/invest/register-consent` | Record signed risk disclosure |
| POST | `/api/invest/withdraw` | Execute withdrawal |

### Admin (EIP-191 signature required)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/auth` | Verify admin signature |
| GET | `/api/admin/proposals` | List proposals |
| POST | `/api/admin/proposals/{id}/approve` | Approve proposal |
| POST | `/api/admin/proposals/{id}/reject` | Reject proposal |
| POST | `/api/admin/proposals/{id}/execute` | Execute (writes audit file + on-chain event) |
| POST | `/api/admin/run-rebalancer` | Trigger rebalancer manually |
| GET | `/api/admin/fund-wallet` | Fund wallet with live ETH + USDC + SoDEX positions |
| GET | `/api/admin/investors` | All investor portfolios |
| GET | `/api/admin/stats` | Admin dashboard stats |

---

## Buildathon

Built for the **SoDEX × SoSoValue Builtathon** — Wave 3 submission.

- SoSoValue API used throughout the entire agent decision pipeline
- SoDEX Spot API for all trade execution (EIP-712 signed)
- Real on-chain deposits and auto-refunds on Base Mainnet + Base Sepolia
- Deployed on SoSoValue ValueChain mainnet (chainId 286623)
- Fund wallet publicly auditable on Basescan
- Each rebalance leaves a permanent on-chain record

> Wave 1 code preserved in the [`wave1`](https://github.com/markinho1970/sosomon/tree/wave1) branch.

---

## License

MIT — open source for public audit and community contribution.
