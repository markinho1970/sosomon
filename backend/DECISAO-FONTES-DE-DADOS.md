# Decisão Arquitetural — Fontes de Dados

> **REGRA INVIOLÁVEL: O SoSoMon usa EXCLUSIVAMENTE SoSoValue e SoDEX.**
> CoinGecko foi removido do circuito. Não reintroduzir.

## Por quê

O SoSoMon é uma aplicação construída sobre os produtos da SoSoValue e SoDEX para a Buildathon SoSoValue. Usar dados de terceiros (ex: CoinGecko) é inconsistente com a proposta do projeto e desnecessário — a SoSoValue já fornece preços históricos (klines) para todos os tokens que compõem seus próprios índices SSI.

## Estado atual (2026-06-11)

| Agente / Serviço | Fonte primária | Fonte secundária | CoinGecko |
|---|---|---|---|
| Scout | SoSoValue SSI constituents | SoDEX tickers (enriquecimento) | ❌ removido |
| Rebalancer | SoDEX tickers | SoSoValue klines | ❌ removido |
| NAV Updater | SoDEX tickers | SoSoValue klines | ❌ removido |
| Deposit Monitor | Base RPC (on-chain) | — | nunca usou |

O arquivo `services/coingecko.py` ainda existe no servidor mas **não é importado por nenhum agente**. É código dormente — pode ser deletado futuramente.

## Como buscar preços (padrão)

```python
# 1. SoDEX spot — para tokens com mercado listado
tickers = await get_all_tickers()
ticker = tickers.get(f"{SYMBOL}-USD") or tickers.get(f"{SYMBOL}-USDC")
price = float(ticker.get("lastPrice", 0))

# 2. SoSoValue klines — fallback e histórico (7d/30d)
await sosovalue._ensure_currency_cache()
cid = sosovalue._CURRENCY_CACHE.get(SYMBOL.upper())
klines = await sosovalue.get_currency_klines(cid, limit=31)
closes = [float(k.get("close", k.get("c", 0)) or 0) for k in klines if k.get("close")]
current_price = closes[-1]
change_30d = (closes[-1] - closes[0]) / closes[0] * 100
```

## Cobertura garantida

Todos os candidatos do Scout vêm dos SSIs da SoSoValue (ssiAI, ssiRWA, ssiDePIN). A SoSoValue tem klines para todos os tokens de seus próprios índices — portanto **cobertura de preços é 100% garantida** para qualquer token que o sistema possa recomendar.

## Rate limits

| API | Limite | Uso estimado/mês |
|---|---|---|
| SoSoValue | 20 req/min, 100k/mês | ~15k (Scout diário + NAV horário) |
| SoDEX | sem limite documentado | baixo |

## O que NÃO fazer

- ❌ Não adicionar `from services.coingecko import ...` em nenhum arquivo
- ❌ Não buscar preços via `coingecko_id` — esse campo no DB é legado
- ❌ Não usar APIs de terceiros (CoinMarketCap, Binance, etc.) sem decisão explícita
- ✅ Sempre resolver symbol → currency_id via `sosovalue._CURRENCY_CACHE`
- ✅ Sempre usar SoDEX como primário e SoSoValue klines como fallback
