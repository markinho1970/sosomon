# Wave 3 — Migração para Execução Real no SoDEX

> Documento de referência para a virada de chave do SoSoMon:
> de produto de **rastreamento de índices** para **fundo de índice com execução real**.

**Data de criação:** 2026-06-11
**Responsável:** Marco Lima

---

## Contexto

Durante a Wave 2, o SoSoMon rastreia índices temáticos da SoSoValue e calcula NAV com dados reais de mercado, mas **não executa ordens reais no SoDEX**. O USDC depositado fica parado na fund wallet. O lucro/prejuízo mostrado no NAV não é coberto por ativos reais — é paper trading.

Para a Wave 3, o ciclo deve ser fechado completamente:

```
Depósito USDC → Compra tokens no SoDEX → Posições reais → NAV reflete portfolio real → Saque vende tokens → Retorna USDC real
```

**A infraestrutura está 95% pronta. A Wave 3 é ligar os switches, não construir do zero.**

---

## O que o SoDEX oferece hoje (mapeado em 2026-06-11)

### Tokens SSI da SoSoValue listados no SoDEX

| Token | Par | Status | Volume 24h |
|---|---|---|---|
| `vDEFI.ssi` | DEFIssi/USDC | TRADING | ~$80k |
| `vMAG7.ssi` | MAG7ssi/USDC | TRADING | ~$107k |
| `vMEME.ssi` | MEMEssi/USDC | TRADING | ~$80k |
| `vUSSI` | USSI/USDC | TRADING | ~$115k |
| `WSOSO` | SOSO/USDC | TRADING | ~$321k |

Estes são os próprios índices SSI da SoSoValue negociáveis como tokens — alinhamento perfeito entre as duas plataformas.

### Crypto blue chip disponível

BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, ARB, AAVE, UNI, LINK, SUI, TON, HYPE, LTC, SHIB, PEPE, XLM, USDT

### Ativos alternativos

| Token | Descrição |
|---|---|
| `vXAUt` | Ouro tokenizado — relevante para RWA |
| `vNVDA` | NVIDIA sintético (HALT em jun/2026) |
| `vAAPL`, `vAMZN`, `vGOOGL`, `vMETA`, `vMSFT`, `vTSLA` | US stocks sintéticos (HALT) |

---

## Nova composição dos índices para Wave 3

### AI & Tech Index (substitui AI×Crypto)

| Token | Peso | Justificativa |
|---|---|---|
| `vMAG7.ssi` | 40% | SSI das 7 maiores tech stocks (MSFT, AAPL, NVDA, GOOGL, META, AMZN, TSLA) |
| `vNVDA` | 20% | Exposição direta à IA de hardware (quando sair do HALT) |
| `vETH` | 20% | Infraestrutura de IA on-chain |
| `vSOL` | 10% | Alternativa de alto throughput para AI agents |
| `WSOSO` | 10% | Alinhamento com ecossistema SoSoValue |

*Se vNVDA continuar em HALT: alocar 20% em vBTC como hedge.*

### Real Assets Index (substitui RWA)

| Token | Peso | Justificativa |
|---|---|---|
| `vXAUt` | 35% | Ouro — ativo real por excelência, hedge de inflação |
| `vUSSI` | 35% | Índice de ações americanas tokenizado — maior RWA disponível |
| `vBTC` | 20% | Store of value / ouro digital |
| `WSOSO` | 10% | Alinhamento ecossistema |

### DeFi Infrastructure Index (substitui DePIN)

| Token | Peso | Justificativa |
|---|---|---|
| `vDEFI.ssi` | 40% | SSI DeFi — índice amplo do setor |
| `vAAVE` | 20% | Lending protocol, backbone DeFi |
| `vUNI` | 20% | DEX líder, volume consistente |
| `vLINK` | 20% | Oracle crítico para DeFi e DePIN |

---

## Checklist técnico para a virada de chave

### 1. Variáveis de ambiente (verificar e completar)

```env
SODEX_PRIVATE_KEY_ENC=<chave criptografada da fund wallet>
SODEX_WALLET_ADDRESS=0x<endereço da fund wallet>
SODEX_ACCOUNT_ID=0
SODEX_USE_TESTNET=false
TESTNET_FUND_WALLET_ADDRESS=0x<endereço testnet>
TELEGRAM_BOT_TOKEN=<token do bot>
TELEGRAM_CHAT_ID=<chat id>
```

### 2. Criar script de migração dos índices

Arquivo: `backend/migrate_indexes_wave3.py`

O script deve:
- Remover constituintes antigos (FET, TAO, ONDO, GRASS, RENDER, etc.)
- Inserir novos constituintes com tokens SoDEX
- Popular `price_at_nav_ref` com preços atuais via `get_all_tickers()`
- Resetar NAV para $1.00 (novo ciclo de inception)
- Resetar portfolios existentes com novo NAV
- Registrar migração em `AgentActivityLog`

### 3. Ativar execução real no Rebalancer

Em `backend/agents/rebalancer.py`, função `apply_proposal()`:

```python
# ANTES (Wave 2 — paper trading):
result = await execute_rebalance_trades(target_weights, dry_run=True)

# DEPOIS (Wave 3 — execução real):
result = await execute_rebalance_trades(target_weights, dry_run=False)
```

### 4. Ativar compra automática no Deposit Monitor

Em `backend/services/deposit_monitor.py`, após confirmar depósito:

```python
from services.sodex import execute_rebalance_trades
# Calcular pesos alvo do índice e executar compra proporcional ao depósito
await execute_buy_for_deposit(
    index_id=portfolio.index_id,
    usdc_amount=deposit_amount,
    dry_run=False
)
```

### 5. Implementar venda automática no Saque

Quando usuário solicitar withdrawal:
1. Calcular valor em USDC (tokens_held × NAV atual)
2. Vender proporção de tokens no SoDEX
3. Transferir USDC para carteira do usuário

### 6. NAV Updater — portfolio 100% real

Em `backend/services/nav_updater.py`:
- A função `_fetch_sodex_portfolio()` já existe e busca posições reais
- Com posições reais no SoDEX, mudar blending de 70/30 para 100% real
- O NAV refletirá exatamente o valor das posições abertas

### 7. Fee Manager — implementar cobrança real

Criar `backend/services/fee_manager.py`:
- **Management fee (2% a.a.)**: cobrar mensalmente sobre AUM total
- **Performance fee (20%)**: cobrar sobre ganhos acima do high-water mark
- Registrar cobranças em tabela de transações

### 8. Telegram notifications

Bot token e chat ID já decididos (Wave 3 confirmado).
Em `backend/agents/rebalancer.py`, função `_save_proposal()`:
- Enviar alerta quando nova proposta for criada
- Formato: índice, tipo de trigger, número de mudanças

---

## Fluxo completo Wave 3

```
1. Usuário conecta wallet (MetaMask, Base network)
2. Assina termo de risco (já implementado)
3. Envia USDC para fund wallet
4. Deposit Monitor detecta (polling 2min — já funciona)
5. Sistema compra tokens no SoDEX na proporção do índice
6. NAV Updater (horário) busca posições reais e recalcula NAV
7. Dashboard mostra performance real com P&L real
8. Rebalancer propõe ajustes → aprovação humana → execução no SoDEX
9. Saque: sistema vende tokens, retorna USDC para investidor
10. Fees cobradas: management fee mensal + performance fee sobre ganhos
```

---

## Sequência de testes antes de abrir mainnet

### Fase 1 — Testnet SoDEX

```bash
# Setar testnet
SODEX_USE_TESTNET=true
pm2 restart alphagrid-backend

# 1. Rodar migrate_indexes_wave3.py no testnet
# 2. Depositar USDC testnet na testnet fund wallet
# 3. Verificar que Deposit Monitor detecta
# 4. Verificar que execute_rebalance_trades() executa no testnet SoDEX
# 5. Verificar que NAV atualiza com portfolio real
# 6. Testar saque completo
# 7. Verificar P&L real
```

### Fase 2 — Mainnet valor mínimo (canary deploy)

```bash
# 1. Depositar $5 USDC real
# 2. Verificar compra de tokens proporcional no SoDEX mainnet
# 3. Aguardar 24h e verificar NAV atualizado
# 4. Testar saque e receber USDC de volta
# 5. Conferir P&L real vs NAV calculado
```

### Fase 3 — Abertura pública

```bash
# 1. Remover popup de bloqueio do InvestButton (mainnet)
# 2. Ativar Telegram notifications
# 3. Monitorar primeiros 48h com atenção redobrada
# 4. Acompanhar logs: pm2 logs alphagrid-backend
```

---

## O que NÃO deve mudar

- Arquitetura exclusiva SoSoValue + SoDEX (sem CoinGecko, nunca)
- NAV sanity guard (variação >5%/hora bloqueia update)
- Campo `price_at_nav_ref` isolado de scripts externos
- Aprovação humana obrigatória para proposta de rebalance
- Testnet disponível para educação de usuários
- `full_audit.py` como ferramenta de diagnóstico

---

## Referências técnicas

| Arquivo | Função |
|---|---|
| `backend/services/sodex.py` | Integração SoDEX: markets, tickers, orders, portfolio |
| `backend/services/nav_updater.py` | Atualização horária de NAV |
| `backend/agents/rebalancer.py` | Lógica de rebalanceamento + execução |
| `backend/services/deposit_monitor.py` | Detecção de depósitos on-chain |
| `backend/utils/eip712.py` | Assinatura de ordens EIP-712 |
| `backend/DECISAO-FONTES-DE-DADOS.md` | Regra: só SoSoValue + SoDEX |
| `backend/full_audit.py` | Auditoria completa do sistema |
| `sosovalue-business/WAVE3-EXECUCAO-REAL.md` | Este arquivo |
