import sys, uuid, os
os.chdir('/opt/alphagrid/backend')
sys.path.insert(0, '/opt/alphagrid/backend')
from datetime import datetime, timezone
from database import SessionLocal
from models import SubscriberPortfolio, InvestmentIntent, AlphaIndex, Subscriber, AgentActivityLog

db = SessionLocal()
WALLET   = "0x1a3ade798b60bd6e99ff3d84367cc7913115031c"
INDEX_ID = "real-world-assets-top10"
AMOUNT   = 5.0
TX_HASH  = "0x3236fb2f1944ac083e9d780eed2c1dae212e201501dcf7fcc34344aab6d9b611"
NETWORK  = "testnet"

sub = db.query(Subscriber).filter(Subscriber.wallet_address == WALLET).first()
idx = db.query(AlphaIndex).filter(AlphaIndex.id == INDEX_ID).first()
nav    = max(idx.nav_usd or 1.0, 0.0001)
tokens = AMOUNT / nav
print(f"NAV:{nav:.6f}  Tokens:{tokens:.4f}")

port = SubscriberPortfolio(
    subscriber_id=sub.id, index_id=INDEX_ID,
    deposited_usd=AMOUNT, current_value_usd=AMOUNT,
    index_tokens_held=tokens, high_water_mark_usd=AMOUNT,
    network_mode=NETWORK,
    first_invested_at=datetime.now(timezone.utc),
    last_updated_at=datetime.now(timezone.utc),
)
db.add(port)

intent = db.query(InvestmentIntent).filter(
    InvestmentIntent.wallet_address == WALLET,
    InvestmentIntent.index_id == INDEX_ID,
    InvestmentIntent.fulfilled == False,
    InvestmentIntent.network_mode == NETWORK,
).first()
if intent:
    intent.fulfilled = True
    print("Intent: fulfilled")

idx.aum_usd = (idx.aum_usd or 0) + AMOUNT
idx.subscriber_count = (idx.subscriber_count or 0) + 1

db.add(AgentActivityLog(
    id=str(uuid.uuid4()), index_id=INDEX_ID,
    agent="deposit_monitor", action="deposit_detected",
    token_symbol="USDC",
    description=f"[TESTNET] $5.00 USDC de {WALLET[:8]}...{WALLET[-4:]} -> Real World Assets Index | CREDITADO MANUALMENTE | Tx:{TX_HASH}",
    timestamp=datetime.now(timezone.utc),
    data={"tx_hash": TX_HASH, "from": WALLET, "amount_usd": AMOUNT,
          "tokens": round(tokens, 6), "nav_at_deposit": nav,
          "network_mode": NETWORK, "manual_credit": True},
))
db.commit()
print(f"OK - RWA AUM: ${idx.aum_usd:.2f}")
db.close()
