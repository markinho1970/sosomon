# SoSoMon — Referência de APIs: SoSoValue & SoDEX

> Documento central de referência de todas as APIs usadas e disponíveis.
> Mantido em sincronia com `services/sosovalue.py` e `services/sodex.py`.

---

## SoSoValue API

**Base URL:** `https://openapi.sosovalue.com/openapi/v1`
**Auth:** Header `x-soso-api-key: <SOSOVALUE_API_KEY>`
**Rate limit:** 20 req/min · 100.000 req/mês
**Arquivo:** `/opt/alphagrid/backend/services/sosovalue.py`

---

### Currencies (tokens)

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /currencies` | `get_currencies()` | ✅ Em uso | Lista todos os tokens. Popula `_CURRENCY_CACHE` (ticker→id) e `_CURRENCY_ID_CACHE` (id→ticker). Chamada 1×/run do Scout |
| `GET /currencies/{id}/market-snapshot` | `get_currency_market_snapshot(id)` | ⚠️ Implementado, retorna 401 | Preço, 24h change, ATH, mcap, volume. Pode ser tier restrito |
| `GET /currencies/{id}/klines` | `get_currency_klines(id, limit)` | 🔵 Disponível, não usado | Histórico OHLCV diário. Útil para momentum de tokens fora do SoDEX |
| `GET /currencies/sector-spotlight` | `get_sector_spotlight()` | ✅ Em uso | Performance 24h por setor (AI, DeFi, RWA, DePIN, etc.) |
| `search_currency_by_symbol(sym)` | helper interno | ✅ Em uso | Resolve símbolo→currency_id via cache |
| `resolve_ticker(currency_id)` | helper interno | ✅ Em uso | Resolve currency_id→símbolo (FET, TAO, etc.) |
| `get_ssi_candidates_for_theme(theme)` | helper interno | ✅ Em uso | Combina SSI constituents + resolve tickers; substitui CoinGecko no Scout |

**Endpoints disponíveis não implementados:**
- `GET /currencies/{id}/holders` — distribuição de holders (útil para análise de concentração)
- `GET /currencies/{id}/exchanges` — em quais exchanges está listado
- `GET /currencies/{id}/social` — métricas sociais (Twitter, Telegram)
- `GET /currencies/trending` — tokens em alta no momento

---

### SSI Indexes (benchmarks SoSoValue)

Mapeamento: `ai-crypto → ssiAI` · `rwa → ssiRWA` · `depin → ssiDePIN`

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /indices` | `get_all_ssi_indexes()` | 🔵 Disponível | Lista todos os indexes SSI disponíveis |
| `GET /indices/{ticker}/constituents` | `get_index_constituents(ticker)` | ✅ Em uso | Composição do index: `{currency_id, symbol, weight}`. Fonte primária do Scout |
| `GET /indices/{ticker}/market-snapshot` | `get_index_snapshot(ticker)` | ✅ Em uso | Performance: 24h, 7d, 30d, 3m, 1y, YTD |
| `GET /indices/{ticker}/klines` | `get_index_klines(ticker, limit)` | 🔵 Disponível, não usado | Histórico diário do índice. Útil para chart do benchmark |
| `get_benchmark_for_theme(theme)` | helper | ✅ Em uso | Wrapper: snapshot do SSI correspondente ao tema |
| `get_ssi_constituents_for_theme(theme)` | helper | ✅ Em uso | Wrapper: constituents do SSI correspondente |

**Oportunidades:**
- `GET /indices/{ticker}/klines` → mostrar gráfico de performance do benchmark na UI
- `GET /indices` → descobrir novos índices SSI a medida que a SoSoValue lança (ex: ssiLayer2, ssiDeFi)

---

### ETF Flows

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /etfs/summary-history` | `get_etf_summary(symbol, country, limit)` | ✅ Em uso | Fluxo diário ETFs spot (BTC, ETH) — total_net_inflow, cum_net_inflow |
| `GET /etfs/{ticker}/market-snapshot` | `get_etf_snapshot(ticker)` | ✅ Em uso | Snapshot de ETF específico (IBIT, FBTC, ARKB, etc.) |
| `get_btc_etf_flow_summary()` | helper | ✅ Em uso | 7d BTC ETF + IBIT snapshot; usado no `get_macro_context()` |

**Oportunidades:**
- ETF ETH: `get_etf_summary("ETH", "US")` — pode enriquecer análise macro
- Lista de todos os ETFs disponíveis: `GET /etfs` (se existir)

---

### News

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /news/hot` | `get_hot_news(limit)` | 🔵 Disponível, não usado pelo Scout | Notícias em tempo real. Usado pelo Narrator |
| `GET /news/featured` | `get_featured_news(limit)` | 🔵 Disponível | Notícias editoriais curadas |
| `GET /news/search` | `search_news(keyword, limit)` | ✅ Em uso | Busca por keyword por tema no Scout |
| `get_news_for_theme(theme)` | helper | ✅ Em uso | Wrapper por tema: `search_news(keyword_map[theme])` |

---

### Macro

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /macro/events` | `get_macro_events()` | ✅ Em uso | Calendário: CPI, NFP, FOMC, etc. |
| `GET /macro/events/{event}/history` | `get_macro_event_history(event)` | 🔵 Disponível | Histórico actual vs forecast — útil para análise de surpresas macro |
| `get_macro_context()` | agregador | ✅ Em uso | Combina sector_spotlight + etf_flow + macro_events + stablecoin. Chamado 1× por run de Scout |

---

### Analyses (Charts de dados on-chain/macro)

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /analyses` | `get_available_charts()` | 🔵 Disponível | Lista todos os charts disponíveis |
| `GET /analyses/{name}` | `get_chart_data(name, limit)` | 🔵 Disponível | Dados de um chart específico |
| `GET /analyses/stablecoin_total_market_cap` | `get_stablecoin_dominance()` | ✅ Em uso | mcap USDT+USDC como proxy de risco |

**Charts conhecidos disponíveis (explorar via `get_available_charts()`):**
- `stablecoin_total_market_cap` ✅ em uso
- `bitcoin_realized_price` — preço realizado BTC
- `bitcoin_nupl` — Net Unrealized Profit/Loss
- `bitcoin_mvrv` — Market Value to Realized Value
- `defi_tvl` — TVL total DeFi
- `altcoin_season_index` — índice de temporada de altcoins

**Oportunidade alta:** `altcoin_season_index` pode substituir/complementar o score de sentimento derivado atualmente.

---

## SoDEX API

**Base URL Mainnet:** `https://mainnet-gw.sodex.dev/api/v1/spot`
**Base URL Testnet:** `https://testnet-gw.sodex.dev/api/v1/spot`
**Auth:**
- Público: `X-API-Key` header
- Privado/Trade: `X-API-Key` + `X-API-Sign` (EIP-712) + `X-API-Nonce`
**chainId mainnet:** 286623 · **chainId testnet:** 84532
**Arquivo:** `/opt/alphagrid/backend/services/sodex.py`

---

### Market Data (público)

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /markets/symbols` | `get_markets()` | ✅ Em uso | Todos os símbolos + regras de trading (minQty, tickSize, symbolID) |
| `GET /markets/tickers` | `get_all_tickers()` | ✅ Em uso | Tickers 24h stats: lastPrice, volume24h, high24h, low24h, change24h |
| `GET /markets/tickers?symbol=X` | `get_ticker(symbol)` | ✅ Implementado | Ticker de símbolo específico |
| `GET /markets/{symbol}/orderbook` | `get_orderbook(symbol, depth)` | ✅ Implementado | Bids/asks até depth 20 |
| `GET /markets/{symbol}/klines` | `get_candles(symbol, interval, limit)` | ✅ Em uso | OHLCV. Intervals: 1m, 5m, 15m, 1h, 4h, 1D |

**Oportunidades:**
- `get_orderbook()` — implementado mas não usado em nenhum agent. Útil para estimar slippage antes de executar rebalance
- `get_candles("RENDER-USD", "1h")` — momentum intraday para análises mais rápidas

---

### Account (autenticado)

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `GET /accounts/{wallet}/balances` | `get_balances()` | ✅ Implementado | Saldos da fund wallet com locked/available |
| `GET /accounts/{wallet}/orders` | `get_open_orders(symbol?)` | ✅ Implementado | Ordens abertas (com filtro por símbolo) |
| `GET /accounts/{wallet}/trades` | `get_trade_history(symbol?, limit)` | ✅ Implementado | Histórico de trades executados |
| `get_portfolio_snapshot()` | helper | ✅ Implementado | Saldos + valor USD + peso atual de cada posição |

---

### Trading (autenticado + EIP-712)

| Endpoint | Função no código | Status | Notas |
|----------|-----------------|--------|-------|
| `POST /trade/orders/batch` | `place_order(symbol, symbolID, side, type, qty, price)` | ✅ Implementado | Coloca ordens LIMIT/MARKET via batch endpoint |
| `DELETE /trade/orders/batch` | `cancel_orders(symbol, symbolID, orderIDs)` | ✅ Implementado | Cancela ordens pelo clOrdID |
| `get_symbol_id(symbol)` | helper | ✅ Implementado | Resolve symbol → symbolID numérico (necessário para place_order) |
| `execute_rebalance_trades(target_weights, dry_run)` | helper | ✅ Implementado | Executa rebalanceamento completo (calcula diffs, coloca ordens) |

---

## Arquitetura de chamadas (atual)

```
Scout (06:00 diário)
├── sosovalue._ensure_currency_cache()     → /currencies (1×, cacheado)
├── sosovalue.get_macro_context()          → 4 chamadas paralelas (sector, etf×2, macro, stable)
└── por tema (ai-crypto, rwa, depin) com 8s delay:
    ├── sosovalue.get_ssi_candidates_for_theme() → /indices/{ssi}/constituents
    ├── sosovalue.get_news_for_theme()           → /news/search
    ├── sosovalue.get_benchmark_for_theme()      → /indices/{ssi}/market-snapshot
    └── sodex.get_all_tickers() + get_markets() + get_candles() (para tokens listados)

Total estimado: ~14 chamadas SoSoValue / run de Scout (dentro do limite 20 req/min)

NAV Updater (horário)
└── sodex._usdc_balance() via deposit_monitor._rpc_resilient()

Deposit Monitor (2min)
└── _rpc_resilient() → Base blockchain (RPC fallback: llamarpc → ankr → publicnode)
```

---

## Próximas implementações sugeridas

| Prioridade | Feature | API | Esforço |
|------------|---------|-----|---------|
| 🟥 Alta | Preço tokens fora do SoDEX via klines | `GET /currencies/{id}/klines` | Pequeno |
| 🟥 Alta | Chart benchmark na UI | `GET /indices/{ticker}/klines` | Pequeno |
| 🟧 Média | Altcoin season index no sentimento | `GET /analyses/altcoin_season_index` | Pequeno |
| 🟧 Média | Estimar slippage antes de rebalance | `sodex.get_orderbook()` (já implementado) | Médio |
| 🟧 Média | ETF ETH flows no macro context | `GET /etfs/summary-history?symbol=ETH` | Pequeno |
| 🟨 Baixa | Histórico macro surprises (CPI, NFP) | `GET /macro/events/{event}/history` | Médio |
| 🟨 Baixa | Social signals por token | `GET /currencies/{id}/social` | Médio |
| 🟨 Baixa | Auto-descoberta novos SSI indexes | `GET /indices` (já implementado) | Pequeno |
| 🟩 Futuro | Rebalance real via SoDEX (mainnet) | `execute_rebalance_trades()` (já implementado) | Alto (test) |
| 🟩 Futuro | Telegram alerts de rebalance | Bot Telegram (decidido, não construído) | Médio |

---

## Variáveis de ambiente necessárias

```env
# SoSoValue
SOSOVALUE_API_KEY=...

# SoDEX
SODEX_API_KEY=...
SODEX_WALLET_ADDRESS=0x...
SODEX_ACCOUNT_ID=0
SODEX_USE_TESTNET=false          # true = testnet-gw.sodex.dev

# Base blockchain (RPC fallback)
BASE_RPC_URL=...                  # primário mainnet (opcional, tem fallback público)
BASE_SEPOLIA_RPC_URL=...          # primário testnet (opcional)

# Fund wallets
FUND_WALLET_ADDRESS=0x...         # mainnet
TESTNET_FUND_WALLET_ADDRESS=0x... # testnet (ainda ausente)
```
