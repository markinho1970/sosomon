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

---

## SoSoValue Integration

SoSoMon uses the SoSoValue API throughout the entire decision pipeline:

| Endpoint | Usage |
|---|---|
| `/currencies/sector-spotlight` | 24h sector performance → sentiment score |
| `/indices` + `/indices/{ticker}` | SSI index constituents as token universe for Scout |
| `/etfs/summary-history` | BTC/ETH ETF flow data for macro context |
| `/news/hot` | Market news for Scout and Narrator context |
| `/macro/events` | Macro calendar (CPI, NFP, FOMC) for Narrator |

**Sentiment Score** is derived in real-time from sector spotlight 24h change averages + ETF flow adjustments — giving a proprietary 0-100 score that drives agent risk decisions.

---

## SoDEX Integration

SoSoMon uses the SoDEX Spot API for all trading operations:

| Feature | Endpoint |
|---|---|
| Market data | `GET /markets/symbols`, `/markets/tickers`, `/markets/{sym}/klines` |
| Portfolio | `GET /accounts/{addr}/balances`, `/accounts/{addr}/trades` |
| Trading | `POST /trade/orders/batch` (EIP-712 signed) |
| Cancel | `DELETE /trade/orders/batch` (EIP-712 signed) |

**Authentication:** EIP-712 `ExchangeAction` typed data — chainId 286623 (ValueChain mainnet), nonce = Unix timestamp ms, `0x01` signature prefix.

**Fund Wallet:** Publicly visible on Base network — accepts USDC deposits from investors.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SoSoMon                          │
│                                                     │
│  Next.js Frontend (React, wagmi, RainbowKit)        │
│  ├── Home — live stats + index cards                │
│  ├── Indexes — detail + constituents                │
│  ├── Dashboard — portfolio + AI activity + macro    │
│  └── Admin — wallet-signed auth (EIP-191)           │
│                                                     │
│  FastAPI Backend (Python)                           │
│  ├── /api/indexes    — index data + constituents    │
│  ├── /api/macro      — SoSoValue macro context      │
│  ├── /api/agents     — AI activity log              │
│  ├── /api/invest     — portfolio + fund wallet      │
│  ├── /api/stats      — public platform stats        │
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
└─────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
  SoSoValue API              SoDEX Spot API
  (market intelligence)      (trade execution)
         │                          │
         └──────────────────────────┘
                      │
                      ▼
              SoSoValue ValueChain
              (chainId: 286623)
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

## Buildathon

Built for the **SoDEX × SoSoValue Buildathon** — Wave 1 submission.

- SoSoValue API used throughout the agent decision pipeline
- SoDEX Spot API used for all trade execution
- Deployed on SoSoValue ValueChain mainnet (chainId 286623)
- Fund wallet on Base network accepting USDC deposits

---

## License

MIT — open source for public audit and community contribution.
