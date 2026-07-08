"""
Withdrawal Executor — on-chain USDC transfer on Base network.

Fluxo:
1. preview_withdrawal()  → calcula taxas, P&L, valor líquido (sem side effects)
2. execute_withdrawal()  → assina e transmite a tx ERC-20 na Base
   - simulate=True        → roda toda a lógica mas NÃO transmite para a blockchain

Riscos sistêmicos tratados:
- Saldo insuficiente na fund wallet (USDC)
- Sem ETH para gas → erro explícito
- Falha no broadcast → portfolio NÃO é debitado
- Simulação antes de qualquer tx real
"""

import os
import logging
from datetime import datetime, timezone

import httpx
from eth_account import Account

logger = logging.getLogger(__name__)

FUND_WALLET    = os.getenv("FUND_WALLET_ADDRESS", "").lower()
BASE_RPC       = os.getenv("BASE_RPC_URL", "https://mainnet.base.org")
USDC_CONTRACT  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
BASESCAN_TX    = "https://basescan.org/tx/"
CHAIN_ID       = 8453
GAS_LIMIT      = 100_000   # USDC transfer custa ~65k; margem de segurança
GAS_FEE_EST_USD = 0.01     # estimativa conservadora em USD (~$0.01 na Base)
MIN_ETH_FOR_GAS = 0.0001   # mínimo de ETH necessário na fund wallet


# ─── RPC helper ──────────────────────────────────────────────────────────────

async def _rpc(method: str, params: list) -> dict:
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(BASE_RPC, json=payload)
        r.raise_for_status()
        return r.json()


# ─── ERC-20 calldata encoder ─────────────────────────────────────────────────

def _encode_transfer(to: str, amount_units: int) -> str:
    """Encode transfer(address,uint256) calldata for USDC."""
    selector   = "a9059cbb"
    to_padded  = to.lower().removeprefix("0x").zfill(64)
    amt_padded = hex(amount_units)[2:].zfill(64)
    return "0x" + selector + to_padded + amt_padded


# ─── Fee / P&L calculator ─────────────────────────────────────────────────────

def preview_withdrawal(portfolio, index, amount_usd: float) -> dict:
    """
    Calcula o breakdown completo de um saque. Sem side effects.

    Retorna:
    - breakdown de taxas (gestão, performance, gas)
    - P&L do investidor (lucro ou prejuízo)
    - valor líquido que vai chegar na carteira
    - avisos sobre perda, taxa de performance, etc.
    """
    current_value  = portfolio.current_value_usd or 0.0
    deposited      = portfolio.deposited_usd or 0.0
    hwm            = portfolio.high_water_mark_usd or deposited
    days_invested  = max(portfolio.days_invested or 0, 1)

    if amount_usd > current_value:
        raise ValueError(f"Valor requisitado (${amount_usd:.2f}) excede saldo atual (${current_value:.2f})")

    # Proporção do portfólio sendo sacada
    proportion = amount_usd / current_value if current_value > 0 else 1.0

    # Custo de aquisição proporcional (base do investidor)
    cost_basis = round(deposited * proportion, 4)

    # P&L realizado neste saque
    pnl = round(amount_usd - cost_basis, 4)
    pnl_pct = round((pnl / cost_basis * 100) if cost_basis > 0 else 0.0, 2)

    # Taxa de gestão (0.75%/ano, pro-rata pelos dias investidos)
    mgmt_fee = round(amount_usd * 0.0075 * (days_invested / 365), 4)

    # Taxa de performance (15% sobre lucro acima do HWM)
    profit_above_hwm = max(0.0, current_value - hwm)
    # Parte do lucro acima do HWM proporcional ao saque
    perf_base = min(profit_above_hwm * proportion, max(0.0, pnl))
    perf_fee  = round(perf_base * 0.15, 4)

    # Gas (estimativa fixa na Base)
    gas_fee = GAS_FEE_EST_USD

    total_fees = round(mgmt_fee + perf_fee + gas_fee, 4)
    net_usd    = round(amount_usd - total_fees, 4)

    # Avisos
    warnings = []
    if pnl < 0:
        warnings.append(f"Você está sacando com PREJUÍZO de ${abs(pnl):.2f} ({abs(pnl_pct):.1f}%). Você depositou ${cost_basis:.2f} e vai receber ${net_usd:.2f}.")
    if perf_fee > 0:
        warnings.append(f"Taxa de performance de ${perf_fee:.2f} aplicada (15% sobre ${perf_base:.2f} de lucro acima do HWM).")
    if days_invested < 30:
        warnings.append(f"Saque antes de 30 dias ({days_invested}d). A taxa de gestão ainda se aplica pro-rata.")

    # Riscos sistêmicos identificados (para o modal de revisão)
    risks = []
    risks.append("O valor líquido pode variar se o NAV mudar entre a pré-visualização e a execução.")
    risks.append("USDC enviado pela fund wallet na rede Base. Irreversível após confirmação on-chain.")
    if net_usd < 0:
        risks.append("ATENÇÃO: Taxas excedem o valor do saque. Reduza o valor ou aguarde mais tempo investido.")

    return {
        "withdrawal_requested":      round(amount_usd, 4),
        "cost_basis_proportional":   cost_basis,
        "pnl_usd":                   pnl,
        "pnl_pct":                   pnl_pct,
        "pnl_label":                 "Lucro" if pnl >= 0 else "Prejuízo",
        "days_invested":             days_invested,
        "management_fee_usd":        mgmt_fee,
        "performance_fee_usd":       perf_fee,
        "gas_fee_est_usd":           gas_fee,
        "total_fees_usd":            total_fees,
        "net_usd":                   net_usd,
        "net_usd_label":             "Você receberá (estimado)",
        "current_portfolio_value":   current_value,
        "deposited_usd":             deposited,
        "high_water_mark_usd":       hwm,
        "is_full_withdrawal":        abs(amount_usd - current_value) < 0.01,
        "to_wallet":                 portfolio.subscriber.wallet_address if hasattr(portfolio, 'subscriber') and portfolio.subscriber else "",
        "warnings":                  warnings,
        "risks":                     risks,
        "fees_breakdown": {
            "management": f"0.75%/ano × {days_invested} dias = ${mgmt_fee:.4f}",
            "performance": f"15% × ${perf_base:.2f} (lucro acima HWM) = ${perf_fee:.4f}" if perf_fee > 0 else "Não aplicável (sem lucro acima do HWM)",
            "gas":         f"~${gas_fee:.2f} (estimativa na rede Base)",
        },
    }


# ─── On-chain executor ────────────────────────────────────────────────────────

async def execute_withdrawal(recipient: str, amount_usd: float, simulate: bool = False) -> dict:
    """
    Envia USDC da fund wallet para o investidor na rede Base.

    simulate=True: executa todas as verificações e assina a tx mas NÃO transmite.
    Retorna o mesmo formato em ambos os casos para transparência total.
    """
    from utils.crypto import get_fund_private_key

    amount_units = int(round(amount_usd * 1_000_000))  # USDC: 6 decimais

    checks = {}

    # ── 1. Verificar saldo USDC da fund wallet ────────────────────────────────
    try:
        data = "0x70a08231" + FUND_WALLET.removeprefix("0x").zfill(64)
        res  = await _rpc("eth_call", [{"to": USDC_CONTRACT, "data": data}, "latest"])
        raw  = res.get("result", "0x0") or "0x0"
        fund_usdc = int(raw, 16) / 1_000_000
        checks["fund_usdc_balance"] = fund_usdc
        if fund_usdc < amount_usd and not simulate:
            return {
                "success": False,
                "simulate": simulate,
                "error": f"Saldo insuficiente na fund wallet: ${fund_usdc:.2f} disponível, ${amount_usd:.2f} solicitado.",
                "checks": checks,
            }
    except Exception as e:
        checks["fund_usdc_balance"] = f"Erro: {e}"
        if not simulate:
            return {"success": False, "simulate": simulate, "error": f"Falha ao verificar saldo USDC: {e}", "checks": checks}

    # ── 2. Verificar ETH para gas ─────────────────────────────────────────────
    try:
        eth_res  = await _rpc("eth_getBalance", [FUND_WALLET, "latest"])
        eth_raw  = int(eth_res.get("result", "0x0"), 16)
        eth_bal  = eth_raw / 1e18
        checks["fund_eth_balance"] = round(eth_bal, 8)
        if eth_bal < MIN_ETH_FOR_GAS and not simulate:
            return {
                "success": False,
                "simulate": simulate,
                "error": f"Fund wallet sem ETH para gas ({eth_bal:.6f} ETH). Necessário ao menos {MIN_ETH_FOR_GAS} ETH na Base.",
                "checks": checks,
                "action_required": "Deposite ~0.001 ETH na fund wallet na rede Base para cobrir gas de saques.",
            }
    except Exception as e:
        checks["fund_eth_balance"] = f"Erro: {e}"

    # ── 3. Obter nonce ────────────────────────────────────────────────────────
    try:
        nonce_res = await _rpc("eth_getTransactionCount", [FUND_WALLET, "pending"])
        nonce     = int(nonce_res["result"], 16)
        checks["nonce"] = nonce
    except Exception as e:
        return {"success": False, "simulate": simulate, "error": f"Falha ao obter nonce: {e}", "checks": checks}

    # ── 4. Gas price ──────────────────────────────────────────────────────────
    try:
        gas_res   = await _rpc("eth_gasPrice", [])
        gas_price = int(gas_res["result"], 16)
        checks["gas_price_gwei"] = round(gas_price / 1e9, 4)
    except Exception as e:
        gas_price = 1_000_000  # fallback 0.001 gwei (Base é muito barato)
        checks["gas_price_gwei"] = "fallback"

    # ── 5. Montar e assinar a transação ───────────────────────────────────────
    tx = {
        "to":       USDC_CONTRACT,
        "data":     _encode_transfer(recipient, amount_units),
        "nonce":    nonce,
        "gasPrice": gas_price,
        "gas":      GAS_LIMIT,
        "chainId":  CHAIN_ID,
        "value":    0,
    }

    try:
        private_key = get_fund_private_key()
        signed      = Account.sign_transaction(tx, private_key)
        raw_tx_hex  = "0x" + signed.raw_transaction.hex()
        checks["signed_tx_hash"]   = signed.hash.hex()
        checks["raw_tx_truncated"] = raw_tx_hex[:40] + "…"
    except Exception as e:
        return {"success": False, "simulate": simulate, "error": f"Falha ao assinar transação: {e}", "checks": checks}

    # ── 6. Simulação: para aqui sem broadcast ────────────────────────────────
    if simulate:
        return {
            "success":    True,
            "simulate":   True,
            "tx_hash":    "(simulação — não transmitida)",
            "basescan":   None,
            "amount_usd": amount_usd,
            "recipient":  recipient,
            "checks":     checks,
            "message":    f"Simulação OK — a tx enviaria ${amount_usd:.2f} USDC para {recipient[:10]}… na Base.",
        }

    # ── 7. Broadcast ─────────────────────────────────────────────────────────
    try:
        result    = await _rpc("eth_sendRawTransaction", [raw_tx_hex])
        if "error" in result:
            err = result["error"]
            return {"success": False, "simulate": False, "error": str(err), "checks": checks}
        tx_hash = result.get("result", "")
        return {
            "success":    True,
            "simulate":   False,
            "tx_hash":    tx_hash,
            "basescan":   f"{BASESCAN_TX}{tx_hash}",
            "amount_usd": amount_usd,
            "recipient":  recipient,
            "checks":     checks,
            "message":    f"${amount_usd:.2f} USDC enviados para {recipient[:10]}…",
        }
    except Exception as e:
        return {"success": False, "simulate": False, "error": f"Falha no broadcast: {e}", "checks": checks}
