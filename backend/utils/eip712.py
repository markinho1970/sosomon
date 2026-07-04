"""
EIP-712 Signing para SoDEX API (baseado no sodex-go-sdk-public).

Pipeline de assinatura:
  1. ActionPayload{type, params} -> keccak256(JSON) -> payloadHash
  2. ExchangeAction{payloadHash, nonce} -> EIP-712 hash(domain) -> digest
  3. ECDSA-sign(digest) -> [0x01][r][s][v(0 ou 1)] = 66 bytes

Domain (spot engine):
  {name:"spot", version:"1", chainId:286623|138565, verifyingContract:0x000...000}
"""

import json
import time
from typing import Any, Dict

from eth_account import Account
from eth_utils import keccak

CHAIN_ID_MAINNET = 286623
CHAIN_ID_TESTNET = 138565  # SoDEX testnet

# Nomes de acao por endpoint
ACTION_BATCH_NEW_ORDER    = "batchNewOrder"
ACTION_BATCH_CANCEL_ORDER = "batchCancelOrder"


def get_nonce() -> int:
    """Nonce = timestamp em ms. Deve ser crescente por API key."""
    return int(time.time() * 1000)


def _payload_hash(payload: dict, action_type: str) -> bytes:
    """
    keccak256 do ActionPayload{type, params} serializado como JSON compacto.
    Ordem das chaves deve ser: type, params (igual ao json.Marshal do Go).
    """
    action_payload = {"type": action_type, "params": payload}
    compact = json.dumps(action_payload, separators=(",", ":"), sort_keys=False)
    return keccak(text=compact)


def sign_request(
    payload: dict,
    private_key: str,
    use_testnet: bool = False,
    action_type: str = ACTION_BATCH_NEW_ORDER,
) -> Dict[str, str]:
    """
    Assina um payload para a SoDEX API via EIP-712.

    Retorna dict com os headers de autenticacao:
      X-API-Sign, X-API-Nonce
    """
    chain_id = CHAIN_ID_TESTNET if use_testnet else CHAIN_ID_MAINNET
    nonce    = get_nonce()
    p_hash   = _payload_hash(payload, action_type)  # 32 bytes

    domain_data = {
        "name":              "spot",
        "version":           "1",
        "chainId":           chain_id,
        "verifyingContract": "0x0000000000000000000000000000000000000000",
    }

    message_types = {
        "ExchangeAction": [
            {"name": "payloadHash", "type": "bytes32"},
            {"name": "nonce",       "type": "uint64"},
        ],
    }

    message = {
        "payloadHash": p_hash,
        "nonce":       nonce,
    }

    account = Account.from_key(private_key)
    signed  = account.sign_typed_data(
        domain_data=domain_data,
        message_types=message_types,
        message_data=message,
    )

    # Wire format: [0x01][r 32 bytes][s 32 bytes][v 0 ou 1] = 66 bytes
    # eth_account retorna v=27/28 (legado); normalizar para 0/1 como go-ethereum espera
    raw = bytes(signed.signature)
    v   = raw[-1] - 27 if raw[-1] >= 27 else raw[-1]
    signature = "0x01" + raw[:-1].hex() + format(v, "02x")

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


def get_signed_headers(
    api_key: str,
    payload: dict,
    private_key: str,
    use_testnet: bool = False,
    action_type: str = ACTION_BATCH_NEW_ORDER,
) -> Dict[str, str]:
    """Headers completos para endpoints autenticados."""
    signed = sign_request(payload, private_key, use_testnet, action_type)
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
