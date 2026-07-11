"""
Narrator Agent — Content generation for AlphaGrid.

Responsibilities:
- Generates weekly Alpha Memo (email newsletter for Pro subscribers)
- Drafts Twitter/X thread templates for founder review
- Creates post-rebalance announcements
- All content reviewed by founder before publishing (~15 min/week)
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict
from loguru import logger
from services.llm import generate

from database import SessionLocal
from models import AlphaIndex, AgentActivityLog, RebalanceProposal
from services.sosovalue import get_macro_context
from services import sosovalue
import uuid

# Output directory for generated content (founder reviews before publishing)
CONTENT_OUTPUT_DIR = os.getenv("CONTENT_OUTPUT_DIR", "./generated_content")


async def generate_weekly_content():
    """Main entry — generate all weekly content for founder review."""
    os.makedirs(CONTENT_OUTPUT_DIR, exist_ok=True)
    db = SessionLocal()
    try:
        macro = await get_macro_context()
        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()

        # Dados reais da SoSoValue para enriquecer o conteúdo
        hot_news = await sosovalue.get_hot_news(limit=5)
        etf_flow = await sosovalue.get_btc_etf_flow_summary()
        macro_calendar = await sosovalue.get_macro_events()

        # SSI benchmark snapshots (SoSoValue) — um por tema de index ativo
        ssi_benchmarks = {}
        for idx in indexes:
            snap = await sosovalue.get_benchmark_for_theme(idx.theme)
            if snap:
                ssi_benchmarks[idx.id] = {"name": idx.name, "theme": idx.theme, "snap": snap}

        # Generate Alpha Memo (consolidated weekly newsletter)
        alpha_memo = await _generate_alpha_memo(indexes, macro, db,
                                                 hot_news=hot_news,
                                                 etf_flow=etf_flow,
                                                 macro_calendar=macro_calendar,
                                                 ssi_benchmarks=ssi_benchmarks)
        _save_content(alpha_memo, "alpha_memo")

        # Generate Twitter thread for best-performing index
        best_idx = max(indexes, key=lambda i: i.return_30d_pct) if indexes else None
        if best_idx:
            thread = await _generate_twitter_thread(best_idx, macro)
            _save_content(thread, f"twitter_thread_{best_idx.slug}")

        # Generate performance scorecard tweet
        scorecard = await _generate_scorecard_tweet(indexes, macro)
        _save_content(scorecard, "twitter_scorecard")

        # Log activity
        activity = AgentActivityLog(
            id=str(uuid.uuid4()),
            index_id=None,
            agent="narrator",
            action="content_generated",
            description=f"Weekly content generated: Alpha Memo + {len(indexes)} index threads. Awaiting founder review.",
            timestamp=datetime.utcnow(),
        )
        db.add(activity)
        db.commit()

        logger.success(f"Narrator: weekly content generated → {CONTENT_OUTPUT_DIR}/")

    finally:
        db.close()


async def _generate_alpha_memo(indexes: List, macro: Dict, db,
                                hot_news: list = None,
                                etf_flow: dict = None,
                                macro_calendar: list = None,
                                ssi_benchmarks: dict = None) -> str:
    """Generate the weekly Alpha Memo email for Pro subscribers."""

    # Build index performance summaries
    index_summaries = []
    for idx in indexes:
        # Get recent rebalance proposals
        recent_proposals = db.query(RebalanceProposal).filter(
            RebalanceProposal.index_id == idx.id,
            RebalanceProposal.status == "executed",
            RebalanceProposal.executed_at >= datetime.utcnow() - timedelta(days=7),
        ).all()

        index_summaries.append({
            "name": idx.name,
            "return_7d": idx.return_7d_pct,
            "return_30d": idx.return_30d_pct,
            "aum": idx.aum_usd,
            "rebalanced_this_week": len(recent_proposals) > 0,
            "rebalance_summary": recent_proposals[-1].ai_rationale if recent_proposals else "No rebalance this week.",
        })

    index_data_str = json.dumps(index_summaries, indent=2)

    # Dados reais da SoSoValue
    news_headlines = "\n".join([
        f"- {n.get('title', '')}" for n in (hot_news or [])[:5]
    ]) or "No news data available."

    etf_line = ""
    if etf_flow and isinstance(etf_flow, dict):
        inflow = etf_flow.get("total_7d_inflow_usd", 0)
        assets = etf_flow.get("total_net_assets_usd", 0)
        sign = "+" if inflow >= 0 else ""
        etf_line = f"BTC ETF 7d flow: {sign}${inflow/1e9:.2f}B | Total net assets: ${assets/1e9:.1f}B"

    calendar_line = ""
    if macro_calendar:
        upcoming = [
            f"{e['date']}: {', '.join(e.get('events', []))}"
            for e in macro_calendar[:4]
        ]
        calendar_line = "\n".join(upcoming)

    # SSI benchmark comparison table
    ssi_comparison = ""
    if ssi_benchmarks:
        from services.sosovalue import THEME_INDEX_MAP
        lines = []
        for idx in indexes:
            bench = ssi_benchmarks.get(idx.id)
            if not bench:
                continue
            snap = bench["snap"]
            ssi_7d  = float(snap.get("7day_roi",  0) or 0)
            ssi_30d = float(snap.get("1month_roi", 0) or 0)
            alpha_7d  = idx.return_7d_pct  - ssi_7d
            alpha_30d = idx.return_30d_pct - ssi_30d
            ticker = THEME_INDEX_MAP.get(idx.theme, "?")
            lines.append(
                f"- {idx.name} vs {ticker}: "
                f"7d {idx.return_7d_pct:+.1f}% vs SSI {ssi_7d:+.1f}% (alpha {alpha_7d:+.1f}%) | "
                f"30d {idx.return_30d_pct:+.1f}% vs SSI {ssi_30d:+.1f}% (alpha {alpha_30d:+.1f}%)"
            )
        ssi_comparison = "\n".join(lines) if lines else "SSI benchmark data unavailable this week."

    prompt = f"""You are writing the weekly SoSoMon Alpha Memo — a premium newsletter for Pro subscribers.

DATE: {datetime.utcnow().strftime('%B %d, %Y')}

MACRO CONTEXT (SoSoValue live data):
- Sentiment Score: {macro['sosovalue_sentiment_score']}/100 ({macro['sentiment_label']})
- AI Macro Stance: {macro['macro_stance'].upper()}
- {macro['macro_stance_reason']}
- {etf_line}

UPCOMING MACRO EVENTS:
{calendar_line or "No upcoming events."}

BREAKING NEWS (SoSoValue feed):
{news_headlines}

SECTOR FLOWS:
{json.dumps(macro['sector_flows'][:6], indent=2)}

SSI BENCHMARK COMPARISON (SoSoValue live data):
{ssi_comparison}

INDEX PERFORMANCE THIS WEEK:
{index_data_str}

Write a professional, data-driven Alpha Memo with these sections:

1. MACRO OUTLOOK (2-3 paragraphs)
   - What the live sentiment and ETF flow data tells us
   - Key sector rotation trends from SoSoValue data
   - What SoSoMon's AI agents did in response

2. INDEX PERFORMANCE (one section per index)
   - Weekly returns
   - What drove the moves
   - Rebalance activity

3. WHAT TO WATCH NEXT WEEK
   - Upcoming macro events and their potential impact
   - 3 specific signals the Scout agent is monitoring

4. AI AGENT LOG (brief)
   - What Scout flagged this week
   - What Rebalancer decided
   - Any risk overrides triggered

Style: professional, data-first, zero hype, no emojis. Maximum 600 words. Tone: a hedge fund PM writing to sophisticated investors."""

    try:
        return await generate(prompt, max_tokens=800, temperature=0.0)
    except Exception as e:
        logger.error(f"Narrator Alpha Memo generation failed: {e}")
        return f"[NARRATOR ERROR: Alpha Memo generation failed — {e}]"


async def _generate_twitter_thread(idx: AlphaIndex, macro: Dict) -> str:
    """Generate a Twitter/X thread for the best-performing index."""

    prompt = f"""You are the voice behind @AlphaGridXYZ, a crypto index fund run by AI agents.

Write a 5-tweet Twitter/X thread about the "{idx.name}" index performance.

INDEX DATA:
- 30d return: +{idx.return_30d_pct:.1f}%
- 7d return: +{idx.return_7d_pct:.1f}%
- AUM: ${idx.aum_usd:,.0f}
- Last rebalanced: {idx.last_rebalanced_at.strftime('%b %d') if idx.last_rebalanced_at else 'recently'}
- Rebalance summary: {idx.rebalance_summary or 'Standard weekly rebalance.'}
- Macro stance: {macro['macro_stance']} (sentiment: {macro['sosovalue_sentiment_score']}/100)

THREAD FORMAT — use these 5 tweet structures:

Tweet 1 (Hook — "The Reveal" format):
State the performance number. Tease what the AI did that most people missed.

Tweet 2 (The Data):
Specific numbers. Which tokens drove the return. Hard facts only.

Tweet 3 (The AI Mechanic):
Explain what the Rebalancer agent actually did this week. Make it tangible.

Tweet 4 (The Contrast):
How this compares to BTC benchmark. Alpha generated. Why rules beat emotions.

Tweet 5 (CTA):
Soft call to action. Link to index or subscribe. No hard sell.

RULES:
- Max 280 chars per tweet
- Data-first, no hype, no "moon" or "gem"
- Number tweets 1/5, 2/5, etc.
- Include relevant data points, not vague claims
- Write like a fund manager, not a CT influencer

Output just the tweets, separated by blank lines."""

    try:
        return await generate(prompt, max_tokens=400, temperature=0.0)
    except Exception as e:
        logger.error(f"Narrator Twitter thread generation failed: {e}")
        return f"[NARRATOR ERROR: Thread generation failed — {e}]"


async def _generate_scorecard_tweet(indexes: List, macro: Dict) -> str:
    """Generate a weekly performance scorecard tweet."""

    lines = "\n".join([
        f"{'✅' if i.return_30d_pct > 0 else '❌'} {i.name}: {'+' if i.return_30d_pct > 0 else ''}{i.return_30d_pct:.1f}% (30d)"
        for i in indexes
    ])

    prompt = f"""Write a single tweet (max 280 chars) summarizing AlphaGrid's weekly performance scorecard.

INDEX PERFORMANCE:
{lines}

Macro: Sentiment {macro['sosovalue_sentiment_score']}/100

Format:
AlphaGrid Week [N] Scorecard
[index results with emoji]
[one-line insight about macro/AI stance]
[soft link mention]

Tone: clean, factual, no hype."""

    try:
        return await generate(prompt, max_tokens=200, temperature=0.0)
    except Exception as e:
        logger.error(f"Narrator scorecard tweet generation failed: {e}")
        return "[NARRATOR ERROR: Scorecard generation failed]"


def _save_content(content: str, filename: str):
    """Save generated content to file for founder review."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M")
    filepath = os.path.join(CONTENT_OUTPUT_DIR, f"{timestamp}_{filename}.txt")
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"=== ALPHAGRID NARRATOR OUTPUT ===\n")
            f.write(f"Generated: {datetime.utcnow().isoformat()}\n")
            f.write(f"File: {filename}\n")
            f.write(f"Status: AWAITING FOUNDER REVIEW\n")
            f.write("=" * 40 + "\n\n")
            f.write(content)
        logger.info(f"Narrator: content saved → {filepath}")
    except Exception as e:
        logger.error(f"Failed to save content {filename}: {e}")


async def generate_rebalance_announcement(index_id: str, proposal_id: int):
    """
    Generate a post-rebalance announcement tweet after execution.
    Called by admin endpoint after founder approves and executes proposal.
    """
    db = SessionLocal()
    try:
        idx = db.query(AlphaIndex).filter(AlphaIndex.id == index_id).first()
        proposal = db.query(RebalanceProposal).filter(RebalanceProposal.id == proposal_id).first()

        if not idx or not proposal:
            return

        changes_text = json.dumps(proposal.changes, indent=2)

        prompt = f"""Write a single tweet announcing a rebalance in the AlphaGrid {idx.name} index.

Changes made:
{changes_text}

Trigger: {proposal.trigger}

Format: "AlphaGrid just rebalanced [index]. Here's what the AI changed and why: [1-2 specific changes]. Full breakdown → alphagrid.xyz"

Max 280 chars. Data-first, no hype."""

        response = await gemini_client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        tweet = response.text
        _save_content(tweet, f"rebalance_announcement_{index_id}")
        return tweet

    except Exception as e:
        logger.error(f"Rebalance announcement generation failed: {e}")
    finally:
        db.close()
