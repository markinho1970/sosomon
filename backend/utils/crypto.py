"""
Criptografia AES-256-GCM para chaves privadas.
A chave mestra (MASTER_ENCRYPTION_KEY) fica no .env do servidor.
Chaves privadas são armazenadas sempre criptografadas — nunca em texto puro.
"""

import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_MASTER_KEY_HEX = os.getenv("MASTER_ENCRYPTION_KEY", "")


def _get_master_key() -> bytes:
    if not _MASTER_KEY_HEX:
        raise RuntimeError("MASTER_ENCRYPTION_KEY not set in environment")
    raw = bytes.fromhex(_MASTER_KEY_HEX.removeprefix("0x"))
    if len(raw) != 32:
        raise RuntimeError("MASTER_ENCRYPTION_KEY must be 32 bytes (64 hex chars)")
    return raw


def encrypt_key(private_key: str) -> str:
    """
    Criptografa uma chave privada EVM.
    Retorna string base64 no formato: nonce(12b) + ciphertext — seguro para armazenar no DB ou .env.
    """
    key = _get_master_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    pk = private_key.strip().encode()
    ct = aesgcm.encrypt(nonce, pk, None)
    return base64.b64encode(nonce + ct).decode()


def decrypt_key(encrypted: str) -> str:
    """
    Descriptografa uma chave privada. Usada em memória no momento da assinatura — nunca logada.
    """
    key = _get_master_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(encrypted)
    nonce, ct = raw[:12], raw[12:]
    return aesgcm.decrypt(nonce, ct, None).decode()


def get_private_key() -> str:
    """
    Retorna a chave privada do operador SoDEX (para assinar ordens).
    Aceita formato criptografado (SODEX_PRIVATE_KEY_ENC) ou texto puro (SODEX_PRIVATE_KEY).
    """
    enc = os.getenv("SODEX_PRIVATE_KEY_ENC", "")
    if enc:
        return decrypt_key(enc)
    plain = os.getenv("SODEX_PRIVATE_KEY", "")
    if plain:
        return plain
    raise RuntimeError("Nenhuma chave privada SoDEX configurada (SODEX_PRIVATE_KEY ou SODEX_PRIVATE_KEY_ENC)")


def get_fund_private_key() -> str:
    """
    Retorna a chave privada da fund wallet (para transferências ERC-20 on-chain na Base).
    Usa FUND_WALLET_PRIVATE_KEY_ENC (criptografada) ou FUND_WALLET_PRIVATE_KEY (texto puro).
    """
    enc = os.getenv("FUND_WALLET_PRIVATE_KEY_ENC", "")
    if enc:
        return decrypt_key(enc)
    plain = os.getenv("FUND_WALLET_PRIVATE_KEY", "")
    if plain:
        return plain
    raise RuntimeError("Nenhuma chave privada da fund wallet configurada (FUND_WALLET_PRIVATE_KEY_ENC ou FUND_WALLET_PRIVATE_KEY)")
