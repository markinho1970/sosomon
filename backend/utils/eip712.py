"""
EIP-712 Signing para SoDEX API.

SoDEX usa ExchangeAction typed data:
  types.ExchangeAction = [{name: payloadHash, type: bytes32}, {name: nonce, type: uint64}]
  domain.chainId = 286623 (mainnet) | 138565 (testnet)

Headers necessarios:
  X-API-Key, X-API-Sign, X-API-Nonce, Content-Type, Accept
"""

import hashlib
import json
import time
from typing import Any, Dict

from eth_account import Account

CHAIN_ID_MAINNET = 286623
CHAIN_ID_TESTNET = 138565


def get_nonce() -> int:
    """Nonce = timestamp em ms. Deve ser crescente por API key."""
    return int(time.time() * 1000)


def _payload_hash(payload: dict) -> bytes:
    """SHA-256 do payload JSON compacto (sem espacos)."""
    compact = json.dumps(payload, separators=(",", ":"), sort_keys=False)
    return hashlib.sha256(compact.encode()).digest()


def sign_request(payload: dict, private_key: str, use_testnet: bool = False) -> Dict[str, str]:
    """
    Assina um payload para a SoDEX API via EIP-712.

    Retorna dict com os headers de autenticacao:
      X-API-Sign, X-API-Nonce
    """
    chain_id = CHAIN_ID_TESTNET if use_testnet else CHAIN_ID_MAINNET
    nonce = get_nonce()
    p_hash = _payload_hash(payload)

    domain_data = {
        "name":    "SoDEX",
        "version": "1",
        "chainId": chain_id,
    }

    message_types = {
        "ExchangeAction": [
            {"name": "payloadHash", "type": "bytes32"},
            {"name": "nonce",       "type": "uint64"},
        ],
    }

    message = {
        "payloadHash": p_hash,   # bytes32 — eth_account aceita bytes diretamente
        "nonce":       nonce,
    }

    account = Account.from_key(private_key)
    signed  = account.sign_typed_data(
        domain_data=domain_data,
        message_types=message_types,
        message_data=message,
    )

    # SoDEX exige byte 0x01 prefixado na assinatura
    signature = "0x01" + signed.signature.hex()[2:]

    return {
        "X-API-Sign":  signature,
        "X-API-Nonce": str(nonce),
    }


def get_public_headers(api_key: str) -> Dict[str, str]:
    """Headers para endpoints publicos (sem assinatura)."""
    return {
        "X-API-Key":    api_key,
        "Content-Type": "application/json",
        "Accept":       "application/json",
    }


def get_signed_headers(api_key: str, payload: dict, private_key: str, use_testnet: bool = False) -> Dict[str, str]:
    """Headers completos para endpoints autenticados (leitura + escrita)."""
    signed = sign_request(payload, private_key, use_testnet)
    return {
        "X-API-Key":    api_key,
        "X-API-Sign":  signed["X-API-Sign"],
        "X-API-Nonce": signed["X-API-Nonce"],
        "Content-Type": "application/json",
        "Accept":       "application/json",
    }


def get_auth_headers(api_key: str) -> Dict[str, str]:
    return get_public_headers(api_key)


def build_order_params(*args, **kwargs) -> Dict[str, Any]:
    return kwargs
