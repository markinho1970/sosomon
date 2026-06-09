"""
Faucet API — distribui 0.0001 ETH testnet para novos avaliadores/investidores.
Completamente isolado do fluxo principal de investimento.
"""

import os
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from eth_account import Account
from eth_utils import to_checksum_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/faucet", tags=["faucet"])

FAUCET_AMOUNT_ETH = 0.0001
FAUCET_AMOUNT_WEI = int(FAUCET_AMOUNT_ETH * 1e18)
CLAIMS_FILE = os.path.join(os.path.dirname(__file__), "..", "faucet_claims.json")
GAS_LIMIT_ETH_TRANSFER = 21_000


def _load_claims() -> dict:
    if os.path.exists(CLAIMS_FILE):
        try:
            with open(CLAIMS_FILE) as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_claims(claims: dict):
    with open(CLAIMS_FILE, "w") as f:
        json.dump(claims, f, indent=2)


class ClaimRequest(BaseModel):
    wallet_address: str


@router.post("/claim")
async def claim_faucet(req: ClaimRequest):
    """Envia 0.0001 ETH testnet para a carteira solicitante. Um claim por carteira."""
    wallet = req.wallet_address.lower().strip()
    if not wallet.startswith("0x") or len(wallet) != 42:
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    MAX_CLAIMS = 3
    claims = _load_claims()
    wallet_claims = claims.get(wallet, [])
    if not isinstance(wallet_claims, list):
        wallet_claims = [wallet_claims]
    if len(wallet_claims) >= MAX_CLAIMS:
        raise HTTPException(
            status_code=409,
            detail="Claim limit reached (3/wallet)"
        )

    # Configuracao testnet
    from services.deposit_monitor import NETWORKS
    from utils.crypto import get_private_key

    net = NETWORKS["testnet"]
    fund_wallet = net["fund_wallet"]
    rpc_url = net["rpc"]
    chain_id = net["chain_id"]

    if not fund_wallet:
        raise HTTPException(status_code=503, detail="Faucet not configured")

    async def rpc(method, params):
        payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(rpc_url, json=payload)
            r.raise_for_status()
            return r.json()

    try:
        nonce_res = await rpc("eth_getTransactionCount", [fund_wallet, "pending"])
        nonce = int(nonce_res["result"], 16)

        gp_res = await rpc("eth_gasPrice", [])
        gas_price = int(gp_res["result"], 16)

        to_addr = to_checksum_address(req.wallet_address)
        tx = {
            "to": to_addr,
            "value": FAUCET_AMOUNT_WEI,
            "nonce": nonce,
            "gasPrice": gas_price,
            "gas": GAS_LIMIT_ETH_TRANSFER,
            "chainId": chain_id,
            "data": "0x",
        }

        private_key = get_private_key()
        signed = Account.sign_transaction(tx, private_key)
        raw_tx_hex = "0x" + signed.raw_transaction.hex()

        result = await rpc("eth_sendRawTransaction", [raw_tx_hex])
        if "error" in result:
            raise RuntimeError(str(result["error"]))

        tx_hash = result.get("result", "")
        basescan_url = f"{net['basescan_tx']}{tx_hash}"

        # Registrar claim
        entry = {
            "tx_hash": tx_hash,
            "amount_eth": FAUCET_AMOUNT_ETH,
            "claimed_at": datetime.now(timezone.utc).isoformat(),
            "basescan": basescan_url,
        }
        wallet_claims.append(entry)
        claims[wallet] = wallet_claims
        _save_claims(claims)

        logger.info(f"faucet: {FAUCET_AMOUNT_ETH} ETH → {wallet[:10]}… tx={tx_hash[:16]}…")
        return {
            "success": True,
            "amount_eth": FAUCET_AMOUNT_ETH,
            "tx_hash": tx_hash,
            "basescan": basescan_url,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"faucet: falha ao enviar ETH para {wallet}: {e}")
        raise HTTPException(status_code=500, detail=f"Faucet error: {str(e)}")


@router.get("/status/{wallet_address}")
async def faucet_status(wallet_address: str):
    """Verifica se a carteira ja fez claim."""
    wallet = wallet_address.lower().strip()
    claims = _load_claims()
    wallet_claims = claims.get(wallet, [])
    if not isinstance(wallet_claims, list):
        wallet_claims = [wallet_claims]
    count = len(wallet_claims)
    if count >= 3:
        return {"claimed": True, "count": count, "tx_hash": wallet_claims[-1].get("tx_hash"), "basescan": wallet_claims[-1].get("basescan")}
    return {"claimed": False, "count": count}
