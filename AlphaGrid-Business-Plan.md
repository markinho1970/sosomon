# AlphaGrid — Business Plan

> *Built for SoSoValue ValueChain Hackathon — AlphaGrid v0.1*

---

## 1. Business Idea

### What It Does

AlphaGrid is a one-person, on-chain asset management business that runs AI-powered thematic index portfolios on SoSoValue's ValueChain platform. It automatically constructs, rebalances, and manages crypto index strategies — then sells access to those strategies as structured financial products that anyone can subscribe to on-chain.

Think of it as a one-person BlackRock for crypto themes: you define the thesis, AI agents handle the research, construction, monitoring, and execution, and the protocol handles custody and settlement.

**Core loop:**

1. AlphaGrid publishes thematic indexes on SoSoValue (e.g., "AI x Crypto Infrastructure," "Real World Assets Top 10," "DePIN Momentum")
2. AI agents continuously scan on-chain data, news, token metrics, and SoSoValue's sentiment feeds to maintain and rebalance those indexes
3. Users subscribe to an index strategy; their capital is deployed and managed automatically
4. AlphaGrid earns management fees, performance fees, and subscription revenue

### Who It Is For

**Primary users:**
- Retail crypto holders with $500–$50,000 who want thematic exposure but lack time to research
- DeFi natives who understand yield but want passive, diversified positions
- Web3 funds and DAOs that need benchmarkable index exposure for treasury management

**Secondary users:**
- Traditional finance individuals entering crypto who want a "set it and forget it" product
- Crypto Twitter audiences following specific narratives (RWA, AI, DePIN, etc.)

### Why It Is Valuable

The problem is precise: in crypto, thematic narratives rotate fast (AI tokens in Q1, RWA in Q2, DePIN in Q3), and retail investors consistently buy tops and sell bottoms because they're chasing Twitter. There is no low-cost, on-chain thematic index product that:

- Rebalances automatically based on real data, not vibes
- Is transparent and verifiable on-chain
- Costs less than 1% per year
- Is built specifically around rotating narratives

AlphaGrid fills this gap. SoSoValue's index infrastructure removes 80% of the engineering complexity, meaning a single founder can operate this at institutional quality with AI agents handling what would otherwise require a 5-person research team.

---

## 2. Core Differentiation

### Use of AI Agents

AlphaGrid runs three specialized AI agents, each with a distinct role:

**Agent 1 — "Scout" (Research & Screening)**
- Model: GPT-4o via API + Perplexity for real-time search
- Task: Daily scan of 400+ crypto projects across defined thematic categories
- Inputs: CoinGecko API, SoSoValue sentiment data, DefiLlama TVL feeds, on-chain activity via Dune Analytics, Twitter/X signal via Tweetscout
- Output: Ranked inclusion/exclusion recommendations per index, with written rationale stored in a log file for auditability

**Agent 2 — "Rebalancer" (Portfolio Maintenance)**
- Model: Claude Sonnet with structured tool-use
- Task: Triggered weekly or by drift threshold (>5% from target weight), proposes rebalancing transactions
- Logic: Mean-variance optimization constrained by liquidity thresholds (minimum $500K 24h volume), sector concentration caps (no single token >25%), and momentum filters (30-day price trend)
- Output: Signed rebalancing proposal pushed to SoSoValue index management interface

**Agent 3 — "Narrator" (Content & Community)**
- Model: GPT-4o
- Task: Auto-generates weekly index performance reports, Twitter/X threads, and subscriber email digests
- Inputs: Portfolio performance data, market context, rebalancing rationale from Scout
- Output: Drafted content reviewed by founder before posting (15 min/day review cycle)

### Real-Time Data Advantage

SoSoValue provides structured, institutional-quality data that competitors using raw CoinGecko/CoinMarketCap feeds cannot match:

- **Crypto Fear & Greed Index** (SoSoValue proprietary) → used as macro risk-on/risk-off filter
- **Thematic index benchmarks** → AlphaGrid strategies are positioned relative to SoSoValue's own indexes, giving clear alpha/beta framing
- **Sector flow data** → tracks capital rotation between sectors in real-time, allowing Scout to identify early narrative shifts before they're priced in

### Automation Edge

| Task | Traditional 1-person fund | AlphaGrid |
|---|---|---|
| Weekly research | 10 hours | 0 hours (Scout agent) |
| Rebalancing calculation | 3 hours | 0 hours (Rebalancer agent) |
| Report writing | 4 hours | 30 min review |
| Subscriber comms | 2 hours | 15 min review |
| **Total weekly ops time** | **~19 hours** | **~1.5 hours** |

This 12x efficiency gain means one person can manage 5–8 distinct index strategies simultaneously.

### vs. Competitors

| Competitor | Weakness | AlphaGrid Edge |
|---|---|---|
| Index Coop | DAO governance = slow rebalancing | Autonomous agents, daily responsiveness |
| Tokensets | Static methodology, no AI | Narrative-adaptive, AI-driven |
| Messari Indexes | Expensive, not on-chain investable | Sub-$1K minimum, fully on-chain |
| Manual CT traders | Emotional, inconsistent | Rule-based, auditable decisions |
| SoSoValue native indexes | Generic market-cap weighted | Niche thematic, momentum-enhanced |

---

## 3. System Architecture

### SoSoValue Data Feeds Usage

AlphaGrid consumes three SoSoValue data layers:

1. **Index Data API** — pulls constituent weights, historical returns, sector classifications for all SoSoValue tracked indexes. Used by Scout as baseline universe definition.
2. **Sentiment & Fear/Greed Feed** — macro sentiment score (0–100) consumed by Rebalancer as a risk filter. If score < 25 (Extreme Fear), Rebalancer increases stablecoin allocation to 20% across all indexes.
3. **ValueChain Index Builder** — the on-chain index creation and management interface. AlphaGrid publishes indexes here; subscribers deposit capital and receive index tokens representing their share.

### Index Tools

- **SoSoValue Index Constructor** — define constituents, weights, rebalancing rules on-chain
- **Dune Analytics** — custom dashboards tracking each AlphaGrid index's on-chain activity, subscriber count, AUM
- **DefiLlama API** — TVL data for DeFi protocol constituents (required for DeFi and RWA indexes)
- **CoinGecko Pro API** ($129/month) — OHLCV data, market cap, volume, circulating supply for universe screening

### Trading APIs

- **SoSoValue ValueChain execution layer** — primary rebalancing execution for on-chain indexes
- **1inch API** — fallback aggregator for any off-platform token swaps needed during rebalancing
- **Fireblocks or Safe{Wallet}** — multi-sig custody for operational wallet (not subscriber funds, which are held by ValueChain protocol)

### AI Agent Design

```
┌─────────────────────────────────────────────────┐
│                  ALPHAGRID CORE                  │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │  SCOUT   │    │REBALANCER│    │ NARRATOR  │  │
│  │ (GPT-4o) │    │(Claude)  │    │ (GPT-4o)  │  │
│  └────┬─────┘    └────┬─────┘    └─────┬─────┘  │
│       │               │                │         │
└───────┼───────────────┼────────────────┼─────────┘
        │               │                │
        ▼               ▼                ▼
   DATA INPUTS     EXECUTION        CONTENT OUT
   - SoSoValue     - ValueChain      - Twitter/X
   - CoinGecko     - 1inch API       - Email digest
   - DefiLlama     - Safe{Wallet}    - Dune dashboard
   - Dune          - Rebal log       - Substack
   - Tweetscout
```

### Data Flow

```
[External Data Sources]
        │
        ├── SoSoValue API ──────────────────────────┐
        ├── CoinGecko Pro API                        │
        ├── DefiLlama API                            ▼
        ├── Dune Analytics              [Scout Agent — Daily Run]
        └── Twitter/X (Tweetscout)             │
                                               │ Ranked token list
                                               │ + rationale JSON
                                               ▼
                                    [Rebalancer Agent — Weekly Run]
                                               │
                                    Checks: Drift > 5%?
                                    Checks: Sentiment < 25?
                                    Checks: Volume thresholds met?
                                               │
                                    YES → Generate rebalance proposal
                                    NO  → Log "no action," continue
                                               │
                                               ▼
                                    [Founder Review — 15 min]
                                               │
                                    Approve / Reject / Edit
                                               │
                                               ▼
                                    [ValueChain Execution]
                                               │
                                    On-chain rebalance committed
                                               │
                                               ▼
                                    [Narrator Agent — Post-Execution]
                                    Generates report + tweet thread
                                               │
                                               ▼
                                    [Founder Review — 15 min]
                                               │
                                    Publish to Twitter/X + Substack
```

### Decision Logic

**Scout inclusion criteria (token must pass all):**
- Market cap > $50M
- 24h volume > $500K (liquidity threshold)
- Listed on CoinGecko with complete 90-day history
- Matches thematic tag (AI, RWA, DePIN, etc.) per SoSoValue sector classification
- Not in top 10 by market cap overall (large-caps handled by separate index)
- No significant exploit history in past 12 months (checked via Rekt.news API)

**Rebalancer weighting logic:**
- Base: equal weight across constituents
- Modifier 1: +20% weight boost for tokens with positive 30-day momentum (price > 30-day MA)
- Modifier 2: -20% weight reduction for tokens with declining TVL (>15% drop over 30 days)
- Cap: No single token > 25% of index
- Stablecoin buffer: 0–20% USDC, inversely correlated with SoSoValue sentiment score

**Risk override triggers (automatic, no approval needed):**
- If any constituent loses > 40% in 7 days → immediate ejection, replaced with USDC until next scheduled rebalance
- If SoSoValue sentiment < 15 → all indexes shift to 30% USDC allocation

### Automation Summary

| Function | Automated? | Cadence |
|---|---|---|
| Universe screening | Yes (Scout) | Daily |
| Inclusion/exclusion recommendations | Yes (Scout) | Daily |
| Rebalance proposal generation | Yes (Rebalancer) | Weekly + drift trigger |
| On-chain rebalance execution | Semi (founder approves) | Weekly |
| Risk override execution | Yes (Rebalancer) | Real-time |
| Performance report drafting | Yes (Narrator) | Weekly |
| Twitter thread drafting | Yes (Narrator) | 3x/week |
| Subscriber email digest | Yes (Narrator) | Weekly |
| Dune dashboard update | Yes (Dune auto-refresh) | Continuous |

---

## 4. Monetization

### Revenue Stream 1 — Management Fee (AUM-Based)

**Structure:** 0.75% annual management fee on AUM, charged continuously at the protocol level (like an ETF expense ratio — invisible, priced in).

**Why 0.75%:** Undercuts Index Coop (0.95%–2.5%), justifiable given active AI-managed rebalancing.

**AUM milestones:**
- Month 3: $250,000 AUM → $156/month
- Month 6: $1,000,000 AUM → $625/month
- Month 12: $5,000,000 AUM → $3,125/month

### Revenue Stream 2 — AlphaGrid Pro Subscription

**Structure:** $29/month or $249/year per subscriber

**What Pro includes:**
- Access to all AlphaGrid indexes (free tier: 1 index, read-only)
- Weekly "Alpha Memo" email: Scout's full screening report + rebalancing rationale
- Discord Pro channel with Rebalancer alerts in real-time
- Early access to new index launches (2-week head start)
- Direct Q&A with founder 1x/month (async, text-based)

**Targets:**
- Month 3: 50 subscribers × $29 = $1,450/month
- Month 6: 150 subscribers × $29 = $4,350/month
- Month 12: 400 subscribers × $29 = $11,600/month

### Revenue Stream 3 — Performance Fee

**Structure:** 15% performance fee on profits above high-water mark, charged quarterly.

**Example:** Subscriber deposits $10,000. Portfolio grows to $13,000 in Q1. Fee = $3,000 × 15% = $450. High-water mark sets at $13,000. Q2 portfolio drops to $11,500 — no fee. Q3 recovers to $14,000 — fee on $1,000 = $150.

**Target (conservative, 20% avg annual gain):**
- Month 12: $5M AUM × 20% gain × 15% = $150,000/year → $37,500/quarter

**Combined Month-12 revenue target: ~$175,000/year** from three streams at $5M AUM + 400 Pro subscribers.

---

## 5. User Experience

### Onboarding Flow

1. **Discovery** — User sees viral tweet: "My AI-managed DePIN index is up 34% this quarter. Here's exactly what's in it and why 🧵" → links to AlphaGrid.xyz
2. **Landing Page (60 seconds)** — Hero: "Thematic crypto indexes, managed by AI, verified on-chain." Live AUM counter, current index returns, last rebalance date. Three index cards. CTA: "Explore Indexes" (no wallet required yet)
3. **Index Detail Page** — Current constituents with weights, entry rationale, 90-day performance chart vs. BTC benchmark, AI rationale summary (3 bullet points), "Invest" button
4. **Wallet + Deposit** — Connect MetaMask or WalletConnect, select index + deposit amount (minimum $50), confirm transaction → receive index tokens, welcome email + Discord invite
5. **First Week** — Day 1: Welcome email + explainer. Day 3: First Alpha Memo teaser. Day 7: Personalized portfolio summary vs. BTC.

### Dashboard Description

**Panel 1 — Portfolio Summary**
- Total value in USD and native tokens
- All-time return %, 30-day return %
- Benchmark comparison (BTC, ETH, SoSoValue equivalent)
- High-water mark and next performance fee date

**Panel 2 — Index Holdings**
- Current constituents with weights, 7-day performance per token
- "Why is this in the index?" tooltip per token (AI-generated, 1 sentence)
- Last rebalanced: [date] — [summary of what changed]

**Panel 3 — AI Agent Activity Feed**
- Real-time log of Scout and Rebalancer decisions
- Example: "Scout flagged RNDR for weight increase: +45% TVL growth, positive momentum"
- Example: "Risk override: sentiment score 18/100 — stablecoin buffer increased to 30%"

**Panel 4 — Macro Context**
- SoSoValue Fear & Greed Index live score + 30-day chart
- Current sector flows: "Capital rotating INTO RWA, OUT OF DeFi (7-day)"
- AlphaGrid macro stance: Risk-On / Risk-Neutral / Risk-Off with explanation

### Retention Mechanics

1. **Weekly Alpha Memo** — delivered Sunday evening. Highest-value retention hook.
2. **Rebalancing Notifications** — push + Discord alert every time AI rebalances. Subject: "AlphaGrid just made a move — here's why."
3. **Streak Dashboard** — "You've been invested for X days" with milestone rewards (Day 30: Discord role; Day 90: free Pro month; Day 365: OG NFT badge)
4. **Quarterly Performance Call** — 45-min group Zoom with all Pro subscribers. No sales pitch. Pure analysis.
5. **Transparent AI Log** — users watch an AI make decisions on their behalf. Genuinely novel, creates strong product lock-in.

---

## 6. Growth & Viral Strategy

### Twitter/X Content Hooks

**Account:** @AlphaGridXYZ | 5 posts/week | All drafted by Narrator agent, reviewed in 15 min/day

**Hook Type 1 — The Reveal**
> "My AI just ejected [TOKEN] from the DePIN index at $0.82.
> Here's the 3 signals it caught that most people missed: 🧵"

**Hook Type 2 — The Scorecard**
> "AlphaGrid DePIN Index: Week 12 performance
> ✅ +18% vs BTC benchmark
> ✅ 0 tokens down >40%
> ✅ Rebalanced 2x (both moves correct in hindsight)
> Full breakdown:"

**Hook Type 3 — The Mechanic**
> "How does an AI decide what goes in a crypto index?
> Here's the exact 6-step logic my agent uses (with real examples from last week):"

**Hook Type 4 — The Contrast**
> "3 months ago: influencer pumped [TOKEN] as the next big DePIN play.
> My AI never included it. Here's why it failed the screening:"

**Hook Type 5 — The Data Drop**
> "SoSoValue fear index just hit 22/100.
> My AI automatically increased stablecoin allocation to 25%.
> This is what rule-based investing looks like in practice."

**Growth targets:**
- Month 1: 500 followers
- Month 3: 3,000 followers
- Month 6: 10,000 followers

### Early User Acquisition

- **Week 1–2:** Hackathon Launch. Submit to SoSoValue/ValueChain hackathon with working demo. Post public build log thread on Twitter.
- **Week 3–4:** Founding Member Campaign — first 100 subscribers at $9/month for life. Sell out in 72 hours via Twitter scarcity post.
- **Month 2:** CT Collab Outreach — DM 20 mid-size crypto analysts (5K–50K followers). Offer 3 months free Pro for honest review tweet.
- **Month 3:** Guest posts for Bankless, The Defiant, Messari. Each = 1,000–3,000 new eyeballs.

### Community Building (Discord)

- `#general` — open discussion
- `#ai-agent-alerts` — automated Rebalancer and Scout notifications
- `#alpha-memo` — weekly report drops
- `#portfolio-showcase` — members share AlphaGrid performance (social proof engine)
- `#pro-only` — exclusive founder Q&A

Monthly "AlphaGrid vs. the Market" competition — top 3 community portfolios win 1 free Pro month.

### Referral & Loyalty Incentives

- 1 referral → 1 free month of Pro
- 5 referrals → permanent 20% discount
- 10 referrals → free Pro for life + "AlphaGrid Ambassador" role
- 90 days continuous investment → AlphaGrid SBT (Soulbound Token): priority access to new index launches + governance votes

---

## 7. MVP Plan

### Week 1 — Foundation

**Build:**
- AlphaGrid.xyz landing page (Next.js + Tailwind, deployed on Vercel)
- Connect to SoSoValue API: pull index data, display 3 thematic categories
- Scout agent v0.1: Python + OpenAI API + CoinGecko Pro, cron-triggered, outputs JSON with 20 screened tokens per category
- First index on ValueChain: "AI x Crypto Infrastructure" (10 tokens, equal weight, manual composition)

**Skip:** subscriber dashboard, automated rebalancing, payments

### Week 2 — Agent Core

**Build:**
- Rebalancer agent v0.1: reads Scout output + checks drift threshold, outputs rebalancing proposal as formatted text report
- Risk override logic: checks SoSoValue sentiment feed, auto-generates risk alert email
- Dune Analytics dashboard: AUM, subscriber count, index performance — embedded on landing page
- Substack set up for Alpha Memo (first issue manual, becomes Narrator template)

**Skip:** Discord bot, referral system, mobile optimization

### Week 3 — Monetization + Content

**Build:**
- Stripe integration for Pro subscription ($29/month)
- Gated content: Substack premium for Alpha Memo
- Narrator agent v0.1: GPT-4o prompt → Twitter thread draft + Alpha Memo draft from Rebalancer output
- Twitter/X launched: first 3 threads posted (manually reviewed)
- Founding Member campaign: 100 spots at $9/month

**Skip:** performance fee smart contract (manual quarterly calculation for MVP), mobile app, multi-sig treasury

### Week 4 — Polish + Hackathon Submission

**Build:**
- Subscriber dashboard v1: portfolio value, constituent weights, AI agent activity feed
- Onboarding email sequence: 3 emails via ConvertKit
- Referral tracking via Rewardful ($49/month)
- Hackathon submission: demo video, pitch deck, live URL
- Second index: "DePIN Momentum" (10 tokens, same architecture)

### Tech Stack

| Layer | Tool | Cost/Month |
|---|---|---|
| Frontend | Next.js 14 + Tailwind | Free (Vercel) |
| Backend | Python (FastAPI) | $20 (Railway) |
| AI | OpenAI GPT-4o + Anthropic Claude | ~$150 est. |
| Data | CoinGecko Pro | $129 |
| On-chain | SoSoValue ValueChain | Per protocol |
| Email | ConvertKit | $29 |
| Payments | Stripe | 2.9% per txn |
| Analytics | Dune Analytics | Free (public) |
| Community | Discord | Free |
| Content | Substack | Free (5% fee) |
| Referrals | Rewardful | $49 |
| **Total** | | **~$380/month** |

**Break-even: 14 Pro subscribers at $29/month.**

---

## 8. Name + Positioning

### Project Name: AlphaGrid

**Rationale:** "Alpha" = excess returns above benchmark (universal finance term, crypto-native). "Grid" = systematic, structured, repeatable — a lattice of AI agents working in coordination. Short, memorable, domain-available.

### Tagline

> **"Thematic indexes. Managed by AI. Verified on-chain."**

Secondary (for CT):
> **"Your AI portfolio manager. It never sleeps. It never panics."**

### 1–2 Line Pitch

AlphaGrid runs AI-managed thematic crypto index strategies on SoSoValue's ValueChain — giving any investor institutional-quality, narrative-adaptive portfolio management for under 1% per year, with full on-chain transparency.

One person. Three AI agents. Five index strategies. The fund that runs itself.

### Brand Identity

- **Colors:** Electric blue (#0066FF) + Near-black (#0A0A0F) + Signal white
- **Logo:** 3×3 grid of dots with center dot illuminated — represents the AI agent at the center of a data grid
- **Typography:** Space Grotesk (modern, technical, Web3-native)
- **Voice:** Precision over hype. Data over narrative. Every claim backed by a number. Anti-CT-influencer.

### Token Concept (post-MVP)

**$GRID — governance token**
- Utility: vote on new index launches, earn fee-share from management fees, stake to boost referral rewards
- Distribution: 40% community, 30% founder (4-year vest), 20% treasury, 10% launch incentives
- **Launch trigger:** Only when AUM > $2M AND > 500 Pro subscribers. No premature tokenization.

**Domain:** AlphaGrid.xyz (~$12/year)

---

## Appendix: First 90-Day KPI Dashboard

| Metric | Day 30 | Day 60 | Day 90 |
|---|---|---|---|
| Active indexes on ValueChain | 2 | 3 | 5 |
| Total AUM | $25,000 | $150,000 | $500,000 |
| Pro subscribers | 30 | 100 | 250 |
| Twitter/X followers | 500 | 2,500 | 7,000 |
| Monthly revenue | $870 | $2,900 | $7,250 |
| Weekly founder hours | 10 | 8 | 6 |
| Agent uptime | 90% | 95% | 99% |

**Key metric for Month 1 viability:** Subscriber retention after first Alpha Memo. Target > 80% retention. If < 60%, rewrite Narrator agent output quality before scaling.

---

*AlphaGrid v0.1 — SoSoValue ValueChain Hackathon Submission*
