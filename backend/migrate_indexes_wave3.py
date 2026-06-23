"""
migrate_indexes_wave3.py — Migração para execução real no SoDEX

Substitui os constituintes dos 3 índices por tokens 100% negociáveis no SoDEX/SoSoValue.
Reseta NAV para $1.00 e recalcula portfolios preservando valor em dólares.

Uso:
    python3 migrate_indexes_wave3.py             # preview (dry-run implícito)
    python3 migrate_indexes_wave3.py --dry-run   # preview explícito
    python3 migrate_indexes_wave3.py --execute   # aplica no banco
"""

import sys, asyncio, uuid, argparse
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()

from datetime import datetime
from database import SessionLocal
from models import AlphaIndex, IndexConstituent, SubscriberPortfolio, AgentActivityLog
from sqlalchemy import text

# ── Nova composição dos índices ──────────────────────────────────────────────
# Todos os tokens devem ser negociáveis no SoDEX.
# sodex_lookup: chave usada em get_all_tickers() para buscar preço atual.

NEW_INDEXES = {
    "ai-crypto-infrastructure": {
        "name": "AI & Tech Index",
        "description": (
            "Exposição a tecnologia de inteligência artificial e infraestrutura digital "
            "através de tokens SSI da SoSoValue e ativos crypto de alta liquidez no SoDEX."
        ),
        "constituents": [
            {
                "symbol": "MAG7ssi",
                "name": "Mag7 SSI (SoSoValue)",
                "weight": 40.0,
                "sodex_lookup": "MAG7ssi",
                "is_stablecoin": False,
                "ai_rationale": "Índice SSI das 7 maiores tech stocks (MSFT, AAPL, NVDA, GOOGL, META, AMZN, TSLA). Exposição diversificada ao setor de IA via equity sintético.",
            },
            {
                "symbol": "ETH",
                "name": "Ethereum",
                "weight": 20.0,
                "sodex_lookup": "ETH",
                "is_stablecoin": False,
                "ai_rationale": "Infraestrutura de IA on-chain. Base de smart contracts para aplicações de AI agents e DeFi.",
            },
            {
                "symbol": "SOL",
                "name": "Solana",
                "weight": 15.0,
                "sodex_lookup": "SOL",
                "is_stablecoin": False,
                "ai_rationale": "Alto throughput ideal para AI agents. Ecossistema ativo de projetos de IA on-chain.",
            },
            {
                "symbol": "WSOSO",
                "name": "SoSo (WSOSO)",
                "weight": 15.0,
                "sodex_lookup": "WSOSO",
                "is_stablecoin": False,
                "ai_rationale": "Token nativo do ecossistema SoSoValue. Alinhamento com a plataforma de indices.",
            },
            {
                "symbol": "NVDA",
                "name": "NVIDIA (Sintético)",
                "weight": 10.0,
                "sodex_lookup": "NVDA",
                "is_stablecoin": False,
                "ai_rationale": "Exposição direta à IA de hardware. Líder em GPUs para treinamento de modelos. Substituir por BTC se HALT.",
            },
        ],
    },
    "real-world-assets-top10": {
        "name": "Real Assets Index",
        "description": (
            "Exposição a ativos reais tokenizados: índice de ações americanas, ouro digital "
            "e store of value. Portfólio defensivo e lastreado em valor real."
        ),
        "constituents": [
            {
                "symbol": "USSI",
                "name": "US Stocks SSI (SoSoValue)",
                "weight": 35.0,
                "sodex_lookup": "USSI",
                "is_stablecoin": False,
                "ai_rationale": "Índice SSI de ações americanas tokenizado. Maior exposição RWA disponível no SoDEX com liquidez consistente.",
            },
            {
                "symbol": "XAUt",
                "name": "Ouro Tokenizado",
                "weight": 30.0,
                "sodex_lookup": "XAUt",
                "is_stablecoin": False,
                "ai_rationale": "Ouro — ativo real por excelência. Hedge de inflação e reserva de valor histórica. Ativo real tokenizado no SoDEX.",
            },
            {
                "symbol": "BTC",
                "name": "Bitcoin",
                "weight": 20.0,
                "sodex_lookup": "BTC",
                "is_stablecoin": False,
                "ai_rationale": "Store of value digital. Ouro 2.0. Âncora do portfólio de ativos reais.",
            },
            {
                "symbol": "WSOSO",
                "name": "SoSo (WSOSO)",
                "weight": 15.0,
                "sodex_lookup": "WSOSO",
                "is_stablecoin": False,
                "ai_rationale": "Token nativo do ecossistema SoSoValue. Alinhamento com a plataforma.",
            },
        ],
    },
    "depin-momentum": {
        "name": "DeFi Infrastructure Index",
        "description": (
            "Exposição ao ecossistema DeFi via índice SSI amplo e protocolos líderes de "
            "lending, DEX e oráculos. Todos os tokens negociáveis no SoDEX."
        ),
        "constituents": [
            {
                "symbol": "DEFIssi",
                "name": "DeFi SSI (SoSoValue)",
                "weight": 40.0,
                "sodex_lookup": "DEFIssi",
                "is_stablecoin": False,
                "ai_rationale": "Índice SSI DeFi amplo. Cobertura diversificada do setor com rebalanceamento automático pela SoSoValue.",
            },
            {
                "symbol": "AAVE",
                "name": "Aave",
                "weight": 20.0,
                "sodex_lookup": "AAVE",
                "is_stablecoin": False,
                "ai_rationale": "Líder em lending descentralizado. Backbone do DeFi com bilhões em TVL.",
            },
            {
                "symbol": "UNI",
                "name": "Uniswap",
                "weight": 20.0,
                "sodex_lookup": "UNI",
                "is_stablecoin": False,
                "ai_rationale": "DEX líder em volume. Protocolo fundamental para liquidez on-chain.",
            },
            {
                "symbol": "LINK",
                "name": "Chainlink",
                "weight": 20.0,
                "sodex_lookup": "LINK",
                "is_stablecoin": False,
                "ai_rationale": "Oracle crítico para DeFi e contratos inteligentes. Infraestrutura essencial do ecossistema.",
            },
        ],
    },
}

SEP  = "=" * 65
SEP2 = "-" * 65


async def fetch_prices() -> dict:
    """Busca preços atuais do SoDEX para todos os tokens novos."""
    from services.sodex import get_all_tickers
    print("  Buscando preços no SoDEX...")
    try:
        tickers = await get_all_tickers()
        print(f"  ✓ {len(tickers)} tickers recebidos do SoDEX")
        return tickers
    except Exception as e:
        print(f"  ⚠ Erro ao buscar tickers: {e}")
        return {}


def resolve_price(symbol: str, tickers: dict) -> float:
    """Tenta encontrar o preço de um símbolo nos tickers do SoDEX.
    Formato principal SoDEX: v{SYMBOL}_vUSDC (ex: vETH_vUSDC, vNVDA_vUSDC)
    Exceção: WSOSO → WSOSO_vUSDC (sem prefixo v)
    """
    candidates = [
        symbol,
        f"{symbol}_vUSDC",
        f"v{symbol}_vUSDC",
        f"{symbol}-USDC",
        f"v{symbol}",
        f"v{symbol}-USDC",
    ]
    for key in candidates:
        t = tickers.get(key)
        if t:
            p = float(t.get("lastPx") or t.get("lastPrice") or t.get("c") or 0)
            if p > 0:
                return p
    return 0.0


async def run(dry_run: bool):
    db = SessionLocal()
    try:
        tickers = await fetch_prices()

        print()
        print(SEP)
        print("  MIGRAÇÃO WAVE 3 — " + ("DRY RUN (preview)" if dry_run else "EXECUÇÃO REAL"))
        print(SEP)

        migration_log = []

        for index_id, new_cfg in NEW_INDEXES.items():
            idx = db.query(AlphaIndex).filter_by(id=index_id).first()
            if not idx:
                print(f"\n⚠ Índice não encontrado: {index_id} — pulando")
                continue

            old_cons = db.query(IndexConstituent).filter_by(index_id=index_id).all()
            old_summary = ", ".join(f"{c.symbol} {c.weight:.1f}%" for c in old_cons)

            print()
            print(f"[ {idx.name} → {new_cfg['name']} ]")
            print(f"  ID: {index_id}")
            print(f"  NAV atual:  ${idx.nav_usd:.4f}")
            print(f"  Antes: {old_summary}")
            print()

            # Calcular pesos e preços novos
            total_weight = sum(c["weight"] for c in new_cfg["constituents"])
            print(f"  Novos constituintes (total peso: {total_weight:.1f}%):")

            new_cons_data = []
            all_prices_ok = True
            for c in new_cfg["constituents"]:
                price = resolve_price(c["sodex_lookup"], tickers)
                status = "✓" if price > 0 else "⚠ SEM PREÇO"
                if price == 0:
                    all_prices_ok = False
                print(f"    {status}  {c['symbol']:12s}  {c['weight']:5.1f}%   ${price:.4f}")
                new_cons_data.append({**c, "price": price})

            # Portfolios afetados
            portfolios = db.query(SubscriberPortfolio).filter_by(index_id=index_id).all()
            print()
            print(f"  Portfolios afetados: {len(portfolios)}")
            for p in portfolios:
                new_tokens = p.current_value_usd  # nav novo = $1.00, então tokens = valor em USD
                print(f"    Portfolio #{p.id}: valor=${p.current_value_usd:.4f} → {p.index_tokens_held:.4f} tokens → {new_tokens:.4f} tokens (NAV $1.00)")

            if not dry_run:
                # ── Aplicar migração ────────────────────────────────────────

                # 1. Remover constituintes antigos (ambos os ambientes)
                db.query(IndexConstituent).filter_by(index_id=index_id).delete()

                # 2. Inserir novos constituintes para mainnet e testnet
                # Testnet: exclui tokens em HALT na mainnet (NVDA, TSLA, AAPL, etc.)
                # mas na testnet esses tokens estão disponíveis — cesta completa em ambos
                for network in ("mainnet", "testnet"):
                    for c in new_cons_data:
                        price = c["price"]
                        constituent = IndexConstituent(
                            index_id=index_id,
                            symbol=c["symbol"],
                            name=c["name"],
                            coingecko_id=None,
                            weight=c["weight"],
                            current_price_usd=price,
                            price_at_nav_ref=price,
                            market_cap_usd=0.0,
                            volume_24h_usd=0.0,
                            price_change_7d=0.0,
                            price_change_30d=0.0,
                            ai_rationale=c["ai_rationale"],
                            is_stablecoin=c["is_stablecoin"],
                            network_mode=network,
                            added_at=datetime.utcnow(),
                        )
                        db.add(constituent)
                print(f"  ✓ Constituintes inseridos para mainnet e testnet")

                # 3. Resetar NAV do índice para $1.00 e atualizar metadados
                import math as _math
                SODEX_MIN_ORDER = 5.0
                non_stable_weights = [
                    c["weight"] for c in new_cons_data if not c["is_stablecoin"] and c["weight"] > 0
                ]
                min_deposit = (
                    _math.ceil(SODEX_MIN_ORDER / (min(non_stable_weights) / 100))
                    if non_stable_weights else 50.0
                )

                old_nav = idx.nav_usd
                idx.nav_usd = 1.0
                idx.name = new_cfg["name"]
                idx.description = new_cfg["description"]
                idx.total_return_pct = 0.0
                idx.return_30d_pct = 0.0
                idx.return_7d_pct = 0.0
                idx.inception_date = datetime.utcnow()
                idx.management_fee_pct = 2.0    # Wave 3: 2%/ano
                idx.min_deposit_usd = min_deposit
                print(f"  min_deposit_usd calculado: ${min_deposit:.0f} (menor peso: {min(non_stable_weights) if non_stable_weights else 'N/A'}%)")

                # 4. Recalcular tokens dos portfolios (preserva valor em USD)
                for p in portfolios:
                    p.index_tokens_held = p.current_value_usd  # novo NAV = $1.00
                    p.high_water_mark_usd = p.current_value_usd
                    p.last_updated_at = datetime.utcnow()

                db.flush()

                migration_log.append({
                    "index_id": index_id,
                    "old_name": idx.name,
                    "new_name": new_cfg["name"],
                    "old_nav": old_nav,
                    "tokens_migrated": len(new_cons_data),
                    "portfolios_updated": len(portfolios),
                })

                print(f"  ✓ Migração aplicada: {len(new_cons_data)} constituintes, NAV resetado para $1.00")
            else:
                print(f"  [DRY RUN] Nenhuma alteração feita.")

        if not dry_run and migration_log:
            # Registrar em AgentActivityLog
            log_entry = AgentActivityLog(
                id=str(uuid.uuid4()),
                index_id=None,
                agent="migration",
                action="wave3_migration",
                token_symbol=None,
                description=f"Wave 3 migration: {len(migration_log)} indexes migrated to SoDEX-native tokens. NAV reset to $1.00.",
                timestamp=datetime.utcnow(),
                data={"indexes": migration_log},
            )
            db.add(log_entry)
            db.commit()
            print()
            print(SEP)
            print("  ✓ MIGRAÇÃO CONCLUÍDA COM SUCESSO")
            print(f"  {len(migration_log)} índices migrados, NAV resetado para $1.00")
            print(f"  Registrado em AgentActivityLog")
            print(SEP)
        elif dry_run:
            print()
            print(SEP)
            print("  DRY RUN CONCLUÍDO — nenhuma alteração feita")
            print("  Para aplicar: python3 migrate_indexes_wave3.py --execute")
            print(SEP)

    except Exception as e:
        db.rollback()
        print(f"\n✗ ERRO: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migração Wave 3 — SoSoMon")
    parser.add_argument("--execute", action="store_true", help="Aplica a migração no banco")
    parser.add_argument("--dry-run", action="store_true", help="Preview sem alterar (padrão)")
    args = parser.parse_args()

    dry_run = not args.execute
    asyncio.run(run(dry_run=dry_run))
