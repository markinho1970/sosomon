import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, '/opt/alphagrid/backend')

from database import SessionLocal, create_tables
from models import AlphaIndex, IndexConstituent, AgentActivityLog

INDEXES = [
    {
        "id": "ai-crypto",
        "slug": "ai-crypto",
        "name": "AI × Crypto Index",
        "theme": "ai-crypto",
        "description": "Tracks leading AI infrastructure and on-chain AI tokens. Managed by Scout agent with daily momentum screening.",
        "nav_usd": 1.0,
        "return_30d_pct": 0.0,
        "return_7d_pct": 0.0,
        "management_fee_pct": 0.75,
        "stablecoin_buffer_pct": 5.0,
        "is_active": True,
    },
    {
        "id": "rwa",
        "slug": "rwa",
        "name": "Real World Assets Index",
        "theme": "rwa",
        "description": "Tokenized real-world assets: bonds, credit, commodities. Tracks the convergence of TradFi and DeFi.",
        "nav_usd": 1.0,
        "management_fee_pct": 0.75,
        "is_active": True,
    },
    {
        "id": "depin",
        "slug": "depin",
        "name": "DePIN Index",
        "theme": "depin",
        "description": "Decentralized Physical Infrastructure Networks — wireless, compute, energy, maps. The physical layer of Web3.",
        "nav_usd": 1.0,
        "management_fee_pct": 0.75,
        "is_active": True,
    },
]

CONSTITUENTS = {
    "ai-crypto": [
        {"symbol": "FET",  "name": "Fetch.ai",          "coingecko_id": "fetch-ai",           "weight": 10.5, "current_price_usd": 0.2254,  "market_cap_usd": 509141705,    "volume_24h_usd": 69387354,   "is_stablecoin": False, "ai_rationale": "Leading autonomous AI agent framework with growing on-chain deployment ecosystem."},
        {"symbol": "TAO",  "name": "Bittensor",          "coingecko_id": "bittensor",          "weight": 15.0, "current_price_usd": 307.30,   "market_cap_usd": 2949308984,   "volume_24h_usd": 249135548,  "is_stablecoin": False, "ai_rationale": "Decentralized machine learning network with the strongest AI token market cap."},
        {"symbol": "WLD",  "name": "Worldcoin",          "coingecko_id": "worldcoin-wld",      "weight": 9.0,  "current_price_usd": 0.2573,   "market_cap_usd": 859342265,    "volume_24h_usd": 67299578,   "is_stablecoin": False, "ai_rationale": "World Foundation's identity protocol at the intersection of AI and biometrics."},
        {"symbol": "GRT",  "name": "The Graph",          "coingecko_id": "the-graph",          "weight": 8.5,  "current_price_usd": 0.02628,  "market_cap_usd": 283820522,    "volume_24h_usd": 19081356,   "is_stablecoin": False, "ai_rationale": "Indexing protocol essential for on-chain AI data pipelines."},
        {"symbol": "LINK", "name": "Chainlink",          "coingecko_id": "chainlink",          "weight": 14.0, "current_price_usd": 9.95,     "market_cap_usd": 7234644701,   "volume_24h_usd": 327266568,  "is_stablecoin": False, "ai_rationale": "Oracle infrastructure powering AI-to-blockchain data feeds."},
        {"symbol": "ARB",  "name": "Arbitrum",           "coingecko_id": "arbitrum",           "weight": 9.5,  "current_price_usd": 0.1332,   "market_cap_usd": 819275695,    "volume_24h_usd": 109636089,  "is_stablecoin": False, "ai_rationale": "Leading L2 hosting most AI-enabled DeFi and agent infrastructure."},
        {"symbol": "AVAX", "name": "Avalanche",          "coingecko_id": "avalanche-2",        "weight": 11.0, "current_price_usd": 9.58,     "market_cap_usd": 4136375386,   "volume_24h_usd": 246012332,  "is_stablecoin": False, "ai_rationale": "High-throughput chain with growing AI subnet ecosystem."},
        {"symbol": "SOL",  "name": "Solana",             "coingecko_id": "solana",             "weight": 12.5, "current_price_usd": 88.56,    "market_cap_usd": 51139103511,  "volume_24h_usd": 3306021985, "is_stablecoin": False, "ai_rationale": "Highest-performance L1 with dominant AI agent and memecoin AI culture."},
        {"symbol": "HBAR", "name": "Hedera",             "coingecko_id": "hedera-hashgraph",   "weight": 15.0, "current_price_usd": 0.09073,  "market_cap_usd": 3935245142,   "volume_24h_usd": 60130221,   "is_stablecoin": False, "ai_rationale": "Enterprise-grade DLT with Hedera AI Council partnerships and fast finality."},
        {"symbol": "USDC", "name": "USD Coin",           "coingecko_id": "usd-coin",           "weight": 5.0,  "current_price_usd": 1.0,      "market_cap_usd": 0,            "volume_24h_usd": 0,          "is_stablecoin": True,  "ai_rationale": "Stablecoin buffer — reduces volatility exposure in risk-off conditions."},
    ],
    "rwa": [
        {"symbol": "ONDO", "name": "Ondo Finance",       "coingecko_id": "ondo-finance",       "weight": 22.0, "current_price_usd": 0.3994,   "market_cap_usd": 1944810660,   "volume_24h_usd": 381898173,  "is_stablecoin": False, "ai_rationale": "Largest tokenized US Treasury protocol, $500M+ TVL and growing institutional adoption."},
        {"symbol": "MKR",  "name": "Maker",              "coingecko_id": "maker",              "weight": 18.0, "current_price_usd": 1813.70,  "market_cap_usd": 1579418929,   "volume_24h_usd": 163028,     "is_stablecoin": False, "ai_rationale": "DAI stablecoin issuer pivoting to real-world asset backing via Spark Protocol."},
        {"symbol": "CFG",  "name": "Centrifuge",         "coingecko_id": "centrifuge",         "weight": 12.0, "current_price_usd": 0.283,    "market_cap_usd": 159514796,    "volume_24h_usd": 1034462,    "is_stablecoin": False, "ai_rationale": "On-chain credit marketplace for tokenized real-world loans and invoices."},
        {"symbol": "LINK", "name": "Chainlink",          "coingecko_id": "chainlink",          "weight": 16.0, "current_price_usd": 9.95,     "market_cap_usd": 7234644701,   "volume_24h_usd": 327266568,  "is_stablecoin": False, "ai_rationale": "Critical oracle infrastructure for RWA price feeds and proof-of-reserve."},
        {"symbol": "AVAX", "name": "Avalanche",          "coingecko_id": "avalanche-2",        "weight": 14.0, "current_price_usd": 9.58,     "market_cap_usd": 4136375386,   "volume_24h_usd": 246012332,  "is_stablecoin": False, "ai_rationale": "Primary chain for institutional RWA tokenization via Avalanche Evergreen subnets."},
        {"symbol": "ARB",  "name": "Arbitrum",           "coingecko_id": "arbitrum",           "weight": 9.0,  "current_price_usd": 0.1332,   "market_cap_usd": 819275695,    "volume_24h_usd": 109636089,  "is_stablecoin": False, "ai_rationale": "Leading RWA DeFi protocols (Goldfinch, Clearpool) deployed on Arbitrum."},
        {"symbol": "SOL",  "name": "Solana",             "coingecko_id": "solana",             "weight": 4.0,  "current_price_usd": 88.56,    "market_cap_usd": 51139103511,  "volume_24h_usd": 3306021985, "is_stablecoin": False, "ai_rationale": "Emerging institutional RWA tokenization on Solana via Franklin Templeton."},
        {"symbol": "USDC", "name": "USD Coin",           "coingecko_id": "usd-coin",           "weight": 5.0,  "current_price_usd": 1.0,      "market_cap_usd": 0,            "volume_24h_usd": 0,          "is_stablecoin": True,  "ai_rationale": "Stablecoin buffer for RWA index."},
    ],
    "depin": [
        {"symbol": "HNT",  "name": "Helium",             "coingecko_id": "helium",             "weight": 14.0, "current_price_usd": 0.936,    "market_cap_usd": 171861219,    "volume_24h_usd": 2647485,    "is_stablecoin": False, "ai_rationale": "Largest decentralized wireless network with 1M+ hotspots globally."},
        {"symbol": "IOTX", "name": "IoTeX",              "coingecko_id": "iotex",              "weight": 9.0,  "current_price_usd": 0.00478,  "market_cap_usd": 45129741,     "volume_24h_usd": 2749827,    "is_stablecoin": False, "ai_rationale": "IoT-focused DePIN chain with machine RWA protocol and growing device ecosystem."},
        {"symbol": "HBAR", "name": "Hedera",             "coingecko_id": "hedera-hashgraph",   "weight": 13.0, "current_price_usd": 0.09073,  "market_cap_usd": 3935245142,   "volume_24h_usd": 60130221,   "is_stablecoin": False, "ai_rationale": "Enterprise DePIN infrastructure backbone with Hedera Hashgraph consensus."},
        {"symbol": "FIL",  "name": "Filecoin",           "coingecko_id": "filecoin",           "weight": 16.0, "current_price_usd": 1.089,    "market_cap_usd": 847225871,    "volume_24h_usd": 193861512,  "is_stablecoin": False, "ai_rationale": "Largest decentralized storage network — foundation of compute DePIN."},
        {"symbol": "SOL",  "name": "Solana",             "coingecko_id": "solana",             "weight": 15.0, "current_price_usd": 88.56,    "market_cap_usd": 51139103511,  "volume_24h_usd": 3306021985, "is_stablecoin": False, "ai_rationale": "Dominant chain for DePIN protocols: Helium, Hivemapper, DIMO all migrated to Solana."},
        {"symbol": "AVAX", "name": "Avalanche",          "coingecko_id": "avalanche-2",        "weight": 14.0, "current_price_usd": 9.58,     "market_cap_usd": 4136375386,   "volume_24h_usd": 246012332,  "is_stablecoin": False, "ai_rationale": "Growing DePIN subnet ecosystem on Avalanche with energy and telecom verticals."},
        {"symbol": "ARB",  "name": "Arbitrum",           "coingecko_id": "arbitrum",           "weight": 14.0, "current_price_usd": 0.1332,   "market_cap_usd": 819275695,    "volume_24h_usd": 109636089,  "is_stablecoin": False, "ai_rationale": "DePIN settlement layer for compute and connectivity protocols on Arbitrum."},
        {"symbol": "USDC", "name": "USD Coin",           "coingecko_id": "usd-coin",           "weight": 5.0,  "current_price_usd": 1.0,      "market_cap_usd": 0,            "volume_24h_usd": 0,          "is_stablecoin": True,  "ai_rationale": "Stablecoin buffer for DePIN index."},
    ],
}

now = datetime.now(timezone.utc)

AGENT_LOGS = [
    {
        "id": str(uuid.uuid4()),
        "index_id": "ai-crypto",
        "agent": "scout",
        "action": "screening_complete",
        "token_symbol": "TAO",
        "description": "Daily momentum screening completed. TAO leads 7d momentum at +18.4%. HBAR added to watchlist for next rebalance.",
        "timestamp": now - timedelta(hours=6),
        "data": '{"screened": 42, "shortlisted": 3, "top_momentum": "TAO"}',
    },
    {
        "id": str(uuid.uuid4()),
        "index_id": "rwa",
        "agent": "scout",
        "action": "opportunity_flagged",
        "token_symbol": "ONDO",
        "description": "ONDO showing strong volume spike (+340% 24h). Potential institutional accumulation ahead of Q2 earnings.",
        "timestamp": now - timedelta(hours=14),
        "data": '{"vol_change_pct": 340, "price_delta_1h": 2.1, "signal": "bullish"}',
    },
    {
        "id": str(uuid.uuid4()),
        "index_id": "ai-crypto",
        "agent": "rebalancer",
        "action": "rebalance_executed",
        "token_symbol": "FET",
        "description": "Rebalance executed: reduced FET from 12.0% to 10.5%, increased HBAR from 13.5% to 15.0% based on 30d performance delta.",
        "timestamp": now - timedelta(hours=28),
        "data": '{"trades": [{"from": "FET", "delta_weight": -1.5}, {"to": "HBAR", "delta_weight": 1.5}], "slippage_bps": 4}',
    },
    {
        "id": str(uuid.uuid4()),
        "index_id": "depin",
        "agent": "rebalancer",
        "action": "rebalance_skipped",
        "token_symbol": None,
        "description": "Scheduled rebalance skipped: all constituents within 1.2% drift threshold. Next evaluation in 48h.",
        "timestamp": now - timedelta(hours=52),
        "data": '{"max_drift_pct": 1.2, "threshold_pct": 2.0, "action": "hold"}',
    },
    {
        "id": str(uuid.uuid4()),
        "index_id": "ai-crypto",
        "agent": "narrator",
        "action": "report_published",
        "token_symbol": None,
        "description": "Weekly narrative published: 'AI agents are eating DeFi — TAO and HBAR lead as institutional interest in on-chain inference grows.'",
        "timestamp": now - timedelta(days=1, hours=3),
        "data": '{"report_type": "weekly", "word_count": 412, "sentiment": "bullish"}',
    },
    {
        "id": str(uuid.uuid4()),
        "index_id": "rwa",
        "agent": "narrator",
        "action": "alert_published",
        "token_symbol": "MKR",
        "description": "MKR governance vote passed: Spark Protocol to allocate $200M in new RWA collateral. Bullish for index NAV.",
        "timestamp": now - timedelta(days=2, hours=7),
        "data": '{"governance_event": "spark_rwa_expansion", "impact": "high", "sentiment": "bullish"}',
    },
]


def seed_indexes(db):
    existing = db.query(AlphaIndex).count()
    if existing > 0:
        print(f"[skip] indexes already seeded ({existing} records found)")
        return False

    for data in INDEXES:
        idx = AlphaIndex(**data)
        db.add(idx)
        print(f"[+] index: {data['name']}")

    db.commit()
    return True


def seed_constituents(db):
    existing = db.query(IndexConstituent).count()
    if existing > 0:
        print(f"[skip] constituents already seeded ({existing} records found)")
        return False

    total = 0
    for index_id, tokens in CONSTITUENTS.items():
        for token in tokens:
            c = IndexConstituent(
                index_id=index_id,
                symbol=token["symbol"],
                name=token["name"],
                coingecko_id=token["coingecko_id"],
                weight=token["weight"],
                current_price_usd=token["current_price_usd"],
                market_cap_usd=token["market_cap_usd"],
                volume_24h_usd=token["volume_24h_usd"],
                is_stablecoin=token["is_stablecoin"],
                ai_rationale=token["ai_rationale"],
                added_at=now,
            )
            db.add(c)
            print(f"[+] constituent: [{index_id}] {token['symbol']} ({token['weight']}%)")
            total += 1

    db.commit()
    return total


def seed_agent_logs(db):
    existing = db.query(AgentActivityLog).count()
    if existing > 0:
        print(f"[skip] agent_activity already seeded ({existing} records found)")
        return False

    for log in AGENT_LOGS:
        entry = AgentActivityLog(
            id=log["id"],
            index_id=log["index_id"],
            agent=log["agent"],
            action=log["action"],
            token_symbol=log.get("token_symbol"),
            description=log["description"],
            timestamp=log["timestamp"],
            data=log.get("data"),
        )
        db.add(entry)
        print(f"[+] agent_log: [{log['agent']}] {log['action']} ({log['index_id']})")

    db.commit()
    return True


def main():
    print("=== AlphaGrid seed ===")
    create_tables()

    db = SessionLocal()
    try:
        seed_indexes(db)
        seed_constituents(db)
        seed_agent_logs(db)

        idx_count = db.query(AlphaIndex).count()
        const_count = db.query(IndexConstituent).count()
        log_count = db.query(AgentActivityLog).count()

        print("\n=== seed complete ===")
        print(f"  indexes:         {idx_count}")
        print(f"  constituents:    {const_count}")
        print(f"  agent_activity:  {log_count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
