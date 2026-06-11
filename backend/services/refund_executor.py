"""
Refund Executor — devolve USDC para depositantes abaixo do mínimo.
Suporta mainnet (Base 8453) e testnet (Base Sepolia 84532).
Reutiliza a lógica de signing do withdrawal_executor.
"""

import logging
from eth_account import Account

logger = logging.getLogger(__name__)

GAS_LIMIT = 100_000

def _encode_transfer(to: str, amount_units: int) -> str:
    selector  = "a9059cbb"
    to_padded = to.lower().removeprefix("0x").zfill(64)
    amt_pad   = hex(amount_units)[2:].zfill(64)
    return "0x" + selector + to_padded + amt_pad


async def refund_deposit(
    recipient: str,
    amount_usd: float,
    net: dict,          # dict do NETWORKS em deposit_monitor.py
) -> dict:
    """
    Envia USDC de volta ao depositante.
    net = NETWORKS["mainnet"] ou NETWORKS["testnet"]
    """
    from utils.crypto import get_private_key
    from services.deposit_monitor import _rpc_resilient

    fund_wallet  = net["fund_wallet"]
    usdc_address = net["usdc"]
    chain_id     = net["chain_id"]
    basescan_tx  = net["basescan_tx"]
    amount_units = int(round(amount_usd * 1_000_000))
    network      = "testnet" if chain_id == 84532 else "mainnet"

    async def rpc(method, params):
        return await _rpc_resilient(network, method, params)

    try:
        # Nonce
        nonce_res = await rpc("eth_getTransactionCount", [fund_wallet, "pending"])
        nonce     = int(nonce_res["result"], 16)

        # Gas price
        try:
            gp_res    = await rpc("eth_gasPrice", [])
            gas_price = int(gp_res["result"], 16)
        except Exception:
            gas_price = 1_000_000  # fallback

        tx = {
            "to":       usdc_address,
            "data":     _encode_transfer(recipient, amount_units),
            "nonce":    nonce,
            "gasPrice": gas_price,
            "gas":      GAS_LIMIT,
            "chainId":  chain_id,
            "value":    0,
        }

        private_key = get_private_key()
        signed      = Account.sign_transaction(tx, private_key)
        raw_tx_hex  = "0x" + signed.raw_transaction.hex()

        result  = await rpc("eth_sendRawTransaction", [raw_tx_hex])
        if "error" in result:
            raise RuntimeError(str(result["error"]))

        tx_hash = result.get("result", "")
        logger.info(f"refund_executor: estorno de ${amount_usd:.2f} → {recipient[:10]}… tx={tx_hash[:16]}…")
        return {
            "success":  True,
            "tx_hash":  tx_hash,
            "basescan": f"{basescan_tx}{tx_hash}",
            "amount_usd": amount_usd,
        }

    except Exception as e:
        logger.error(f"refund_executor: falha no estorno de ${amount_usd:.2f} → {recipient}: {e}")
        return {"success": False, "error": str(e), "amount_usd": amount_usd}
