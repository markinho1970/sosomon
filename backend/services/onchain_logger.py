"""
On-chain audit logger — emits a 0 ETH transaction on Base with rebalance
summary encoded in calldata. Verifiable on Basescan without a smart contract.

Each rebalance execution produces a permanent public record on-chain.
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

AUDIT_LOG_ADDRESS = "0x000000000000000000000000000000000000dEaD"
CHAIN_ID_MAINNET  = 8453
CHAIN_ID_TESTNET  = 84532
GAS_LIMIT         = 60_000   # 21k base + ~16 gas/byte for calldata


async def _rpc(method: str, params: list, rpc_url: str) -> dict:
    import httpx
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(rpc_url, json=payload)
        r.raise_for_status()
        return r.json()


async def emit_rebalance_event(proposal) -> dict | None:
    """
    Send a 0-value tx on Base with rebalance summary in calldata.
    Non-blocking: failures are logged as warnings, never raised.
    Returns {tx_hash, basescan} on success, None on failure.
    """
    from utils.crypto import get_private_key
    from eth_account import Account

    network_mode  = getattr(proposal, "network_mode", "mainnet") or "mainnet"
    use_testnet   = (network_mode == "testnet")
    chain_id      = CHAIN_ID_TESTNET if use_testnet else CHAIN_ID_MAINNET
    rpc_url       = "https://sepolia.base.org" if use_testnet else os.getenv("BASE_RPC_URL", "https://mainnet.base.org")
    fund_wallet   = os.getenv("FUND_WALLET_ADDRESS", "").lower()
    basescan_base = "https://sepolia.basescan.org/tx/" if use_testnet else "https://basescan.org/tx/"

    if not fund_wallet:
        logger.warning("FUND_WALLET_ADDRESS not set — skipping on-chain audit log")
        return None

    changes = proposal.changes or []
    if isinstance(changes, str):
        try:
            changes = json.loads(changes)
        except Exception:
            changes = []

    changes_summary = ", ".join(
        f"{c.get('symbol')} {c.get('old_weight', 0):.0f}%→{c.get('new_weight', 0):.0f}%"
        for c in (changes or [])
    ) or "no changes"

    executed_str = proposal.executed_at.isoformat()[:19] if proposal.executed_at else "unknown"
    summary = (
        f"SoSoMon Rebalance #{proposal.id}"
        f" | {proposal.index_id}"
        f" | {network_mode}"
        f" | {changes_summary}"
        f" | executed:{executed_str}"
    )
    calldata = "0x" + summary.encode("utf-8").hex()

    try:
        private_key = get_private_key()

        nonce_res = await _rpc("eth_getTransactionCount", [fund_wallet, "pending"], rpc_url)
        nonce     = int(nonce_res["result"], 16)

        gas_res   = await _rpc("eth_gasPrice", [], rpc_url)
        gas_price = int(gas_res["result"], 16)

        tx = {
            "to":       AUDIT_LOG_ADDRESS,
            "data":     calldata,
            "nonce":    nonce,
            "gasPrice": gas_price,
            "gas":      GAS_LIMIT,
            "chainId":  chain_id,
            "value":    0,
        }

        signed  = Account.sign_transaction(tx, private_key)
        raw_tx  = "0x" + signed.raw_transaction.hex()

        result  = await _rpc("eth_sendRawTransaction", [raw_tx], rpc_url)
        if "error" in result:
            logger.warning(f"On-chain audit emission RPC error: {result['error']}")
            return None

        tx_hash  = result.get("result", "")
        basescan = f"{basescan_base}{tx_hash}"
        logger.info(f"On-chain audit emitted: {basescan}")
        return {"tx_hash": tx_hash, "basescan": basescan}

    except Exception as e:
        logger.warning(f"On-chain audit emission failed (non-critical): {e}")
        return None
