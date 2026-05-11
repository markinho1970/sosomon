# AlphaGrid — Status do Projeto
> Última atualização: 2026-04-17

---

## Situação atual: PRONTO PARA DEPLOY + CONFIGURAR .env

---

## O que foi construído (100% concluído)

### Frontend — Next.js 14
| Arquivo | Status |
|---|---|
| `frontend/src/app/page.tsx` | ✅ Landing page completa (hero, stats, index cards, pricing) |
| `frontend/src/app/indexes/page.tsx` | ✅ Lista de todos os indexes |
| `frontend/src/app/indexes/[slug]/page.tsx` | ✅ Detalhe do index (constituents, AI log, invest CTA) |
| `frontend/src/app/dashboard/page.tsx` | ✅ Dashboard do subscriber (portfolio, AI activity, macro) |
| `frontend/src/app/components/` | ✅ Navbar, IndexCard, AgentActivityFeed, MacroWidget |
| `frontend/src/types/index.ts` | ✅ Tipos TypeScript completos |
| `frontend/src/lib/api.ts` | ✅ Cliente de API |
| `frontend/src/lib/utils.ts` | ✅ Helpers (formatação USD, %, datas) |

### Backend — Python FastAPI
| Arquivo | Status |
|---|---|
| `backend/main.py` | ✅ App FastAPI + CORS + scheduler |
| `backend/models.py` | ✅ 7 tabelas SQLAlchemy |
| `backend/schemas.py` | ✅ Pydantic schemas |
| `backend/database.py` | ✅ SQLite / PostgreSQL |
| `backend/scheduler.py` | ✅ APScheduler (Scout diário, Rebalancer semanal, Narrator domingo) |
| `backend/api/indexes.py` | ✅ GET /api/indexes, /api/indexes/{slug} |
| `backend/api/agents.py` | ✅ GET /api/agents/activity |
| `backend/api/macro.py` | ✅ GET /api/macro |
| `backend/api/stats.py` | ✅ GET /api/stats |

### AI Agents
| Arquivo | Status |
|---|---|
| `backend/agents/scout.py` | ✅ GPT-4o — screening diário + dados reais do SoDEX |
| `backend/agents/rebalancer.py` | ✅ Claude Sonnet — rebalanceamento + execução real no SoDEX |
| `backend/agents/narrator.py` | ✅ GPT-4o — Alpha Memo + threads Twitter |

### Integração SoDEX (nova — API real)
| Arquivo | Status |
|---|---|
| `backend/services/sodex.py` | ✅ Market data + trading + portfolio snapshot |
| `backend/utils/eip712.py` | ✅ Assinatura EIP-712 com wallet EVM |
| `backend/services/sosovalue.py` | ✅ Sentiment score + sector flows (com fallback mock) |
| `backend/services/coingecko.py` | ✅ Screening de tokens (market cap, volume, momentum) |

### Infra / Deploy
| Arquivo | Status |
|---|---|
| `backend/requirements.txt` | ✅ eth-account + web3 adicionados |
| `backend/.env.example` | ✅ Variáveis do SoDEX incluídas |
| `install.sh` | ✅ Instalador Ubuntu (Nginx + PM2 + Node + Python) |
| `deploy.sh` | ✅ Script de update/redeploy |
| `infra/docker-compose.yml` | ✅ Docker alternativo |

---

## API Keys necessárias (.env)

```env
# IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# SoDEX — já tem a key!
SODEX_API_KEY=SODEX_API_KEY_KHAMAL
SODEX_PRIVATE_KEY=0x...chave_privada_da_wallet...
SODEX_WALLET_ADDRESS=0x...endereço_da_wallet...
SODEX_USE_TESTNET=true

# Dados de mercado
COINGECKO_API_KEY=CG-...

# Pagamentos (pro depois)
STRIPE_SECRET_KEY=sk_live_...
```

---

## SoDEX API — O que descobrimos

| Info | Detalhe |
|---|---|
| Docs oficiais | https://sodex.com/documentation/api/api |
| Mainnet Spot | `https://mainnet-gw.sodex.dev/api/v1/spot` |
| Mainnet Perps | `https://mainnet-gw.sodex.dev/api/v1/perps` |
| Testnet Spot | `https://testnet-gw.sodex.dev/api/v1/spot` |
| Autenticação | EIP-712 (assina com chave privada da wallet EVM) |
| Ações disponíveis | `newOrder`, `cancelOrder`, `transferAsset`, `updateLeverage` |
| Formato assinatura | Prepend `0x01` + signature bytes |
| API Key | `SODEX_API_KEY_KHAMAL` (já criada) |

---

## Próximos passos (em ordem)

### Passo 1 — Deploy no servidor (svexsa035 / 192.168.1.66)
```bash
# No Windows — copiar projeto pro servidor
scp -r "C:/Users/marki/OneDrive/Notes/CREATOR/PROJECT/sosovalue-business" admin@192.168.1.66:/home/admin/

# No servidor
ssh admin@192.168.1.66
cd /home/admin/sosovalue-business
chmod +x install.sh && sudo ./install.sh
```

### Passo 2 — Configurar .env no servidor
```bash
nano /home/admin/sosovalue-business/backend/.env
# Preencher: SODEX_PRIVATE_KEY, SODEX_WALLET_ADDRESS, OPENAI_API_KEY, ANTHROPIC_API_KEY
pm2 restart alphagrid-backend
```

### Passo 3 — Testar API do SoDEX
```bash
# Testar se a conexão com SoDEX está funcionando
curl http://localhost:8000/api/macro
curl http://localhost:8000/api/stats
```

### Passo 4 — Conectar frontend com backend real
- Substituir mock data nas páginas por chamadas reais à API
- Arquivo principal: `frontend/src/app/indexes/[slug]/page.tsx` (dados hardcoded)

### Passo 5 — Testar agentes na testnet
- Rodar Scout manualmente: `POST /api/agents/scout/run`
- Verificar se busca mercados do SoDEX testnet
- Rodar Rebalancer em `dry_run=True` primeiro

### Passo 6 — Submissão ao hackathon
- Gravar demo video (5 min máximo)
- Escrever pitch de 1 página
- Submeter no portal da SoSoValue/SoDEX

---

## Arquitetura resumida

```
[SoDEX API]──────────────────────────────────────┐
  mainnet-gw.sodex.dev                            │
  EIP-712 signing com wallet                      │
                                                  ▼
[Scout Agent (GPT-4o)] → screening diário → [ScoutReport DB]
        ↓                                         ↓
[Rebalancer (Claude)] → proposta → founder review → [SoDEX orders]
        ↓
[Narrator (GPT-4o)] → Alpha Memo + Twitter thread → founder review → publica

[FastAPI Backend] ← [Next.js Frontend]
  /api/indexes           Landing page
  /api/macro             Index detail
  /api/agents/activity   Dashboard
  /api/stats             Macro widget
```

---

## Notas importantes

- **dry_run=True** — sempre testar rebalanceamento simulado antes de executar real
- **SODEX_USE_TESTNET=true** — começar na testnet, mudar para false quando pronto para produção
- **SODEX_PRIVATE_KEY** — nunca compartilhar, só colocar no .env do servidor
- O frontend ainda usa dados **mock hardcoded** — precisa conectar à API real (Passo 4)
- Dados do SoDEX sobrescrevem CoinGecko quando o token está listado no DEX
