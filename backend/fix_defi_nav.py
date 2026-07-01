"""
Corrige o NAV do DeFi Infrastructure Index (depin-momentum) bloqueado pelo
sanity guard >5%/hora.

Causa: price_at_nav_ref defasado → delta acumulado vs preço SoDEX ao vivo > 5%.
Solução:
  1. Busca preços ao vivo via SoDEX get_all_tickers()
  2. Recalcula NAV aplicando o retorno acumulado desde price_at_nav_ref
  3. Atualiza price_at_nav_ref = preço_atual (desbloqueando o sanity guard)
  4. Grava novo nav_usd e total_return_pct no índice

Execução (simulação):  python3 fix_defi_nav.py --dry-run
Execução (real):       python3 fix_defi_nav.py
"""
import sys, asyncio
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from database import SessionLocal
from models import AlphaIndex, IndexConstituent
import services.sodex as sodex
from sqlalchemy import text
from datetime import datetime, timezone

INDEX_ID = "depin-momentum"
DRY_RUN  = "--dry-run" in sys.argv


async def main():
    db = SessionLocal()

    # 1. Busca tickers ao vivo
    print("Buscando tickers SoDEX...")
    tickers = await sodex.get_all_tickers()
    if not tickers:
        print("ERRO: nenhum ticker retornado. Verifique conectividade com SoDEX.")
        db.close()
        return
    print(f"  {len(tickers)} aliases recebidos.")

    # 2. Carrega índice e constituintes da cesta (mainnet)
    idx = db.query(AlphaIndex).filter_by(id=INDEX_ID).first()
    if not idx:
        print(f"ERRO: índice '{INDEX_ID}' não encontrado.")
        db.close()
        return

    constituents = db.query(IndexConstituent).filter_by(
        index_id=INDEX_ID, network_mode="mainnet", in_basket=True
    ).all()

    print(f"\nÍndice: {idx.name}")
    print(f"NAV atual (congelado): ${idx.nav_usd:.6f}  ({idx.total_return_pct:+.2f}%)")
    print(f"Último rebalanceamento: {idx.last_rebalanced_at}")
    print()

    # 3. Calcula retorno acumulado para cada token
    print(f"{'TOKEN':<12} {'PESO':>6}  {'NAV_REF':>12}  {'SoDEX_LIVE':>12}  {'DELTA':>10}  {'CONTRIB':>10}")
    print("-" * 76)

    weighted_return = 0.0
    total_weight    = 0.0
    updates = []

    for c in constituents:
        sym = c.symbol  # ex: "AAVE", "DEFIssi", "UNI", "LINK"

        # get_all_tickers registra alias sem prefixo v (ex: "AAVE", "AAVE-USDC")
        ticker = tickers.get(sym) or tickers.get(sym.upper()) or tickers.get(f"{sym}-USDC")

        if ticker:
            try:
                live_price = float(ticker.get("lastPrice") or 0)
            except Exception:
                live_price = 0.0
        else:
            live_price = 0.0

        if live_price <= 0:
            # Fallback: usa current_price_usd do DB
            live_price = c.current_price_usd
            print(f"  {c.symbol:<12} {c.weight:>5.1f}%  ${c.price_at_nav_ref:>11.4f}  {'SEM DADO':>12}  {'N/A':>10}  {'N/A':>10}  ⚠ usando DB")
        else:
            ref = c.price_at_nav_ref if c.price_at_nav_ref > 0 else live_price
            delta = (live_price - ref) / ref if ref > 0 else 0.0
            contrib = (c.weight / 100.0) * delta
            weighted_return += contrib
            total_weight    += c.weight
            print(f"  {c.symbol:<12} {c.weight:>5.1f}%  ${ref:>11.4f}  ${live_price:>11.4f}  {delta*100:>+9.2f}%  {contrib*100:>+9.2f}%")

        updates.append((c, live_price))

    print("-" * 76)
    if total_weight > 0:
        print(f"  {'TOTAL':<12} {total_weight:>5.1f}%  {'':>12}  {'':>12}  {'':>10}  {weighted_return*100:>+9.2f}%")

    # 4. Calcula novo NAV
    new_nav       = round(idx.nav_usd * (1.0 + weighted_return), 6)
    new_nav       = max(new_nav, 0.0001)
    new_total_ret = round((new_nav - 1.0) * 100.0, 2)

    print(f"\nNAV congelado:              ${idx.nav_usd:.6f}")
    print(f"Retorno acumulado pendente:  {weighted_return*100:+.4f}%")
    print(f"NAV corrigido:              ${new_nav:.6f}  ({new_total_ret:+.2f}% all-time)")

    if DRY_RUN:
        print("\n[DRY RUN — nenhuma alteração foi gravada no banco]")
        db.close()
        return

    # 5. Grava no banco
    print("\nAplicando correções no banco...")
    for c, live_price in updates:
        if live_price > 0:
            c.price_at_nav_ref  = live_price
            c.current_price_usd = live_price

    db.execute(text("""
        UPDATE indexes SET
            nav_usd          = :nav,
            total_return_pct = :ret
        WHERE id = :id
    """), {"nav": new_nav, "ret": new_total_ret, "id": INDEX_ID})

    db.commit()
    db.close()

    print(f"✓ price_at_nav_ref sincronizado para {len(updates)} tokens")
    print(f"✓ NAV atualizado: ${new_nav:.6f}  ({new_total_ret:+.2f}%)")
    print("✓ Sanity guard desbloqueado — próxima rodada do NAV Updater funcionará normalmente.")


asyncio.run(main())
