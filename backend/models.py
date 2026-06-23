from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class AlphaIndex(Base):
    __tablename__ = "indexes"

    id = Column(String, primary_key=True)          # e.g. "ai-crypto-infrastructure"
    slug = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    theme = Column(String, nullable=False)          # ai-crypto | rwa | depin | defi
    description = Column(Text)
    inception_date = Column(DateTime, default=datetime.utcnow)
    aum_usd = Column(Float, default=0.0)
    nav_usd = Column(Float, default=1.0)
    total_return_pct = Column(Float, default=0.0)
    return_30d_pct = Column(Float, default=0.0)
    return_7d_pct = Column(Float, default=0.0)
    btc_benchmark_30d = Column(Float, default=0.0)
    stablecoin_buffer_pct = Column(Float, default=0.0)
    subscriber_count = Column(Integer, default=0)
    management_fee_pct = Column(Float, default=0.75)
    last_rebalanced_at = Column(DateTime)
    rebalance_summary = Column(Text, default="")
    is_active = Column(Boolean, default=True)

    constituents = relationship("IndexConstituent", back_populates="index", cascade="all, delete-orphan")
    activities = relationship("AgentActivityLog", back_populates="index")


class IndexConstituent(Base):
    __tablename__ = "constituents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    index_id = Column(String, ForeignKey("indexes.id"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    coingecko_id = Column(String)
    weight = Column(Float, nullable=False)          # percentage 0-100
    current_price_usd = Column(Float, default=0.0)
    price_at_nav_ref  = Column(Float, default=0.0)   # atualizado APENAS pelo nav_updater — nunca por scripts externos
    market_cap_usd = Column(Float, default=0.0)
    volume_24h_usd = Column(Float, default=0.0)
    price_change_7d = Column(Float, default=0.0)
    price_change_30d = Column(Float, default=0.0)
    ai_rationale = Column(Text, default="")
    added_at = Column(DateTime, default=datetime.utcnow)
    is_stablecoin = Column(Boolean, default=False)
    network_mode = Column(String, default="mainnet")   # "mainnet" | "testnet" — coluna adicionada por migrate_constituent_network_mode.py

    index = relationship("AlphaIndex", back_populates="constituents")


class AgentActivityLog(Base):
    __tablename__ = "agent_activity"

    id = Column(String, primary_key=True)
    index_id = Column(String, ForeignKey("indexes.id"), nullable=True)
    agent = Column(String, nullable=False)          # scout | rebalancer | narrator
    action = Column(String, nullable=False)         # inclusion | exclusion | rebalance | ...
    token_symbol = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON, nullable=True)

    index = relationship("AlphaIndex", back_populates="activities")


class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(String, primary_key=True)
    wallet_address = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=True)
    is_pro = Column(Boolean, default=False)
    pro_since = Column(DateTime, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    referral_code = Column(String, unique=True)
    referred_by = Column(String, nullable=True)
    days_streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    portfolios = relationship("SubscriberPortfolio", back_populates="subscriber")


class SubscriberPortfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subscriber_id = Column(String, ForeignKey("subscribers.id"), nullable=False)
    index_id = Column(String, ForeignKey("indexes.id"), nullable=False)
    deposited_usd = Column(Float, default=0.0)
    current_value_usd = Column(Float, default=0.0)
    index_tokens_held = Column(Float, default=0.0)
    high_water_mark_usd = Column(Float, default=0.0)
    days_invested = Column(Integer, default=0)
    first_invested_at = Column(DateTime, default=datetime.utcnow)
    last_updated_at = Column(DateTime, default=datetime.utcnow)
    network_mode = Column(String, default="mainnet")  # "mainnet" | "testnet"

    subscriber = relationship("Subscriber", back_populates="portfolios")


class ScoutReport(Base):
    __tablename__ = "scout_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    index_id = Column(String, ForeignKey("indexes.id"), nullable=False)
    run_at = Column(DateTime, default=datetime.utcnow)
    tokens_screened = Column(Integer, default=0)
    tokens_qualified = Column(Integer, default=0)
    inclusions = Column(JSON, default=list)         # list of token dicts recommended for inclusion
    exclusions = Column(JSON, default=list)         # list of token dicts recommended for exclusion
    weight_changes = Column(JSON, default=list)
    raw_output = Column(Text)                        # full AI output for audit log


class InvestmentIntent(Base):
    """Registra a intenção de depósito: qual carteira vai depositar em qual índice.
    deposit_monitor consulta esta tabela para creditar o índice correto."""
    __tablename__ = "investment_intents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_address = Column(String, nullable=False, index=True)
    index_id = Column(String, ForeignKey("indexes.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    fulfilled = Column(Boolean, default=False)
    network_mode = Column(String, default="mainnet")  # "mainnet" | "testnet"


class InvestmentConsent(Base):
    """Registro auditável da concordância do usuário com o termo de risco."""
    __tablename__ = "investment_consents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_address = Column(String, nullable=False, index=True)
    index_id = Column(String, ForeignKey("indexes.id"), nullable=False)
    terms_version = Column(String, nullable=False, default="v1.0")
    signature = Column(Text, nullable=False)           # assinatura EIP-191 da carteira
    signed_message = Column(Text, nullable=False)      # mensagem exata que foi assinada
    signed_at = Column(DateTime, default=datetime.utcnow)
    ip_hint = Column(String, nullable=True)            # opcional, para auditoria


class RebalanceProposal(Base):
    __tablename__ = "rebalance_proposals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    index_id = Column(String, ForeignKey("indexes.id"), nullable=False)
    proposed_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    status = Column(String, default="pending")      # pending | approved | rejected | executed | failed | dry_run
    trigger = Column(String)                        # "weekly" | "drift" | "risk_override" | "manual"
    changes = Column(JSON, default=list)            # list of {symbol, old_weight, new_weight, action}
    ai_rationale = Column(Text)
    execution_orders = Column(JSON, default=list)   # list of executed orders with IDs from SoDEX
    execution_error = Column(Text, nullable=True)   # error message if execution failed
    network_mode = Column(String, default="mainnet")  # "mainnet" | "testnet" — coluna adicionada por migrate_proposal_network_mode.py

class FaucetClaim(Base):
    __tablename__ = "faucet_claims"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_address = Column(String, nullable=False, index=True)
    tx_hash = Column(String, nullable=False, unique=True)
    amount_eth = Column(Float, default=0.0001)
    claimed_at = Column(DateTime, default=datetime.utcnow)
    basescan = Column(String, nullable=True)


class SystemState(Base):
    """Estado persistido do sistema — chave/valor sobrevive a restarts."""
    __tablename__ = "system_state"
    key        = Column(String, primary_key=True)
    value      = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
