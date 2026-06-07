from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import os, uuid

from eth_account.messages import encode_defunct
from eth_account import Account

from database import get_db
from models import AlphaIndex, Subscriber, SubscriberPortfolio, AgentActivityLog, InvestmentIntent, InvestmentConsent

router = APIRouter(prefix="/api/invest", tags=["invest"])

_NETWORK_CONFIGS = {
    "mainnet": {
        "mode": "mainnet", "chain_id": 8453, "network": "base",
        "usdc_contract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "basescan_url": "https://basescan.org", "rpc_url": "https://mainnet.base.org",
        "fund_wallet": os.getenv("FUND_WALLET_ADDRESS", ""),
    },
    "testnet": {
        "mode": "testnet", "chain_id": 84532, "network": "base-sepolia",
        "usdc_contract": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "basescan_url": "https://sepolia.basescan.org", "rpc_url": "https://sepolia.base.org",
        "fund_wallet": os.getenv("TESTNET_FUND_WALLET_ADDRESS", os.getenv("FUND_WALLET_ADDRESS", "")),
    },
}


@router.get("/network-config")
async def get_network_config(mode: str = "mainnet"):
    """Retorna configuração da rede solicitada (mainnet ou testnet)."""
    return _NETWORK_CONFIGS.get(mode, _NETWORK_CONFIGS["mainnet"])


@router.get("/fund-wallet")
async def get_fund_wallet_endpoint(mode: str = "mainnet"):
    """Retorna endereço e saldo USDC da fund wallet na rede solicitada."""
    from services.deposit_monitor import get_fund_wallet_info
    return await get_fund_wallet_info(mode)


TERMS_VERSION = "v1.0"


class ConsentRequest(BaseModel):
    wallet_address: str
    index_id: str
    signature: str
    signed_message: str
    network_mode: str = "mainnet"  # "mainnet" | "testnet"


class IntentRequest(BaseModel):
    wallet_address: str
    index_id: str


@router.post("/register-consent")
def register_consent(req: ConsentRequest, request: Request, db: Session = Depends(get_db)):
    """
    Verifica assinatura EIP-191 do termo de risco e registra o consentimento.
    Também cria InvestmentIntent para associar o próximo depósito ao índice escolhido.
    """
    # Verificar assinatura
    try:
        msg_encoded = encode_defunct(text=req.signed_message)
        recovered = Account.recover_message(msg_encoded, signature=req.signature)
    except Exception:
        raise HTTPException(status_code=400, detail="Assinatura inválida")

    if recovered.lower() != req.wallet_address.lower():
        raise HTTPException(status_code=401, detail="Assinatura não corresponde à carteira")

    # Verificar que o índice existe
    index = db.query(AlphaIndex).filter(
        AlphaIndex.id == req.index_id,
        AlphaIndex.is_active == True,
    ).first()
    if not index:
        raise HTTPException(status_code=404, detail="Índice não encontrado")

    wallet = req.wallet_address.lower()

    # Salvar consentimento
    consent = InvestmentConsent(
        wallet_address=wallet,
        index_id=req.index_id,
        terms_version=TERMS_VERSION,
        signature=req.signature,
        signed_message=req.signed_message,
        signed_at=datetime.now(timezone.utc),
        ip_hint=request.client.host if request.client else None,
    )
    db.add(consent)

    network_mode = req.network_mode if req.network_mode in ("mainnet", "testnet") else "mainnet"

    # Registrar intenção de depósito (válida por 24h) com rede correta
    intent = InvestmentIntent(
        wallet_address=wallet,
        index_id=req.index_id,
        network_mode=network_mode,
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        fulfilled=False,
    )
    db.add(intent)
    db.commit()

    return {
        "success": True,
        "wallet_address": wallet,
        "index_id": req.index_id,
        "index_name": index.name,
        "terms_version": TERMS_VERSION,
        "intent_expires_in_hours": 24,
        "message": f"Termo assinado e intenção registrada. Seu próximo depósito será creditado no índice '{index.name}'.",
    }


@router.get("/check-consent/{wallet_address}/{index_id}")
def check_consent(wallet_address: str, index_id: str, db: Session = Depends(get_db)):
    """Verifica se o usuário já tem consentimento registrado para este índice."""
    wallet = wallet_address.lower()
    consent = db.query(InvestmentConsent).filter(
        InvestmentConsent.wallet_address == wallet,
        InvestmentConsent.index_id == index_id,
        InvestmentConsent.terms_version == TERMS_VERSION,
    ).order_by(InvestmentConsent.signed_at.desc()).first()

    intent = db.query(InvestmentIntent).filter(
        InvestmentIntent.wallet_address == wallet,
        InvestmentIntent.index_id == index_id,
        InvestmentIntent.fulfilled == False,
    ).order_by(InvestmentIntent.created_at.desc()).first()

    return {
        "has_consent": consent is not None,
        "consent_date": consent.signed_at.isoformat() if consent else None,
        "terms_version": consent.terms_version if consent else None,
        "has_active_intent": intent is not None,
        "intent_expires_at": intent.expires_at.isoformat() if intent and intent.expires_at else None,
    }


@router.get("/fund-wallet")
async def get_fund_wallet(mode: str = "mainnet"):
    """Returns fund wallet address and current USDC balance on the specified network."""
    from services.deposit_monitor import get_fund_wallet_info
    return await get_fund_wallet_info(mode)


class InvestRequest(BaseModel):
    wallet_address: str
    index_id: str
    amount_usd: float


@router.post("")
def invest(req: InvestRequest, db: Session = Depends(get_db)):
    # Endpoint desativado — investimentos só são registrados via deposit_monitor
    # (detecção on-chain de transferências USDC na rede Base)
    raise HTTPException(
        status_code=410,
        detail="Direct investment via API is disabled. Send USDC to the fund wallet on Base network. Your portfolio is credited automatically within 2-3 minutes.",
    )
    if req.amount_usd < 5:
        raise HTTPException(status_code=400, detail="Minimum investment is $5")

    index = db.query(AlphaIndex).filter(
        AlphaIndex.id == req.index_id,
        AlphaIndex.is_active == True,
    ).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")

    # Get or create subscriber
    req.wallet_address = req.wallet_address.lower()
    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == req.wallet_address
    ).first()
    if not subscriber:
        subscriber = Subscriber(
            id=str(uuid.uuid4()),
            wallet_address=req.wallet_address,
            referral_code=str(uuid.uuid4())[:8].upper(),
        )
        db.add(subscriber)
        db.flush()

    tokens_to_mint = req.amount_usd / max(index.nav_usd, 0.0001)

    portfolio = db.query(SubscriberPortfolio).filter(
        SubscriberPortfolio.subscriber_id == subscriber.id,
        SubscriberPortfolio.index_id == req.index_id,
    ).first()

    if portfolio:
        portfolio.deposited_usd += req.amount_usd
        portfolio.current_value_usd += req.amount_usd
        portfolio.index_tokens_held += tokens_to_mint
        portfolio.last_updated_at = datetime.utcnow()
        if portfolio.current_value_usd > portfolio.high_water_mark_usd:
            portfolio.high_water_mark_usd = portfolio.current_value_usd
    else:
        portfolio = SubscriberPortfolio(
            subscriber_id=subscriber.id,
            index_id=req.index_id,
            deposited_usd=req.amount_usd,
            current_value_usd=req.amount_usd,
            index_tokens_held=tokens_to_mint,
            high_water_mark_usd=req.amount_usd,
        )
        db.add(portfolio)
        index.subscriber_count = (index.subscriber_count or 0) + 1

    index.aum_usd = (index.aum_usd or 0) + req.amount_usd
    db.commit()

    return {
        "success": True,
        "wallet_address": req.wallet_address,
        "index_id": req.index_id,
        "amount_usd": req.amount_usd,
        "tokens_received": round(tokens_to_mint, 6),
        "nav_usd": index.nav_usd,
    }


class WithdrawRequest(BaseModel):
    wallet_address: str
    index_id: str
    amount_usd: float
    network_mode: str = "mainnet"


class WithdrawPreviewRequest(BaseModel):
    wallet_address: str
    index_id: str
    amount_usd: float
    network_mode: str = "mainnet"


@router.post("/withdraw-preview")
def withdraw_preview(req: WithdrawPreviewRequest, db: Session = Depends(get_db)):
    """Calcula taxas e P&L sem executar nada. Usar antes do saque real."""
    if req.amount_usd < 1:
        raise HTTPException(status_code=400, detail="Valor mínimo de saque: $1")

    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == req.wallet_address.lower()
    ).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Investidor não encontrado")

    portfolio = db.query(SubscriberPortfolio).filter(
        SubscriberPortfolio.subscriber_id == subscriber.id,
        SubscriberPortfolio.index_id == req.index_id,
        SubscriberPortfolio.network_mode == getattr(req, "network_mode", "mainnet"),
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Sem posição neste index")

    if req.amount_usd > (portfolio.current_value_usd or 0):
        raise HTTPException(status_code=400, detail=f"Valor excede saldo atual (${portfolio.current_value_usd:.2f})")

    from services.withdrawal_executor import preview_withdrawal
    try:
        preview = preview_withdrawal(portfolio, None, req.amount_usd)
        preview["to_wallet"] = subscriber.wallet_address
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class WithdrawExecuteRequest(BaseModel):
    wallet_address: str
    index_id: str
    amount_usd: float
    simulate: bool = False   # True = sandbox, não transmite para blockchain


@router.post("/withdraw-execute")
async def withdraw_execute(req: WithdrawExecuteRequest, db: Session = Depends(get_db)):
    """
    Executa o saque on-chain (ou simula se simulate=True).

    simulate=True → roda todas as verificações e assina mas NÃO transmite.
    Útil para testar o fluxo completo sem risco.
    """
    if req.amount_usd < 1:
        raise HTTPException(status_code=400, detail="Valor mínimo: $1")

    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == req.wallet_address.lower()
    ).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Investidor não encontrado")

    portfolio = db.query(SubscriberPortfolio).filter(
        SubscriberPortfolio.subscriber_id == subscriber.id,
        SubscriberPortfolio.index_id == req.index_id,
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Sem posição neste index")

    if req.amount_usd > (portfolio.current_value_usd or 0):
        raise HTTPException(status_code=400, detail=f"Valor excede saldo atual (${portfolio.current_value_usd:.2f})")

    index = db.query(AlphaIndex).filter(AlphaIndex.id == req.index_id).first()

    # Calcular preview (taxas e P&L)
    from services.withdrawal_executor import preview_withdrawal, execute_withdrawal
    try:
        preview = preview_withdrawal(portfolio, index, req.amount_usd)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    net_usd = preview["net_usd"]
    if net_usd <= 0 and not req.simulate:
        raise HTTPException(status_code=400, detail="Valor líquido após taxas é zero ou negativo.")

    # Executar (ou simular) o envio on-chain
    tx_result = await execute_withdrawal(
        recipient   = subscriber.wallet_address,
        amount_usd  = net_usd,
        simulate    = req.simulate,
    )

    # Só atualiza o banco se a tx foi bem-sucedida E não é simulação
    if tx_result["success"] and not req.simulate:
        nav = index.nav_usd if index and index.nav_usd else 1.0
        tokens_burned = req.amount_usd / nav

        portfolio.current_value_usd  = max(0, (portfolio.current_value_usd or 0) - req.amount_usd)
        portfolio.index_tokens_held  = max(0, (portfolio.index_tokens_held or 0) - tokens_burned)
        portfolio.last_updated_at    = datetime.now(timezone.utc)
        if portfolio.current_value_usd < (portfolio.high_water_mark_usd or 0):
            portfolio.high_water_mark_usd = portfolio.current_value_usd

        if index:
            index.aum_usd = max(0, (index.aum_usd or 0) - req.amount_usd)
            if portfolio.current_value_usd <= 0:
                index.subscriber_count = max(0, (index.subscriber_count or 1) - 1)

        # Log auditável
        activity = AgentActivityLog(
            id        = str(uuid.uuid4()),
            index_id  = req.index_id,
            agent     = "withdraw",
            action    = "withdrawal_executed",
            description = (
                f"Saque de ${req.amount_usd:.2f} por {subscriber.wallet_address[:8]}…"
                f" | Líquido: ${net_usd:.2f} | Taxa gestão: ${preview['management_fee_usd']:.4f}"
                f" | Taxa perf: ${preview['performance_fee_usd']:.4f}"
                f" | Tx: {tx_result.get('basescan','')}"
            ),
            timestamp = datetime.now(timezone.utc),
            data      = {
                "tx_hash":          tx_result.get("tx_hash", ""),
                "basescan":         tx_result.get("basescan", ""),
                "to":               subscriber.wallet_address,
                "withdrawal_usd":   req.amount_usd,
                "net_usd":          net_usd,
                "management_fee":   preview["management_fee_usd"],
                "performance_fee":  preview["performance_fee_usd"],
                "gas_fee":          preview["gas_fee_est_usd"],
                "pnl_usd":          preview["pnl_usd"],
                "pnl_pct":          preview["pnl_pct"],
                "network":          "base",
                "chain_id":         8453,
            },
        )
        db.add(activity)
        db.commit()

    return {
        "success":           tx_result["success"],
        "simulate":          req.simulate,
        "tx_hash":           tx_result.get("tx_hash"),
        "basescan":          tx_result.get("basescan"),
        "withdrawal_usd":    req.amount_usd,
        "net_usd":           net_usd,
        "management_fee":    preview["management_fee_usd"],
        "performance_fee":   preview["performance_fee_usd"],
        "gas_fee":           preview["gas_fee_est_usd"],
        "pnl_usd":           preview["pnl_usd"],
        "pnl_pct":           preview["pnl_pct"],
        "pnl_label":         preview["pnl_label"],
        "warnings":          preview["warnings"],
        "error":             tx_result.get("error"),
        "checks":            tx_result.get("checks", {}),
        "message":           tx_result.get("message", ""),
    }


@router.post("/withdraw")
def withdraw(req: WithdrawRequest, db: Session = Depends(get_db)):
    if req.amount_usd < 5:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is $5")

    req_wallet = req.wallet_address.lower()
    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == req_wallet
    ).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="No position found")

    portfolio = db.query(SubscriberPortfolio).filter(
        SubscriberPortfolio.subscriber_id == subscriber.id,
        SubscriberPortfolio.index_id == req.index_id,
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="No position in this index")

    if req.amount_usd > portfolio.current_value_usd:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    index = db.query(AlphaIndex).filter(AlphaIndex.id == req.index_id).first()
    nav = index.nav_usd if index and index.nav_usd else 1.0

    tokens_to_burn = req.amount_usd / nav

    profit_above_hwm = max(0, portfolio.current_value_usd - portfolio.high_water_mark_usd)
    perf_fee = round(min(profit_above_hwm, req.amount_usd) * 0.15, 4)
    net_usd = round(req.amount_usd - perf_fee, 4)

    portfolio.current_value_usd -= req.amount_usd
    portfolio.index_tokens_held = max(0, portfolio.index_tokens_held - tokens_to_burn)
    portfolio.last_updated_at = datetime.utcnow()
    if portfolio.current_value_usd < portfolio.high_water_mark_usd:
        portfolio.high_water_mark_usd = portfolio.current_value_usd

    if index:
        index.aum_usd = max(0, (index.aum_usd or 0) - req.amount_usd)
        if portfolio.current_value_usd <= 0:
            index.subscriber_count = max(0, (index.subscriber_count or 1) - 1)

    db.commit()

    return {
        "success": True,
        "wallet_address": req.wallet_address,
        "index_id": req.index_id,
        "amount_usd": req.amount_usd,
        "tokens_burned": round(tokens_to_burn, 6),
        "performance_fee_usd": perf_fee,
        "net_usd": net_usd,
        "message": f"Withdrawal of ${net_usd} USDC will be sent to your wallet on Base within 24h.",
    }


@router.get("/portfolio/{wallet_address}")
def get_portfolio(wallet_address: str, network_mode: str = "mainnet", db: Session = Depends(get_db)):
    wallet_address = wallet_address.lower()
    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == wallet_address
    ).first()
    if not subscriber:
        return {"portfolios": [], "subscriber": None}

    portfolios = []
    # Filtra portfolios pelo network_mode do request — mainnet e testnet não se misturam
    filtered_portfolios = [
        p for p in subscriber.portfolios
        if getattr(p, "network_mode", "mainnet") == network_mode
    ]
    for p in filtered_portfolios:
        index = db.query(AlphaIndex).filter(AlphaIndex.id == p.index_id).first()
        if not index:
            continue

        all_time_return = (
            ((p.current_value_usd - p.deposited_usd) / p.deposited_usd * 100)
            if p.deposited_usd > 0 else 0
        )
        profit_above_hwm = max(0, p.current_value_usd - p.high_water_mark_usd)
        accrued_fee = round(profit_above_hwm * 0.15, 2)

        portfolios.append({
            "index_id": p.index_id,
            "index_name": index.name,
            "theme": index.theme,
            "deposited_usd": p.deposited_usd,
            "current_value_usd": p.current_value_usd,
            "index_tokens_held": p.index_tokens_held,
            "all_time_return_pct": round(all_time_return, 2),
            "return_30d_pct": index.return_30d_pct,
            "high_water_mark_usd": p.high_water_mark_usd,
            "days_invested": p.days_invested,
            "accrued_performance_fee_usd": accrued_fee,
        })

    return {
        "portfolios": portfolios,
        "subscriber": {
            "id": subscriber.id,
            "wallet_address": subscriber.wallet_address,
            "is_pro": subscriber.is_pro,
            "days_streak": subscriber.days_streak,
        },
    }


@router.get("/refunds/{wallet_address}")
def get_refunds(wallet_address: str, network_mode: str = "mainnet", db: Session = Depends(get_db)):
    """Retorna estornos recentes para o wallet (últimas 48h)."""
    from datetime import timedelta
    from models import AgentActivityLog
    wallet_address = wallet_address.lower()
    cutoff = datetime.utcnow() - timedelta(hours=48)
    logs = db.query(AgentActivityLog).filter(
        AgentActivityLog.action == "deposit_refunded",
        AgentActivityLog.timestamp >= cutoff,
    ).order_by(AgentActivityLog.timestamp.desc()).limit(10).all()

    refunds = []
    for log in logs:
        data = log.data or {}
        if data.get("from", "").lower() == wallet_address and data.get("network_mode") == network_mode:
            refunds.append({
                "amount_usd": data.get("amount_usd", 0),
                "minimum_usd": data.get("minimum_usd", 5),
                "tx_hash": data.get("tx_hash", ""),
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "description": log.description,
            })
    return {"refunds": refunds}
