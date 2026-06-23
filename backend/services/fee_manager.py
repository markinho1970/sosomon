"""
Fee Manager — Wave 3

Cobrança de taxas reais sobre AUM e performance.

- Management fee: 2% ao ano, cobrado mensalmente (1/12 por mês)
  Base: AUM total do índice no momento da cobrança.

- Performance fee: 20% sobre ganhos acima do high-water mark
  Base: lucro dos portfolios acima do HWM individual de cada investidor.

Chamado pelo scheduler uma vez por mês (dia 1, 08:00 UTC).
Todas as cobranças são registradas em AgentActivityLog.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List

from database import SessionLocal
from models import AlphaIndex, SubscriberPortfolio, AgentActivityLog

logger = logging.getLogger(__name__)

MANAGEMENT_FEE_ANNUAL_PCT = 2.0      # 2% ao ano
PERFORMANCE_FEE_PCT       = 20.0     # 20% sobre ganhos acima do HWM
MONTHS_PER_YEAR           = 12


def _monthly_mgmt_rate() -> float:
    """Taxa mensal equivalente a 2% ao ano."""
    return MANAGEMENT_FEE_ANNUAL_PCT / 100.0 / MONTHS_PER_YEAR


async def collect_management_fees(dry_run: bool = True) -> List[Dict]:
    """
    Cobra management fee (2%/a) mensalmente sobre AUM de cada índice.

    Em Wave 3 com execução real, a cobrança seria via transferência de tokens
    ou redução do AUM. Por ora, registra o evento e reduz o AUM no DB.
    """
    db = SessionLocal()
    results = []
    try:
        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
        monthly_rate = _monthly_mgmt_rate()

        for idx in indexes:
            aum = idx.aum_usd or 0.0
            if aum <= 0:
                continue

            fee_amount = round(aum * monthly_rate, 4)

            result = {
                "index_id": idx.id,
                "index_name": idx.name,
                "aum_usd": aum,
                "fee_pct_monthly": round(monthly_rate * 100, 4),
                "fee_amount_usd": fee_amount,
                "type": "management_fee",
                "dry_run": dry_run,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            if not dry_run:
                idx.aum_usd = round(aum - fee_amount, 4)

                db.add(AgentActivityLog(
                    id=str(uuid.uuid4()),
                    index_id=idx.id,
                    agent="fee_manager",
                    action="management_fee_collected",
                    token_symbol="USDC",
                    description=(
                        f"Management fee: ${fee_amount:.4f} USDC cobrado de {idx.name} "
                        f"(AUM ${aum:.2f} × {monthly_rate*100:.4f}%/mês = 2%/ano)"
                    ),
                    timestamp=datetime.now(timezone.utc),
                    data=result,
                ))
                logger.info(f"Fee Manager: management fee ${fee_amount:.4f} cobrado de {idx.name}")
            else:
                logger.info(f"[DRY RUN] Fee Manager: management fee ${fee_amount:.4f} de {idx.name}")

            results.append(result)

        if not dry_run:
            db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"Fee Manager: erro em management fee: {e}", exc_info=True)
    finally:
        db.close()

    return results


async def collect_performance_fees(dry_run: bool = True) -> List[Dict]:
    """
    Cobra performance fee (20%) sobre ganhos acima do high-water mark.

    Para cada portfolio onde current_value > deposited_usd (lucro real),
    cobra 20% do lucro acumulado acima do HWM.

    Após cobrança, HWM é atualizado para o valor atual pós-taxa.
    """
    db = SessionLocal()
    results = []
    try:
        portfolios = db.query(SubscriberPortfolio).all()

        for p in portfolios:
            hwm     = p.high_water_mark_usd or p.deposited_usd or 0.0
            current = p.current_value_usd or 0.0

            if current <= hwm:
                continue

            gain_above_hwm = current - hwm
            fee_amount = round(gain_above_hwm * (PERFORMANCE_FEE_PCT / 100.0), 4)

            if fee_amount < 0.01:
                continue

            idx = db.query(AlphaIndex).filter_by(id=p.index_id).first()
            idx_name = idx.name if idx else p.index_id

            result = {
                "portfolio_id": p.id,
                "index_id": p.index_id,
                "index_name": idx_name,
                "subscriber_id": p.subscriber_id,
                "current_value_usd": current,
                "high_water_mark_usd": hwm,
                "gain_above_hwm": gain_above_hwm,
                "fee_pct": PERFORMANCE_FEE_PCT,
                "fee_amount_usd": fee_amount,
                "type": "performance_fee",
                "dry_run": dry_run,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            if not dry_run:
                p.current_value_usd  = round(current - fee_amount, 4)
                p.high_water_mark_usd = p.current_value_usd
                p.last_updated_at    = datetime.now(timezone.utc)

                db.add(AgentActivityLog(
                    id=str(uuid.uuid4()),
                    index_id=p.index_id,
                    agent="fee_manager",
                    action="performance_fee_collected",
                    token_symbol="USDC",
                    description=(
                        f"Performance fee: ${fee_amount:.4f} USDC cobrado (portfolio #{p.id}, {idx_name}). "
                        f"Ganho acima do HWM: ${gain_above_hwm:.4f} × {PERFORMANCE_FEE_PCT}% = ${fee_amount:.4f}. "
                        f"Novo HWM: ${p.high_water_mark_usd:.4f}"
                    ),
                    timestamp=datetime.now(timezone.utc),
                    data=result,
                ))
                logger.info(f"Fee Manager: performance fee ${fee_amount:.4f} cobrado do portfolio #{p.id}")
            else:
                logger.info(f"[DRY RUN] Fee Manager: performance fee ${fee_amount:.4f} do portfolio #{p.id}")

            results.append(result)

        if not dry_run:
            db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"Fee Manager: erro em performance fee: {e}", exc_info=True)
    finally:
        db.close()

    return results


async def run_monthly_fees(dry_run: bool = True) -> Dict:
    """
    Ponto de entrada do scheduler mensal.
    Executa management fee + performance fee em sequência.
    """
    logger.info(f"Fee Manager: iniciando cobrança mensal (dry_run={dry_run})")

    mgmt_results  = await collect_management_fees(dry_run=dry_run)
    perf_results  = await collect_performance_fees(dry_run=dry_run)

    total_mgmt = sum(r["fee_amount_usd"] for r in mgmt_results)
    total_perf = sum(r["fee_amount_usd"] for r in perf_results)

    summary = {
        "dry_run": dry_run,
        "management_fees": {
            "count": len(mgmt_results),
            "total_usd": round(total_mgmt, 4),
            "details": mgmt_results,
        },
        "performance_fees": {
            "count": len(perf_results),
            "total_usd": round(total_perf, 4),
            "details": perf_results,
        },
        "total_fees_usd": round(total_mgmt + total_perf, 4),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(
        f"Fee Manager: cobrança concluída — "
        f"management ${total_mgmt:.4f} + performance ${total_perf:.4f} = ${total_mgmt+total_perf:.4f}"
    )
    return summary
