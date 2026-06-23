# SoSoMon RC2 — Migração Wave 3: 100% Ecossistema SoDEX + SoSoValue

> **Versão:** sosomon-v1.1-rc2  
> **Base:** cópia exata de sosomon-v1.1-rc1 (preservada intacta)  
> **Objetivo:** virar a chave de paper trading para execução real, com índices 100% compostos por tokens do ecossistema SoDEX/SoSoValue

---

## Por que essa migração

Durante a Wave 2 descobrimos que a SoDEX já lista todos os tokens necessários para construir índices temáticos reais:

- **Tokens SSI da SoSoValue** negociáveis diretamente: `vDEFI.ssi`, `vMAG7.ssi`, `vMEME.ssi`, `vUSSI`
- **Crypto blue chip**: BTC, ETH, SOL, BNB, XRP, DOGE, AAVE, UNI, LINK, ARB, SUI, TON, HYPE
- **Ativos alternativos**: `vXAUt` (ouro), `WSOSO` (ecossistema SoSoValue)
- **Ações sintéticas**: NVDA, AAPL, AMZN, GOOGL, META, MSFT, TSLA (quando saírem do HALT)

Isso significa que podemos fechar o ciclo completo:

```
Depósito USDC
  → compra tokens no SoDEX (execução real)
  → NAV reflete posições reais
  → rebalance executa ordens reais no SoDEX
  → saque vende tokens e retorna USDC real
  → investidor recebe retorno real (lucro ou prejuízo)
```

A Wave 2 era paper trading. A Wave 3 é dinheiro real.

---

## Nova composição dos índices

### 1. AI & Tech Index (substitui AI×Crypto)

| Token | Peso | Tipo | Justificativa |
|---|---|---|---|
| `vMAG7.ssi` | 40% | SSI token | Índice das 7 maiores tech stocks (MSFT, AAPL, NVDA, GOOGL, META, AMZN, TSLA) |
| `vETH` | 20% | Crypto | Infraestrutura de IA on-chain |
| `vSOL` | 15% | Crypto | Alto throughput para AI agents |
| `WSOSO` | 15% | Ecosistema | Alinhamento SoSoValue |
| `vNVDA` | 10% | Sintético | Exposição direta à IA de hardware — substituir por `vBTC` se HALT |

**Total: 100%** — 100% tokens negociáveis no SoDEX

### 2. Real Assets Index (substitui RWA)

| Token | Peso | Tipo | Justificativa |
|---|---|---|---|
| `vUSSI` | 35% | SSI token | Índice de ações americanas tokenizado |
| `vXAUt` | 30% | Alternativo | Ouro tokenizado — hedge de inflação e ativo real por excelência |
| `vBTC` | 20% | Crypto | Store of value / ouro digital |
| `WSOSO` | 15% | Ecosistema | Alinhamento SoSoValue |

**Total: 100%** — 100% tokens negociáveis no SoDEX

### 3. DeFi Infrastructure Index (substitui DePIN)

| Token | Peso | Tipo | Justificativa |
|---|---|---|---|
| `vDEFI.ssi` | 40% | SSI token | Índice amplo do setor DeFi |
| `vAAVE` | 20% | Crypto | Lending protocol, backbone DeFi |
| `vUNI` | 20% | Crypto | DEX líder, volume consistente |
| `vLINK` | 20% | Crypto | Oracle crítico para DeFi |

**Total: 100%** — 100% tokens negociáveis no SoDEX

---

## Mudanças técnicas necessárias no RC2

### Backend

#### 1. `backend/migrate_indexes_wave3.py` — script de migração dos índices

Criar script que:
- Remove todos os constituintes atuais dos 3 índices
- Insere os novos constituintes com tokens SoDEX
- Popula `price_at_nav_ref` via `get_all_tickers()` do SoDEX
- Reseta NAV para $1.00 (novo ciclo de inception)
- Recalcula portfolios existentes com novo NAV
- Registra migração em `AgentActivityLog`

```python
# Exemplo de execução esperada
python3 migrate_indexes_wave3.py --dry-run   # preview sem alterar
python3 migrate_indexes_wave3.py --execute   # aplica no banco
```

#### 2. `backend/agents/rebalancer.py` — ativar execução real

```python
# ANTES (Wave 2 — paper trading):
result = await execute_rebalance_trades(target_weights, dry_run=True)

# DEPOIS (Wave 3 — execução real):
result = await execute_rebalance_trades(target_weights, dry_run=False)
```

#### 3. `backend/services/deposit_monitor.py` — compra automática no depósito

Após confirmar depósito USDC na fund wallet:
```python
await execute_buy_for_deposit(
    index_id=portfolio.index_id,
    usdc_amount=deposit_amount,
    dry_run=False
)
```

#### 4. `backend/services/withdrawal.py` — venda automática no saque

Quando saque for solicitado:
1. Calcular valor em USDC: `tokens × NAV atual`
2. Vender proporção no SoDEX via `execute_sell_for_withdrawal()`
3. Transferir USDC para carteira do investidor

#### 5. `backend/services/nav_updater.py` — NAV 100% real

Com posições reais no SoDEX, mudar blending:
```python
# ANTES: 70% SoDEX portfolio + 30% calculated
# DEPOIS: 100% posições reais no SoDEX
nav_blend_ratio = 1.0
```

#### 6. `backend/services/fee_manager.py` — cobranças reais (novo arquivo)

- Management fee: 2% a.a. cobrado mensalmente sobre AUM
- Performance fee: 20% sobre ganhos acima do high-water mark
- Registrar em tabela de transações

#### 7. Variáveis de ambiente a completar

```env
SODEX_PRIVATE_KEY_ENC=<chave criptografada da fund wallet — já tem>
SODEX_WALLET_ADDRESS=0x935b...  — já definida
SODEX_ACCOUNT_ID=0
SODEX_USE_TESTNET=false
TESTNET_FUND_WALLET_ADDRESS=0x<endereço testnet — FALTA>
TELEGRAM_BOT_TOKEN=<token — FALTA>
TELEGRAM_CHAT_ID=<chat id — FALTA>
```

#### 8. Telegram notifications

Em `backend/agents/rebalancer.py`, função `_save_proposal()`:
- Enviar alerta quando nova proposta for criada
- Formato: índice, tipo de trigger, número de mudanças

### Frontend

#### 9. `frontend/src/app/components/InvestButton.tsx`

- Remover popup de bloqueio de mainnet (Wave 2)
- Mainnet aberta para depósitos reais

#### 10. UI — atualizar nome dos índices

- "AI×Crypto" → "AI & Tech"
- "Real World Assets" → "Real Assets"
- "DePIN Momentum" → "DeFi Infrastructure"

---

## Esquema de rollback

### Antes do deploy no servidor (obrigatório)

Executar no servidor antes de qualquer alteração:

```bash
# 1. Parar serviços
pm2 stop all

# 2. Backup do banco de dados (o mais crítico)
cp /opt/alphagrid/backend/alphagrid.db \
   /opt/alphagrid/backend/alphagrid.db.bak-pre-rc2-$(date +%Y%m%d_%H%M%S)

# 3. Backup completo do backend
cp -r /opt/alphagrid/backend \
      /opt/alphagrid/backend.bak.pre-rc2-$(date +%Y%m%d_%H%M%S)

# 4. Backup completo do frontend
cp -r /opt/alphagrid/frontend \
      /opt/alphagrid/frontend.bak.pre-rc2-$(date +%Y%m%d_%H%M%S)

# 5. Anotar estado atual
pm2 list > /opt/alphagrid/pm2-state-pre-rc2.txt

# 6. Reiniciar serviços (podem continuar rodando durante deploy se cuidadoso)
pm2 start all
```

### Procedimento de rollback (se algo der errado)

```bash
# 1. Parar tudo imediatamente
pm2 stop all

# 2. Restaurar backend
rm -rf /opt/alphagrid/backend
mv /opt/alphagrid/backend.bak.pre-rc2-TIMESTAMP /opt/alphagrid/backend

# 3. Restaurar banco de dados
cp /opt/alphagrid/backend/alphagrid.db.bak-pre-rc2-TIMESTAMP \
   /opt/alphagrid/backend/alphagrid.db

# 4. Restaurar frontend (se necessário)
rm -rf /opt/alphagrid/frontend
mv /opt/alphagrid/frontend.bak.pre-rc2-TIMESTAMP /opt/alphagrid/frontend

# 5. Reiniciar
pm2 restart all

# 6. Verificar
pm2 list
curl -s http://localhost:8000/health
```

### Critérios para acionar rollback

- NAV de qualquer índice com variação > 10% em < 1h após deploy
- Erro 500 persistente na API por > 5 minutos
- Deposit Monitor parando de detectar transações
- Qualquer execução real de trade com valor incorreto
- DB corrompido ou inacessível

---

## Sequência de testes antes de abrir mainnet

### Fase 1 — Testnet SoDEX

```bash
SODEX_USE_TESTNET=true
pm2 restart alphagrid-backend

# 1. Rodar migrate_indexes_wave3.py --dry-run → revisar saída
# 2. Rodar migrate_indexes_wave3.py --execute → aplicar
# 3. Depositar USDC testnet → verificar compra automática no SoDEX testnet
# 4. Aguardar NAV Updater → verificar NAV calculado com posições reais
# 5. Testar rebalance → verificar execução real no SoDEX testnet
# 6. Testar saque → verificar venda e retorno de USDC
# 7. Conferir P&L real vs NAV calculado
```

### Fase 2 — Mainnet canary ($5 real)

```bash
SODEX_USE_TESTNET=false

# 1. Depositar $5 USDC real
# 2. Confirmar compra de tokens proporcional no SoDEX mainnet
# 3. Aguardar 24h → verificar NAV atualizado com posições reais
# 4. Testar saque → receber USDC real de volta
# 5. Conferir P&L real vs NAV calculado
# 6. Monitorar logs 48h
```

### Fase 3 — Abertura pública

```bash
# 1. Remover popup de bloqueio do InvestButton
# 2. Ativar Telegram notifications
# 3. Monitorar primeiros 48h
# 4. pm2 logs alphagrid-backend --lines 200
```

---

## O que NÃO muda

- Arquitetura exclusiva SoSoValue + SoDEX (sem CoinGecko, nunca)
- NAV sanity guard (variação > 5%/hora bloqueia update)
- Campo `price_at_nav_ref` isolado de scripts externos
- Aprovação humana obrigatória para proposta de rebalance
- Testnet disponível para educação de usuários
- `full_audit.py` como ferramenta de diagnóstico

---

## Status das tarefas RC2

| # | Tarefa | Status |
|---|---|---|
| 1 | Criar `migrate_indexes_wave3.py` | ⬜ pendente |
| 2 | Ativar `dry_run=False` no rebalancer | ⬜ pendente |
| 3 | Compra automática no Deposit Monitor | ⬜ pendente |
| 4 | Venda automática no saque | ⬜ pendente |
| 5 | NAV Updater 100% real (blending → 1.0) | ⬜ pendente |
| 6 | Criar `fee_manager.py` | ⬜ pendente |
| 7 | Telegram notifications | ⬜ pendente |
| 8 | Definir `TESTNET_FUND_WALLET_ADDRESS` | ⬜ pendente |
| 9 | Remover popup mainnet no InvestButton | ⬜ pendente |
| 10 | Atualizar nomes dos índices no frontend | ⬜ pendente |
| 11 | Testes completos testnet SoDEX | ⬜ pendente |
| 12 | Canary deploy mainnet ($5) | ⬜ pendente |
| 13 | Abertura pública | ⬜ pendente |

---

## Referências

| Arquivo | Conteúdo |
|---|---|
| `backend/services/sodex.py` | Integração SoDEX — markets, tickers, orders, portfolio |
| `backend/services/nav_updater.py` | Atualização horária de NAV |
| `backend/agents/rebalancer.py` | Rebalanceamento + execução |
| `backend/services/deposit_monitor.py` | Detecção de depósitos on-chain |
| `backend/utils/eip712.py` | Assinatura de ordens EIP-712 |
| `../WAVE3-EXECUCAO-REAL.md` | Documento original Wave 3 (mantido como referência) |
| `../SERVER-ACCESS.md` | Acesso SSH + PM2 ao servidor |
