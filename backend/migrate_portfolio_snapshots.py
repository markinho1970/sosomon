"""Migration: cria tabela portfolio_snapshots e insere snapshot inicial para portfolios existentes."""
import sys
sys.path.insert(0, '.')
from database import engine, SessionLocal
from models import Base, PortfolioSnapshot, SubscriberPortfolio
from datetime import datetime, timezone
from sqlalchemy import inspect

def run():
    inspector = inspect(engine)
    if "portfolio_snapshots" not in inspector.get_table_names():
        Base.metadata.create_all(engine, tables=[PortfolioSnapshot.__table__])
        print("Tabela portfolio_snapshots criada.")
    else:
        print("Tabela portfolio_snapshots já existe.")

    db = SessionLocal()
    try:
        portfolios = db.query(SubscriberPortfolio).all()
        inserted = 0
        for p in portfolios:
            existing = db.query(PortfolioSnapshot).filter(
                PortfolioSnapshot.portfolio_id == p.id
            ).first()
            if not existing and p.current_value_usd:
                snap = PortfolioSnapshot(
                    portfolio_id=p.id,
                    index_id=p.index_id,
                    network_mode=getattr(p, "network_mode", "mainnet"),
                    snapshot_at=p.first_invested_at or datetime.now(timezone.utc),
                    value_usd=p.deposited_usd or p.current_value_usd,
                    deposited_usd=p.deposited_usd,
                    nav_per_token=None,
                )
                db.add(snap)
                inserted += 1
        db.commit()
        print(f"Snapshots iniciais inseridos: {inserted}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
