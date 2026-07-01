"""
Migração: corrige símbolos dos tokens candidatos (in_basket=0) removendo prefixo 'v'.

Problema: candidatos foram inseridos com símbolos como 'vBTC', 'vSUI', 'vETH', etc.
O NAV Updater e o SoDEX get_all_tickers() usam aliases sem o prefixo 'v'
(ex: 'BTC', 'SUI', 'ETH'). Candidatos com prefixo 'v' nunca recebem atualização
de preço e ficariam invisíveis para o cálculo de NAV se entrassem na cesta.

Execução: python3 migrate_fix_candidate_symbols.py
"""
import sqlite3

DB_PATH = "alphagrid.db"

# Mapeamento: símbolo errado → símbolo correto (formato SoDEX sem prefixo v)
SYMBOL_FIXES = {
    "vBTC":  "BTC",
    "vSUI":  "SUI",
    "vHYPE": "HYPE",
    "vLINK": "LINK",
    "vAVAX": "AVAX",
    "vETH":  "ETH",
    "vSOL":  "SOL",
    "vTON":  "TON",
    "vXLM":  "XLM",
    "vXRP":  "XRP",
    "vBNB":  "BNB",
    "vADA":  "ADA",
    "vARB":  "ARB",
}

def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print(f"{'ANTES':<10}  →  {'DEPOIS':<10}  {'ÍNDICE':<35}  {'REDE'}")
    print("-" * 80)

    total = 0
    skipped = 0

    for old_sym, new_sym in SYMBOL_FIXES.items():
        # Busca todos os candidatos com esse símbolo
        rows = cur.execute(
            "SELECT id, index_id, network_mode, in_basket FROM constituents WHERE symbol=? AND in_basket=0",
            (old_sym,)
        ).fetchall()

        for row_id, index_id, network_mode, in_basket in rows:
            # Verifica se já existe um constituinte com o novo símbolo nesse índice/rede
            conflict = cur.execute(
                "SELECT id FROM constituents WHERE index_id=? AND symbol=? AND network_mode=?",
                (index_id, new_sym, network_mode)
            ).fetchone()

            if conflict:
                print(f"  {old_sym:<10}  →  {new_sym:<10}  {index_id:<35}  {network_mode}  ⚠ CONFLITO (já existe {new_sym}) — renomeia para {new_sym}_candidate")
                cur.execute(
                    "UPDATE constituents SET symbol=? WHERE id=?",
                    (f"{new_sym}_candidate", row_id)
                )
                skipped += 1
            else:
                print(f"  {old_sym:<10}  →  {new_sym:<10}  {index_id:<35}  {network_mode}")
                cur.execute(
                    "UPDATE constituents SET symbol=? WHERE id=?",
                    (new_sym, row_id)
                )
                total += 1

    conn.commit()
    conn.close()
    print("-" * 80)
    print(f"✓ {total} símbolos corrigidos, {skipped} com conflito (sufixo _candidate).")
    print("Candidatos agora usam o mesmo formato de símbolo do SoDEX.")

if __name__ == "__main__":
    run()
