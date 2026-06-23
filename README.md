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

## What's New — Wave 3 RC2 (2026-06)

### Security & Transparency Gaps — All Implemented

Four investor-protection features requested by the Wave 3 evaluators, now fully operational:

#### Gap 1 — Quantitative Risk Data in the UI
Every index page now shows a quantitative risk panel per token:
- **Ejection risk bar** (0–100%) — how close each token is to the −40%/7d ejection threshold
- **7-day and 30-day returns** displayed per token
- **Risk rules panel** — ejection threshold, cooldown period, max weight, stablecoin buffer triggers
- **Last rebalance proposal** — changes, trigger, status, AI rationale

#### Gap 2 — Real-Time Cooldown Dashboard
Tokens ejected by the Scout agent for breaching the risk threshold enter a **90-day cooldown** before they can re-enter any index. The risk panel shows:
- All tokens currently in cooldown with ejection date
- Re-entry date and days remaining
- Reason for ejection (scout rationale)

Sourced from `agent_activity` logs — updated automatically every time the Scout runs.

#### Gap 3 — External Audit Trail (SHA-256 Signed)
Every executed rebalance proposal is persisted as a **signed JSON file** on the server:
- Location: `/opt/alphagrid/backend/audit/proposals/`
- Each file includes: proposal ID, index, trigger, changes, AI rationale, timestamps, network mode
- **SHA-256 hash** of the canonical record embedded in the file for integrity verification
- Public endpoint: `GET /api/audit/proposals` — returns all executed proposals with hash verification status

Developers and auditors can verify independently that no proposal was altered after execution.

#### Gap 4 — On-Chain Event per Rebalance (Basescan)
Every executed rebalance emits a **0 ETH transaction on Base** with a human-readable summary in calldata:
```
SoSoMon Rebalance #42 | ai-crypto-infrastructure | mainnet | AAVE 20%→25%, UNI 25%→20% | executed:2026-06-23T14:30:00
```
- Destination: `0x000000000000000000000000000000000000dEaD` (burn address — no smart contract needed)
- Verifiable on [Basescan](https://basescan.org) forever
- Supports both mainnet and testnet (Base Sepolia)
- Non-blocking: backend logs a warning but never fails execution if emission fails

### Independent Network Architecture (Testnet / Mainnet)
- Testnet (Base Sepolia) and Mainnet (Base) run as fully independent environments
- `network_mode` column in `IndexConstituent`, `RebalanceProposal`, `SubscriberPortfolio`, `InvestmentIntent`
- Investor network is locked after wallet connection (prevents accidental network switch)
- Admin can toggle freely between networks at any time
- SoDEX testnet gateway: `testnet-gw.sodex.dev` — full simulation before any real execution

### Admin Panel — Full Rewrite
Complete rewrite of the admin panel with 5 tabs and network filtering:
- **Stats** — AUM, subscribers, active indexes, pending proposals per network
- **Propostas** — approve / reject / execute / dry-run per proposal
- **Cestas** — view and edit index constituents per network
- **Portfolios** — all investor portfolios with P&L, reset tools
- **Atividade** — full system event log

### i18n — 7 Languages
Full coverage across all pages: English · Portuguese BR · Chinese · Japanese · Hindi · Indonesian · Korean

---

## The Three Indexes

| Index | Slug | Description |
|---|---|---|
| AI & Tech | `ai-crypto-infrastructure` | SSI AI index (vMAG7) + ETH, SOL, NVDA, WSOSO |
| Real World Assets | `real-world-assets` | SSI RWA index (vUSSI) + Gold (vXAUt), BTC, WSOSO |
| DeFi Infrastructure | `defi-infrastructure` | SSI DeFi index (vDEFI) + AAVE, UNI, LINK |

All indexes include a **vMAG7.ssi / vDEFI.ssi / vUSSI.ssi** SSI token from SoSoValue — giving direct exposure to SoSoValue's curated thematic baskets.

### Token Status (Mainnet)

| Status | Tokens |
|---|---|
| **TRADING** | ETH, BTC, SOL, AAVE, UNI, LINK, MAG7.ssi, DEFI.ssi, XAUt, USSI, WSOSO |
| **HALT** (excluded from mainnet baskets) | NVDA, TSLA, AAPL, GOOGL, META, MSFT, AMZN, ZEC |

Scout detects HALT status from SoDEX markets and automatically excludes those tokens from the active network's baskets.

---

## AI Agents

### Scout — Daily Screening (06:00 UTC)
- Screens all TRADING tokens from SoDEX markets + SoSoValue SSI constituents
- Reads SoSoValue macro context: sector flows, ETF inflows, news sentiment, macro calendar
- Evaluates each token for inclusion/exclusion based on: volume, price momentum, liquidity, AI rationale
- **Ejection rule:** any token with >−40% loss in 7 days is immediately proposed for ejection
- **Cooldown:** ejected tokens cannot re-enter for 90 days (tracked in `agent_activity`)
- Generates ranked proposals with AI rationale — saved to DB for admin review
- Powered by Google Gemini

### Rebalancer — Portfolio Maintenance (Mon 08:00 UTC + drift every 4h)
- Monitors portfolio drift vs target weights — triggers rebalance if any token drifts >5%
- Reads macro sentiment score derived from SoSoValue data (0–100 scale):
  - Score < 25 → 30% USDC buffer
  - Score < 15 → 50% USDC buffer
- Enforces max 25% weight per single token (iterative redistribution)
- Calculates minimum deposit based on smallest weight (e.g., 10% weight → $50 minimum)
- **Human approval mandatory** before any execution — no fully autonomous trading
- Executes trades on SoDEX via EIP-712 signed batch orders

### Narrator — Weekly Alpha Memo (Sun 18:00 UTC)
- Generates weekly market commentary using real SoSoValue data
- Inputs: BTC/ETH ETF flows, macro calendar (CPI, NFP, FOMC), sector sentiment, hot news
- Outputs: AI-authored memo stored in `rebalance_summary` — displayed on index pages

### Deposit Monitor — On-Chain Settlement (every 2 min)
- Polls `eth_getLogs` on Base Mainnet (8453) and Base Sepolia (84532) simultaneously
- Detects USDC `Transfer` events to the fund wallet
- On confirmed deposit: validates amount, allocates index tokens at current NAV, records to portfolio
- Deposits below minimum ($5 per token): triggers automatic USDC refund to sender
- Last scanned block persisted to `system_state` DB — survives PM2 restarts without missing deposits

### NAV Updater — Hourly Price Update
- Fetches all live prices from SoDEX `get_all_tickers()`
- Updates `current_price_usd` for all constituents
- Recalculates index NAV as weighted average of constituent prices
- **Sanity guard:** price movement >5% in one hour is rejected and logged as an error — prevents corrupt data from entering NAV

### Fee Manager — Monthly (Day 1, 08:00 UTC)
- **Management fee:** 2%/year pro-rated monthly on AUM
- **Performance fee:** 20% on profits above the high-water mark (HWM)
- Fees tracked per subscriber portfolio and deducted from `current_value_usd`

---

## Security Architecture

### Admin Authentication — EIP-191 Wallet Signature
All admin endpoints (`/api/admin/*`) require a cryptographically signed message:
- **Message format:** `SoSoMon Admin Access\nWallet: {address}\nTimestamp: {ISO8601}`
- **Validation:** `eth_account.Account.recover_message()` → recovered address must match the hardcoded founder wallet
- **Replay protection:** timestamp in the message must be within 1 hour of server time
- **No session tokens, no passwords** — stateless, every request re-verified

```python
# Every admin endpoint checks:
def require_admin(x_wallet_address, x_signature, x_sign_message):
    recovered = Account.recover_message(msg_encoded, signature=x_signature)
    if recovered.lower() != ADMIN_WALLET:
        raise HTTPException(401)
    # + timestamp freshness check
```

### Investor Protection — EIP-191 Risk Consent
Before any deposit can be attributed, the investor must:
1. Read and check all 8 risk disclosure items
2. Sign the full risk disclosure with their wallet (EIP-191)
3. Signature stored in `investment_consents` table with: wallet address, terms version, signed message, timestamp

No signature → no deposit attribution.

### Risk Management System

| Rule | Value | Description |
|---|---|---|
| Ejection threshold | −40% / 7 days | Token removed from basket if breached |
| Post-ejection cooldown | 90 days | Token cannot re-enter any index |
| Max single-token weight | 25% | Excess redistributed proportionally |
| Stablecoin buffer (low sentinel.) | Sentiment < 25 → 30% USDC | Defensive allocation |
| Stablecoin buffer (critical) | Sentiment < 15 → 50% USDC | Maximum defensive posture |
| NAV sanity guard | >5%/hr blocked | Corrupt price data rejected |
| Human approval | Mandatory | No rebalance executes without founder sign-off |

### Audit Trail — Two Layers

**Layer 1 — File-based (SHA-256 signed):**
Every executed proposal writes a JSON record to `backend/audit/proposals/`:
```json
{
  "proposal_id": 42,
  "index_id": "ai-crypto-infrastructure",
  "trigger": "weekly",
  "changes": [{"symbol": "AAVE", "old_weight": 20, "new_weight": 25, "action": "weight_increase"}],
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
Permanent, immutable, verifiable by anyone on Basescan without trusting SoSoMon.

### Private Key Security
- All sensitive values stored encrypted with **AES-256-GCM** at rest
- `MASTER_ENCRYPTION_KEY` set only in server environment — never in source code
- `backend/utils/crypto.py` — encrypt before storing, decrypt only at runtime
- `.env` files excluded via `.gitignore` — never committed

---

## SoSoValue Integration

**Base URL:** `https://openapi.sosovalue.com/openapi/v1`

| Endpoint | Agent | Usage |
|---|---|---|
| `/currencies/sector-spotlight` | Scout, Rebalancer | 24h sector performance → proprietary sentiment score (0–100) |
| `/indices` + `/indices/{ticker}` | Scout | SSI index constituents as token universe |
| `/etfs/summary-history` | Scout, Narrator | BTC/ETH ETF flow data for macro context |
| `/news/hot` | Scout, Narrator | Market news for agent reasoning |
| `/macro/events` | Narrator | CPI, NFP, FOMC calendar |

**Sentiment Score derivation:**
```
sentiment_score = average(sector_24h_changes) normalized to 0–100
                + ETF_flow_adjustment (positive inflows push score up)
```
Score drives all risk decisions — buffer allocations, rebalance urgency, scout aggressiveness.

---

## SoDEX Integration

**Mainnet:** `https://mainnet-gw.sodex.dev/api/v1/spot`
**Testnet:** `https://testnet-gw.sodex.dev/api/v1/spot`

| Feature | Endpoint | Notes |
|---|---|---|
| Token universe | `GET /markets/symbols` | Source of truth for TRADING/HALT status |
| Live prices | `GET /markets/tickers` | Used by NAV Updater and Rebalancer |
| Price history | `GET /markets/{sym}/klines` | 7d/30d returns for Scout and risk panel |
| Portfolio snapshot | `GET /accounts/{addr}/balances` | Fund wallet positions |
| Trade history | `GET /accounts/{addr}/trades` | Execution audit |
| Batch orders | `POST /trade/orders/batch` | Signed with EIP-712 |
| Cancel orders | `DELETE /trade/orders/batch` | Signed with EIP-712 |

**Authentication:** EIP-712 `ExchangeAction` typed data
- Domain: chainId `286623` (SoSoValue ValueChain)
- Nonce: Unix timestamp in milliseconds
- Prefix: `0x01` before the raw signature

---

## On-Chain Addresses

| Resource | Network | Address |
|---|---|---|
| Fund Wallet | Base Mainnet (8453) | `0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b` |
| Fund Wallet | Base Sepolia (84532) | Same address — testnet USDC is a different token |
| USDC | Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDC | Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Rebalance Audit Log | Base Mainnet | `0x000000000000000000000000000000000000dEaD` (calldata tx target) |

**Verify on Basescan:**
- Mainnet fund wallet: https://basescan.org/address/0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b
- Testnet fund wallet: https://sepolia.basescan.org/address/0x935b2f2E58Bc0D8111062D615318e2aCb11F1D0b

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
│  ├── /faucet-sepolia    Testnet ETH faucet                      │
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
│  ├── /api/dashboard      Investor dashboard aggregation         │
│  ├── /api/faucet         Testnet ETH faucet                     │
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
│  ├── investment_intents    Deposit attribution                  │
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

## Revenue Model

| Fee | Rate | Description |
|---|---|---|
| Management fee | **2% / year** | Pro-rated monthly, charged on AUM |
| Performance fee | **20%** | On profits above high-water mark (HWM) |

Fees accrue automatically and are tracked per subscriber portfolio in `SubscriberPortfolio.high_water_mark_usd`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, wagmi v2, RainbowKit v2 |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, APScheduler 4, Pydantic v2 |
| Database | SQLite (file-based, upgradeable to PostgreSQL) |
| AI | Google Gemini 2.5 Flash (agent reasoning) |
| Blockchain | Base (USDC deposits + on-chain logging), SoSoValue ValueChain (trading) |
| Auth | EIP-191 (admin + investor consent), EIP-712 (SoDEX trading) |
| Infra | Ubuntu 24.04, Nginx (reverse proxy + SSL), PM2 (process manager), Let's Encrypt |
| Encryption | AES-256-GCM (private keys at rest) |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- SoSoValue API key
- SoDEX account with API key (from sodex.com)
- Google Gemini API key
- A wallet with ETH on Base (for gas — rebalance on-chain events)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in all required keys (see Environment Variables below)
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
# No .env.local needed — API calls are proxied through Next.js rewrites
npm run build
npm start
```

### Environment Variables

All secrets live in `backend/.env`. **Never commit this file** — it is in `.gitignore`.

```env
# SoDEX
SODEX_PRIVATE_KEY_ENC=<AES-256-GCM encrypted private key>
SODEX_WALLET_ADDRESS=0x...
SODEX_ACCOUNT_ID=0
SODEX_USE_TESTNET=true          # false for mainnet

# Fund wallet (Base network — receives USDC deposits)
FUND_WALLET_ADDRESS=0x...       # mainnet fund wallet
TESTNET_FUND_WALLET_ADDRESS=0x... # optional, defaults to FUND_WALLET_ADDRESS

# Encryption (protects all other encrypted values)
MASTER_ENCRYPTION_KEY=<32-byte hex>

# AI
GEMINI_API_KEY=...
OPENAI_API_KEY=...              # optional fallback

# Base network
BASE_RPC_URL=https://mainnet.base.org

# Notifications (optional)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

**Encrypting a private key:**
```bash
cd backend
python utils/crypto.py encrypt "0xYOUR_PRIVATE_KEY"
# Copy the output → SODEX_PRIVATE_KEY_ENC in .env
```

### Production Deploy (PM2)

```bash
# Backend
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name alphagrid-backend --cwd /opt/alphagrid/backend

# Frontend
pm2 start "npm start" --name alphagrid-frontend --cwd /opt/alphagrid/frontend
```

### Running Database Migrations

```bash
cd backend
python migrate_indexes_wave3.py --dry-run   # preview
python migrate_indexes_wave3.py --execute   # apply
```

---

## Key Backend Files

| File | Purpose |
|---|---|
| `backend/models.py` | All SQLAlchemy models — `network_mode` on Constituent, Proposal, Portfolio, Intent |
| `backend/agents/scout.py` | Daily token screening — SoDEX markets + SoSoValue SSI + ejection cooldown logic |
| `backend/agents/rebalancer.py` | Rebalance proposals + `apply_proposal()` + `execute_rebalance_trades()` |
| `backend/agents/narrator.py` | Weekly AI-generated market commentary |
| `backend/services/sodex.py` | SoDEX integration — markets, tickers, orders, portfolio |
| `backend/services/deposit_monitor.py` | Base chain polling, USDC detection, auto-refund, portfolio credit |
| `backend/services/nav_updater.py` | Hourly NAV update — 100% SoDEX tickers, sanity guard |
| `backend/services/withdrawal_executor.py` | ERC-20 USDC transfer on Base (signed, simulated before broadcast) |
| `backend/services/fee_manager.py` | Monthly management + performance fee collection |
| `backend/services/onchain_logger.py` | 0 ETH Base tx with rebalance calldata after each execution |
| `backend/api/admin.py` | Admin endpoints — EIP-191 auth, proposals, audit record writer |
| `backend/api/audit.py` | Public audit: `/deposits` + `/proposals` with SHA-256 verification |
| `backend/api/indexes.py` | Index data + `/risk` endpoint with ejection risk + cooldown tokens |
| `backend/utils/crypto.py` | AES-256-GCM encrypt/decrypt for private keys |
| `backend/full_audit.py` | Full system diagnostic script |

---

## Public API Endpoints

All endpoints return `{ "data": ..., "success": true }` except audit endpoints.

### Public (no auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/indexes` | List all active indexes |
| GET | `/api/indexes/{slug}` | Index detail with constituents |
| GET | `/api/indexes/{slug}/risk` | Risk data: ejection risk, cooldown tokens, risk rules |
| GET | `/api/macro` | SoSoValue macro context + sentiment score |
| GET | `/api/stats` | Platform stats (AUM, subscribers, rebalances) |
| GET | `/api/audit/deposits` | All on-chain deposits detected by Deposit Monitor |
| GET | `/api/audit/proposals` | All executed rebalance proposals with SHA-256 hashes |
| GET | `/api/agents/activity` | Recent agent activity log |
| GET | `/api/performance/{index_id}` | NAV chart data |

### Investor

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/invest/portfolio/{wallet}` | Investor portfolio |
| GET | `/api/invest/fund-wallet` | Fund wallet address + USDC balance |
| POST | `/api/invest` | Register investment intent |
| POST | `/api/invest/withdraw` | Execute withdrawal |

### Admin (EIP-191 signature required in headers)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/auth` | Verify admin signature |
| GET | `/api/admin/proposals` | List proposals |
| POST | `/api/admin/proposals/{id}/approve` | Approve proposal |
| POST | `/api/admin/proposals/{id}/reject` | Reject proposal |
| POST | `/api/admin/proposals/{id}/execute` | Execute proposal (writes audit + on-chain event) |
| POST | `/api/admin/run-rebalancer` | Trigger rebalancer agent |
| GET | `/api/admin/stats` | Admin dashboard stats |
| GET | `/api/admin/fund-wallet` | Fund wallet with live ETH + USDC balances |
| GET | `/api/admin/movements` | Full movement history |

---

## What's New — Wave 3 RC2 (2026-06)

See the [full RC2 changelog](#whats-new--wave-3-rc2-2026-06) at the top of this document.

---

## What's New — 2026-06-11

### CoinGecko Fully Removed — 100% SoSoValue + SoDEX

| Agent | Before | After |
|---|---|---|
| Scout | SoSoValue + CoinGecko | SoSoValue SSI + SoDEX only |
| Rebalancer | CoinGecko batch prices | SoDEX tickers + SoSoValue klines |
| NAV Updater | CoinGecko batch prices | SoDEX tickers (100% real) |

### Block Persistence — Deposit Monitor
Last scanned block now persisted to `system_state` DB table — survives PM2 restarts without missing deposits.

### DePIN Emergency Rebalance
- GEOD ejected (not in SoSoValue ssiDePIN index)
- 7 new tokens added: RENDER, AKT, AR, THETA, IOTA, GLM, ATH
- 25% max weight cap enforced on all indexes

---

## What's New — Wave 2

- Real on-chain USDC deposits detected via `eth_getLogs` on Base
- Automatic USDC refund for deposits below minimum
- Investor Dashboard: P&L, NAV chart, HWM tracker, AI activity feed
- Transparency Page: rebalance history, constituent breakdown, AI rationale
- Admin Panel: fund wallet live balance, full movement history
- Full i18n: 7 languages across all pages
- Testnet Faucet: `/faucet-sepolia` — ETH faucet for Base Sepolia testers

---

## Buildathon

Built for the **SoDEX × SoSoValue Builtathon** — Wave 3 submission.

- SoSoValue API used throughout the entire agent decision pipeline
- SoDEX Spot API used for all trade execution (EIP-712 signed)
- Real on-chain deposits and auto-refunds on Base Mainnet + Base Sepolia
- Deployed on SoSoValue ValueChain mainnet (chainId 286623)
- Fund wallet publicly auditable on Base (Basescan)
- Each rebalance leaves a permanent on-chain record

> Wave 1 code preserved in the [`wave1`](https://github.com/markinho1970/sosomon/tree/wave1) branch.

---

## License

MIT — open source for public audit and community contribution.
