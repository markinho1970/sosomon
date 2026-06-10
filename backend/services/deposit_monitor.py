"""
Deposit Monitor — Base Mainnet (8453) + Base Sepolia Testnet (84532)

Roda dois monitores simultâneos — um por rede.
Cada depósito é creditado com network_mode correto no portfolio.
Mainnet e testnet nunca se misturam.
"""

import os
import uuid
import logging
from datetime import datetime, timezone

import asyncio
import httpx

logger = logging.getLogger(__name__)

TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
MIN_DEPOSIT_USD = 5.0

NETWORKS = {
    "mainnet": {
        "chain_id":      8453,
        "rpc":           os.getenv("BASE_RPC_URL", "https://mainnet.base.org"),
        "usdc":          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "basescan_tx":   "https://basescan.org/tx/",
        "basescan_addr": "https://basescan.org/address/",
        "fund_wallet":   os.getenv("FUND_WALLET_ADDRESS", "").lower(),
        "label":         "base",
    },
    "testnet": {
        "chain_id":      84532,
        "rpc":           os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
        "usdc":          "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "basescan_tx":   "https://sepolia.basescan.org/tx/",
        "basescan_addr": "https://sepolia.basescan.org/address/",
        "fund_wallet":   os.getenv("TESTNET_FUND_WALLET_ADDRESS", os.getenv("FUND_WALLET_ADDRESS", "")).lower(),
        "label":         "base-sepolia",
    },
}

# Rastreia último bloco processado por rede — independentes
_last_block = {"mainnet": 0, "testnet": 0}

_RPC_FALLBACKS = {
    "mainnet": [
        os.getenv("BASE_RPC_URL", "https://mainnet.base.org"),
        "https://base.llamarpc.com",
        "https://rpc.ankr.com/base",
        "https://base-rpc.publicnode.com",
    ],
    "testnet": [
        os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
        "https://base-sepolia.llamarpc.com",
        "https://rpc.ankr.com/base_sepolia",
        "https://base-sepolia-rpc.publicnode.com",
    ],
}

_rpc_status: dict = {
    "mainnet": {"healthy": True, "active_rpc": None, "last_error": None, "last_error_at": None, "fail_count": 0},
    "testnet": {"healthy": True, "active_rpc": None, "last_error": None, "last_error_at": None, "fail_count": 0},
}


def get_rpc_status() -> dict:
    """Retorna status dos RPCs para alertas do admin."""
    return {k: dict(v) for k, v in _rpc_status.items()}


def _configured(net: dict) -> bool:
    if not net["fund_wallet"]:
        return False
    return True


def _pad_address(address: str) -> str:
    return "0x" + address.lower().removeprefix("0x").zfill(64)


async def _rpc(rpc_url: str, method: str, params: list) -> dict:
    """Chamada RPC direta a uma URL. Sem retry — use _rpc_resilient para fallback chain."""
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(rpc_url, json=payload)
        r.raise_for_status()
        return r.json()


async def _rpc_resilient(network: str, method: str, params: list) -> dict:
    """Tenta cada RPC da lista de fallback em ordem. Atualiza _rpc_status. Lanca excecao se todos falharem."""
    urls = list(dict.fromkeys(u for u in _RPC_FALLBACKS.get(network, []) if u))
    last_exc: Exception = RuntimeError("nenhum RPC configurado")
    for url in urls:
        try:
            result = await _rpc(url, method, params)
            _rpc_status[network].update({"healthy": True, "active_rpc": url, "fail_count": 0})
            return result
        except Exception as e:
            last_exc = e
            logger.warning(
                f"deposit_monitor [{network}]: RPC {url} falhou "
                f"({type(e).__name__}: {e or '(sem msg)'}), tentando proximo..."
            )
    _rpc_status[network].update({
        "healthy": False,
        "last_error": f"{type(last_exc).__name__}: {last_exc or '(sem msg)'}",
        "last_error_at": datetime.now(timezone.utc).isoformat(),
        "fail_count": _rpc_status[network].get("fail_count", 0) + 1,
    })
    raise last_exc


async def _latest_block(network: str) -> int:
    res = await _rpc_resilient(network, "eth_blockNumber", [])
    return int(res["result"], 16)


async def _get_logs(network: str, usdc: str, fund_wallet: str, from_block: int, to_block: int) -> list:
    params = [{
        "address": usdc,
        "fromBlock": hex(from_block),
        "toBlock":   hex(to_block),
        "topics": [TRANSFER_TOPIC, None, _pad_address(fund_wallet)],
    }]
    res = await _rpc_resilient(network, "eth_getLogs", params)
    return res.get("result", [])


def _parse_amount(data_hex: str) -> float:
    raw = (data_hex or "0x0").removeprefix("0x") or "0"
    return int(raw, 16) / 1_000_000


async def _usdc_balance(rpc_url: str, usdc: str, address: str) -> float:
    data = "0x70a08231" + address.lower().removeprefix("0x").zfill(64)
    res = await _rpc(rpc_url, "eth_call", [{"to": usdc, "data": data}, "latest"])
    raw = res.get("result", "0x0")
    return int(raw or "0x0", 16) / 1_000_000


async def _eth_balance(rpc_url: str, address: str) -> float:
    res = await _rpc(rpc_url, "eth_getBalance", [address, "latest"])
    raw = res.get("result", "0x0")
    return int(raw or "0x0", 16) / 1e18


async def check_deposits(db, network: str = "mainnet"):
    """Detecta depósitos USDC na rede especificada e credita portfolios."""
    global _last_block

    net = NETWORKS.get(network, NETWORKS["mainnet"])

    if not _configured(net):
        logger.warning(f"deposit_monitor [{network}]: FUND_WALLET não configurado")
        return

    try:
        latest = await _latest_block(network)
    except Exception as e:
        logger.error(f"deposit_monitor [{network}]: erro ao buscar bloco: {type(e).__name__}: {e or '(sem mensagem)'}")
        return

    if _last_block[network] == 0:
        _last_block[network] = latest - 100

    if latest <= _last_block[network]:
        return

    try:
        logs = await _get_logs(network, net["usdc"], net["fund_wallet"],
                               _last_block[network] + 1, latest)
    except Exception as e:
        logger.error(f"deposit_monitor [{network}]: eth_getLogs falhou: {e}")
        return

    _last_block[network] = latest

    if not logs:
        return

    from models import Subscriber, SubscriberPortfolio, AgentActivityLog, AlphaIndex, InvestmentIntent

    default_index = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).first()
    if not default_index:
        logger.warning(f"deposit_monitor [{network}]: nenhum index ativo encontrado")
        return

    for log in logs:
        tx_hash    = log.get("transactionHash", "")
        from_topic = (log.get("topics") or [None, None])[1]
        if not from_topic:
            continue

        from_address = ("0x" + from_topic[-40:]).lower()
        amount_usd   = _parse_amount(log.get("data", "0x0"))
        block_number = int(log.get("blockNumber", "0x0"), 16)

        if amount_usd <= 0:
            continue

        logger.info(f"deposit_monitor [{network}]: ${amount_usd:.2f} USDC de {from_address[:10]}... tx={tx_hash[:12]}...")

        # Deduplicação por tx_hash — protege contra duplo crédito em restart
        already = db.query(AgentActivityLog).filter(
            AgentActivityLog.agent == "deposit_monitor",
            AgentActivityLog.action.in_(["deposit_detected", "deposit_unattributed", "deposit_refunded"]),
            AgentActivityLog.data["tx_hash"].as_string() == tx_hash,
        ).first()
        if already:
            logger.debug(f"deposit_monitor [{network}]: tx {tx_hash[:12]}... já processada")
            continue

        # Depósito abaixo do mínimo — estornar automaticamente
        if amount_usd < MIN_DEPOSIT_USD:
            logger.warning(
                f"deposit_monitor [{network}]: depósito ${amount_usd:.2f} abaixo do mínimo "
                f"(${MIN_DEPOSIT_USD}). Iniciando estorno para {from_address[:10]}…"
            )
            from services.refund_executor import refund_deposit
            refund_result = await refund_deposit(from_address, amount_usd, net)
            refund_tx = refund_result.get("tx_hash", "") if refund_result.get("success") else ""
            refund_ok = refund_result.get("success", False)
            if refund_ok:
                logger.info(f"deposit_monitor [{network}]: estorno OK tx={refund_tx[:16]}…")
            else:
                logger.error(f"deposit_monitor [{network}]: falha no estorno — {refund_result.get('error')}")
            db.add(AgentActivityLog(
                id=str(uuid.uuid4()),
                index_id=default_index.id,
                agent="deposit_monitor",
                action="deposit_refunded",
                token_symbol="USDC",
                description=(
                    f"[{network.upper()}] Depósito de ${amount_usd:.2f} abaixo do mínimo de "
                    f"${MIN_DEPOSIT_USD:.0f}. Estorno {'enviado' if refund_ok else 'FALHOU'} para "
                    f"{from_address[:8]}…{from_address[-4:]}. "
                    f"Tx original: {tx_hash[:16]}… | Tx estorno: {refund_tx[:16]}…"
                ),
                timestamp=datetime.now(timezone.utc),
                data={
                    "tx_hash": tx_hash, "from": from_address,
                    "amount_usd": amount_usd, "reason": "below_minimum",
                    "network_mode": network, "minimum_usd": MIN_DEPOSIT_USD,
                    "refund_tx": refund_tx, "refund_ok": refund_ok,
                    "refund_basescan": refund_result.get("basescan", ""),
                },
            ))
            db.commit()
            continue

        # Só aceita depósitos de wallets com intent registrado na mesma rede
        intent = db.query(InvestmentIntent).filter(
            InvestmentIntent.wallet_address == from_address,
            InvestmentIntent.fulfilled == False,
            InvestmentIntent.network_mode == network,
        ).order_by(InvestmentIntent.created_at.desc()).first()

        if not intent:
            logger.warning(
                f"deposit_monitor [{network}]: DEPÓSITO NÃO ATRIBUÍDO — "
                f"${amount_usd:.2f} USDC de {from_address[:10]}... sem intent {network}. "
                f"Retido como reserva admin. Tx: {net['basescan_tx']}{tx_hash}"
            )
            db.add(AgentActivityLog(
                id=str(uuid.uuid4()),
                index_id=default_index.id,
                agent="deposit_monitor",
                action="deposit_unattributed",
                token_symbol="USDC",
                description=(
                    f"[{network.upper()}] Depósito NÃO ATRIBUÍDO de ${amount_usd:,.2f} USDC de "
                    f"{from_address[:8]}...{from_address[-4:]} — sem intent registrado na rede {network}. "
                    f"Bloco {block_number} | Tx: {net['basescan_tx']}{tx_hash}"
                ),
                timestamp=datetime.now(timezone.utc),
                data={
                    "tx_hash": tx_hash, "basescan": f"{net['basescan_tx']}{tx_hash}",
                    "from": from_address, "amount_usd": amount_usd,
                    "block": block_number, "network": net["label"],
                    "chain_id": net["chain_id"], "network_mode": network, "status": "unattributed",
                },
            ))
            continue

        target_index = db.query(AlphaIndex).filter(AlphaIndex.id == intent.index_id).first()
        if not target_index:
            logger.error(f"deposit_monitor [{network}]: índice {intent.index_id} não encontrado")
            continue

        intent.fulfilled = True
        logger.info(f"deposit_monitor [{network}]: índice → {target_index.name}")

        # Cria subscriber se não existe
        subscriber = db.query(Subscriber).filter(Subscriber.wallet_address == from_address).first()
        if not subscriber:
            subscriber = Subscriber(
                id=str(uuid.uuid4()),
                wallet_address=from_address,
                referral_code=str(uuid.uuid4())[:8].upper(),
                created_at=datetime.now(timezone.utc),
            )
            db.add(subscriber)
            db.flush()

        nav    = max(target_index.nav_usd or 1.0, 0.0001)
        tokens = amount_usd / nav

        # Portfolio filtrado por network_mode — mainnet e testnet nunca se misturam
        portfolio = db.query(SubscriberPortfolio).filter(
            SubscriberPortfolio.subscriber_id == subscriber.id,
            SubscriberPortfolio.index_id == target_index.id,
            SubscriberPortfolio.network_mode == network,
        ).first()

        if portfolio:
            portfolio.deposited_usd     += amount_usd
            portfolio.current_value_usd += amount_usd
            portfolio.index_tokens_held += tokens
            portfolio.last_updated_at    = datetime.now(timezone.utc)
            if portfolio.current_value_usd > portfolio.high_water_mark_usd:
                portfolio.high_water_mark_usd = portfolio.current_value_usd
        else:
            portfolio = SubscriberPortfolio(
                subscriber_id=subscriber.id,
                index_id=target_index.id,
                deposited_usd=amount_usd,
                current_value_usd=amount_usd,
                index_tokens_held=tokens,
                high_water_mark_usd=amount_usd,
                network_mode=network,
                first_invested_at=datetime.now(timezone.utc),
                last_updated_at=datetime.now(timezone.utc),
            )
            db.add(portfolio)
            target_index.subscriber_count = (target_index.subscriber_count or 0) + 1

        target_index.aum_usd = (target_index.aum_usd or 0) + amount_usd

        db.add(AgentActivityLog(
            id=str(uuid.uuid4()),
            index_id=target_index.id,
            agent="deposit_monitor",
            action="deposit_detected",
            token_symbol="USDC",
            description=(
                f"[{network.upper()}] Depósito de ${amount_usd:,.2f} USDC de "
                f"{from_address[:8]}...{from_address[-4:]} "
                f"→ índice: {target_index.name} | bloco {block_number} | "
                f"Tx: {net['basescan_tx']}{tx_hash}"
            ),
            timestamp=datetime.now(timezone.utc),
            data={
                "tx_hash": tx_hash, "basescan": f"{net['basescan_tx']}{tx_hash}",
                "from": from_address, "amount_usd": amount_usd,
                "tokens": round(tokens, 6), "nav_at_deposit": nav,
                "block": block_number, "network": net["label"],
                "chain_id": net["chain_id"], "network_mode": network,
            },
        ))

    db.commit()


async def check_deposits_mainnet(db):
    await check_deposits(db, "mainnet")


async def check_deposits_testnet(db):
    await check_deposits(db, "testnet")


async def get_fund_wallet_info(mode: str = "mainnet") -> dict:
    """Retorna endereço, saldo USDC e saldo ETH da fund wallet na rede especificada."""
    net = NETWORKS.get(mode, NETWORKS["mainnet"])
    if not net["fund_wallet"]:
        return {"address": None, "usdc_balance": None, "eth_balance": None, "configured": False,
                "network": net["label"], "network_mode": mode}
    usdc_bal = None
    eth_bal = None
    try:
        usdc_bal = await _usdc_balance(net["rpc"], net["usdc"], net["fund_wallet"])
    except Exception as e:
        logger.error(f"deposit_monitor [{mode}]: erro ao buscar saldo USDC: {e}")
    try:
        eth_bal = await _eth_balance(net["rpc"], net["fund_wallet"])
    except Exception as e:
        logger.error(f"deposit_monitor [{mode}]: erro ao buscar saldo ETH: {e}")

    return {
        "address":       net["fund_wallet"],
        "usdc_balance":  usdc_bal,
        "eth_balance":   eth_bal,
        "configured":    True,
        "network":       net["label"],
        "chain_id":      net["chain_id"],
        "network_mode":  mode,
        "usdc_contract": net["usdc"],
        "basescan_url":  f"{net['basescan_addr']}{net['fund_wallet']}",
    }
