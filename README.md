# AlphaGrid

**Thematic indexes. Managed by AI. Verified on-chain.**

> One-person on-chain financial business built on SoSoValue ValueChain using 3 AI agents.

---

## What is AlphaGrid?

AlphaGrid runs AI-powered thematic crypto index strategies on SoSoValue's ValueChain platform. Three specialized AI agents handle all research, portfolio maintenance, and content generation — the founder reviews decisions in ~1.5 hours/week.

**3 Active Indexes:**
- AI × Crypto Infrastructure
- Real World Assets Top 10
- DePIN Momentum

**3 AI Agents:**
- **Scout** (GPT-4o) — Daily screening of 400+ tokens via CoinGecko + SoSoValue
- **Rebalancer** (Claude Sonnet) — Weekly rebalancing + real-time risk overrides
- **Narrator** (GPT-4o) — Weekly Alpha Memo + Twitter threads

**Revenue:**
- 0.75% annual management fee on AUM
- $29/month Pro subscription (Alpha Memo + Discord alerts)
- 15% performance fee above high-water mark

---

## Project Structure

```
sosovalue-business/
├── frontend/               # Next.js 14 app
│   └── src/
│       ├── app/
│       │   ├── page.tsx                    # Landing page
│       │   ├── indexes/page.tsx            # All indexes list
│       │   ├── indexes/[slug]/page.tsx     # Index detail
│       │   ├── dashboard/page.tsx          # Subscriber dashboard
│       │   └── components/
│       │       ├── Navbar.tsx
│       │       ├── IndexCard.tsx
│       │       ├── AgentActivityFeed.tsx
│       │       └── MacroWidget.tsx
│       ├── lib/
│       │   ├── api.ts                      # API client
│       │   └── utils.ts                    # Helpers
│       └── types/index.ts                  # TypeScript types
│
├── backend/                # Python FastAPI
│   ├── main.py             # App entry point
│   ├── database.py         # SQLAlchemy setup
│   ├── models.py           # DB models
│   ├── schemas.py          # Pydantic schemas
│   ├── scheduler.py        # APScheduler (cron jobs)
│   ├── agents/
│   │   ├── scout.py        # Scout Agent (GPT-4o)
│   │   ├── rebalancer.py   # Rebalancer Agent (Claude)
│   │   └── narrator.py     # Narrator Agent (GPT-4o)
│   ├── services/
│   │   ├── coingecko.py    # CoinGecko Pro API
│   │   └── sosovalue.py    # SoSoValue API
│   └── api/
│       ├── indexes.py      # GET /api/indexes
│       ├── agents.py       # GET /api/agents/activity
│       ├── macro.py        # GET /api/macro
│       └── stats.py        # GET /api/stats
│
└── infra/
    └── docker-compose.yml
```

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- API Keys: OpenAI, Anthropic, CoinGecko Pro, SoSoValue

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start server
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local

npm run dev
```

App available at: http://localhost:3000

### Docker (both services)

```bash
cd infra
cp ../backend/.env.example ../backend/.env
# Edit .env with your API keys
docker-compose up --build
```

---

## Agent Schedule

| Agent | Schedule | Trigger |
|---|---|---|
| Scout | Daily 06:00 UTC | Cron |
| Rebalancer | Monday 08:00 UTC | Cron (weekly) |
| Rebalancer | Every 4 hours | Drift check |
| Narrator | Sunday 18:00 UTC | Cron |

**After each Rebalancer run:** founder receives email with proposal. Review takes ~15 min. Approve → executes on ValueChain.

**After each Narrator run:** content files saved to `backend/generated_content/`. Founder reviews and posts to Twitter/X + Substack. Takes ~15 min.

---

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/indexes` | List all active indexes |
| `GET /api/indexes/{slug}` | Index detail with constituents |
| `GET /api/agents/activity` | Agent activity log |
| `GET /api/macro` | SoSoValue sentiment + sector flows |
| `GET /api/stats` | Public stats (AUM, subscribers, etc.) |
| `GET /health` | Health check |

---

## Decision Logic

### Scout Inclusion Criteria (all must pass)
- Market cap > $50M
- 24h volume > $500K
- 90-day price history on CoinGecko
- Matches thematic category per SoSoValue classification
- No known exploit in past 12 months

### Rebalancer Weight Logic
- Base: equal weight across 10 tokens
- +20% boost if 30d price change > 0 (positive momentum)
- -20% reduction if TVL declining > 15% over 30 days
- Cap: no single token > 25%
- Stablecoin buffer: inversely correlated with SoSoValue sentiment score

### Risk Override Triggers (automatic)
- Any token loses > 40% in 7 days → immediate ejection
- Sentiment score < 15 → all indexes go to 30% stablecoin allocation

---

## Revenue Model

| Stream | Rate | At $5M AUM |
|---|---|---|
| Management fee | 0.75%/year | $37,500/year |
| Pro subscriptions | $29/month | $11,600/month (400 subs) |
| Performance fee | 15% of profits above HWM | $37,500/quarter (20% gain) |
| **Total Year 1** | | **~$175,000/year** |

---

## Tech Stack

| Layer | Tech | Cost/Month |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Free (Vercel) |
| Backend | Python + FastAPI | $20 (Railway) |
| AI (Scout/Narrator) | OpenAI GPT-4o | ~$100 |
| AI (Rebalancer) | Anthropic Claude Sonnet | ~$50 |
| Token Data | CoinGecko Pro API | $129 |
| On-chain | SoSoValue ValueChain | Per protocol |
| Payments | Stripe | 2.9% per txn |
| Email | ConvertKit | $29 |
| Community | Discord | Free |
| Analytics | Dune Analytics | Free |
| **Total** | | **~$380/month** |

Break-even: **14 Pro subscribers**.

---

## Roadmap

**MVP (Month 1)**
- [x] 3 indexes live on ValueChain
- [x] Scout + Rebalancer + Narrator agents
- [x] Landing page + index detail pages
- [x] Subscriber dashboard
- [ ] Stripe subscription integration
- [ ] Wallet connect + index token deposit

**Phase 2 (Month 2-3)**
- [ ] 5 active indexes
- [ ] Dune Analytics public dashboard
- [ ] ConvertKit email automation
- [ ] Referral system (Rewardful)
- [ ] Twitter/X bot for auto-posting after review

**Phase 3 (Month 4-6)**
- [ ] $GRID governance token (at $2M AUM milestone)
- [ ] SBT loyalty NFTs (90-day streak)
- [ ] Mobile-responsive dashboard
- [ ] Institutional API access tier

---

*Built for the SoSoValue ValueChain Hackathon · AlphaGrid v0.1*

*Not financial advice. Past performance does not guarantee future results.*
