"""
Faucet API — distribui 0.0001 ETH testnet para novos avaliadores/investidores.
Completamente isolado do fluxo principal de investimento.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx
from eth_account import Account
from eth_utils import to_checksum_address

from database import get_db
from models import FaucetClaim

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/faucet", tags=["faucet"])

FAUCET_AMOUNT_ETH = 0.0001
FAUCET_AMOUNT_WEI = int(FAUCET_AMOUNT_ETH * 1e18)
GAS_LIMIT_ETH_TRANSFER = 21_000
MAX_CLAIMS = 3


class ClaimRequest(BaseModel):
    wallet_address: str


@router.post("/claim")
async def claim_faucet(req: ClaimRequest, db: Session = Depends(get_db)):
    """Envia 0.0001 ETH testnet para a carteira solicitante. Maximo 3 claims por carteira."""
    wallet = req.wallet_address.lower().strip()
    if not wallet.startswith("0x") or len(wallet) != 42:
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    count = db.query(FaucetClaim).filter(FaucetClaim.wallet_address == wallet).count()
    if count >= MAX_CLAIMS:
        raise HTTPException(status_code=409, detail="Claim limit reached (3/wallet)")

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

        claim = FaucetClaim(
            wallet_address=wallet,
            tx_hash=tx_hash,
            amount_eth=FAUCET_AMOUNT_ETH,
            claimed_at=datetime.now(timezone.utc).replace(tzinfo=None),
            basescan=basescan_url,
        )
        db.add(claim)
        db.commit()

        logger.info(f"faucet: {FAUCET_AMOUNT_ETH} ETH para {wallet[:10]}... tx={tx_hash[:16]}...")
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
async def faucet_status(wallet_address: str, db: Session = Depends(get_db)):
    """Verifica se a carteira ja fez claim."""
    wallet = wallet_address.lower().strip()
    claims = (
        db.query(FaucetClaim)
        .filter(FaucetClaim.wallet_address == wallet)
        .order_by(FaucetClaim.claimed_at.desc())
        .all()
    )
    count = len(claims)
    if count >= MAX_CLAIMS:
        last = claims[0]
        return {"claimed": True, "count": count, "tx_hash": last.tx_hash, "basescan": last.basescan}
    return {"claimed": False, "count": count}
