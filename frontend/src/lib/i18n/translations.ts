export type Lang = "en" | "pt" | "zh" | "ja" | "hi" | "id" | "ko";



export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [

  { code: "en", label: "English",   flag: "🇺🇸" },

  { code: "pt", label: "Português", flag: "🇧🇷" },

  { code: "zh", label: "中文",       flag: "🇨🇳" },

  { code: "ja", label: "日本語",     flag: "🇯🇵" },

  { code: "hi", label: "हिंदी",      flag: "🇮🇳" },

  { code: "id", label: "Bahasa",    flag: "🇮🇩" },

  { code: "ko", label: "한국어",     flag: "🇰🇷" },

];



export const T: Record<Lang, Record<string, string>> = {

  en: {

    nav_indexes: "Indexes", nav_transparency: "Transparency", nav_whats_new: "What's New",

    nav_dashboard: "Dashboard", nav_mainnet: "Mainnet", nav_testnet: "Testnet",

    testnet_banner: "TESTNET MODE — Base Sepolia — Test USDC, no real value",
    mainnet_banner: "MAINNET — Base Mainnet — Real USDC",

    dash_title: "My Portfolio", dash_connected: "Connected:",

    dash_total_value: "Total Value", dash_total_deposited: "Total Deposited",

    dash_30d: "30D Return", dash_fee: "Accrued Perf. Fee",

    dash_alltime: "all-time", dash_across: "across {n} indexes",

    dash_wavg: "weighted avg", dash_hwm: "15% on profits above HWM",

    dash_empty: "No active investments yet.", dash_browse: "Browse Indexes",

    tab_portfolio: "Portfolio", tab_performance: "Performance",

    tab_activity: "AI Activity", tab_macro: "Macro", tab_movements: "Movements",

    dash_refund_title: "Deposit automatically refunded",
    mov_deposit: "Deposit", mov_refund: "Refund", mov_withdrawal: "Withdrawal", mov_manual: "Manual Credit",
    mov_empty: "No movements found.", mov_index: "Index", mov_tx: "TX Hash", mov_refund_tx: "Refund TX",
    mov_status_ok: "Sent", mov_status_failed: "Failed", mov_status_pending: "Pending",
    mov_below_min: "Below minimum deposit of",

    invest_btn: "Deposit & Invest", invest_connect: "Connect Wallet to Invest",

    invest_title: "Risk Disclaimer — {index}",

    invest_signed: "Term Signed — Make Your Deposit",

    invest_waiting: "Awaiting Confirmation",

    invest_allcheck: "All risks acknowledged. Sign to proceed.",

    invest_sign: "Sign Risk Disclaimer", invest_signing: "Signing…",

    invest_sent: "I already sent the USDC →", invest_min: "Minimum: $5 USDC",

    invest_pending: "Your deposit will appear in the dashboard in 2–3 min after on-chain confirmation.",

    idx_title: "All Indexes",

    idx_sub: "AI-managed thematic portfolios. Rebalanced by agents, verified on SoSoValue ValueChain.",

    idx_aum: "AUM", idx_nav: "NAV", idx_30d: "30d Return", idx_alltime: "All-Time",

    idx_loading: "Loading indexes…",

    net_wrong: "Wrong Network", net_msg: "SoSoMon runs on {net}. Switch to continue.",

    net_btn: "Switch to {net}", net_switching: "Switching…",

    wn_title: "What's New", wn_subtitle: "Wave 1 established the foundation. Wave 2 makes it real — on-chain deposits, live trades, full transparency.",

    // Homepage

    home_badge: "Built on SoSoValue ValueChain · Powered by SoDEX",

    home_h1a: "Thematic indexes.", home_h1b: "Managed by AI.", home_h1c: "Verified on-chain.",

    home_sub: "SoSoMon runs AI agents that screen, rebalance, and report on crypto thematic indexes — institutional-quality portfolio management, fully automated on SoSoValue ValueChain.",

    home_explore: "Explore Indexes", home_how: "How it Works",

    home_aum: "Total AUM", home_indexes: "Active Indexes", home_subs: "Subscribers", home_avg30d: "Avg 30d Return",

    home_active: "Active Indexes", home_viewall: "View all",

    home_hiw_title: "One person. Three AI agents.",

    home_hiw_sub: "SoSoMon runs entirely on AI agents operating on SoSoValue ValueChain. The agents handle everything.",

    home_scout_role: "Research & Screening",

    home_scout_desc: "Scans 400+ tokens daily using SoSoValue data feeds and SoDEX market data. Outputs ranked inclusion lists with AI-written rationale.",

    home_rebal_role: "Portfolio Maintenance",

    home_rebal_desc: "Monitors drift, sentiment score, and liquidity. Proposes rebalancing weekly or when risk triggers are hit. Executes orders on SoDEX.",

    home_narrator_role: "Content & Reports",

    home_narrator_desc: "Generates the weekly Alpha Memo, Twitter threads, and subscriber digests automatically from agent data. Full transparency, zero spin.",

    admin_title: "Admin Access", admin_subtitle: "SoSoMon Founder Dashboard",

    admin_connect_wallet: "Connect your wallet to authenticate",

    admin_sign_to_auth: "Sign to Authenticate", admin_signing: "Waiting for signature…",

    admin_sign_desc: "Sign a message with your wallet to verify ownership.",

    admin_not_authorized: "Access Denied",

    admin_not_authorized_desc: "This wallet is not authorized. Admin access is restricted to the founder wallet.",

    admin_sig_expired: "Signature expired or invalid.", admin_sig_cancelled: "Signature cancelled.",

    admin_auth_error: "Authentication error. Try again.",

    admin_disconnect: "Disconnect",

    admin_total_aum: "Total AUM", admin_subscribers: "Subscribers", admin_indexes: "Indexes",

    admin_pending: "Pending", admin_proposals_label: "proposals",

    admin_fund_portfolio: "Fund Portfolio — SoDEX",

    admin_loading_portfolio: "Loading portfolio…", admin_loading_balances: "Loading balances…",

    admin_no_positions: "No positions found in fund wallet.",

    admin_total_value: "Total Value",

    admin_sodex_not_configured: "SoDEX credentials not configured. Set SODEX_API_KEY and SODEX_PRIVATE_KEY in .env",

    admin_fund_wallet_title: "Fund Wallet — Gas & USDC",

    admin_eth_gas: "ETH (gas)", admin_eth_critical: "⚠ Critical balance — replenish ETH!",

    admin_proposals_title: "Rebalance Proposals",

    admin_pending_badge: "{n} pending", admin_ready_badge: "{n} ready to execute",

    admin_run_rebalancer: "Run Rebalancer", admin_running: "Running…",
    admin_report_title: "Management Report", admin_report_close: "Close",
    admin_report_proposals_status: "Proposals by Status", admin_report_no_proposals: "No proposals yet",
    admin_report_indexes: "Indexes", admin_report_activity: "Recent Activity", admin_report_proposals_total: "Total Proposals",

    admin_approve: "Approve", admin_reject: "Reject", admin_execute: "Execute",

    admin_dry_run: "Dry Run", admin_no_proposals: "No rebalance proposals yet.",

    admin_no_proposals_sub: "Run the Rebalancer agent above to generate proposals.",

    admin_trades_title: "Trade History", admin_no_trades: "No trades found.",

    admin_loading_trades: "Loading trades…",

    admin_no_trades_sub: "Execute a rebalance proposal to see trades here.",

    admin_index_overview: "Index Overview",

    admin_investors: "{n} investors",

    admin_show_changes: "Show {n} changes", admin_hide_changes: "Hide changes",

    admin_executing: "Executing…",

    admin_nav_update: "Update NAV", admin_refreshing: "Refreshing…",

    admin_network_mainnet: "Mainnet", admin_network_testnet: "Testnet",

    home_footer: "Not financial advice. Built on SoSoValue ValueChain. Powered by SoDEX.",
    disclaimer: "SoSoMon is for informational purposes only. Not financial advice. Crypto assets involve significant risk of loss. Past performance does not guarantee future results.",
    intellectual_credit: "Intellectual creation of Khamalmoney Inc.",

    // Transparency

    transp_title: "On-Chain Auditability", transp_log: "Transparency Log",

    transp_sub: "Every AI agent decision and investor deposit is recorded with full data inputs. No black boxes.",

    transp_tab_decisions: "AI Decisions", transp_tab_deposits: "Deposits",

    transp_filter_all: "All agents", transp_no_decisions: "No decisions logged yet.",

    transp_no_deposits: "No deposits recorded yet.",

    transp_deposits_note: "Deposits are detected automatically on Base network.",

    transp_verifiable: "All deposits verifiable on Basescan. Sorted by most recent.",

    transp_data_inputs: "View data inputs →", transp_loading: "Loading…",

    transp_back: "← Back to home",

    transp_sentiment: "Sentiment Score Formula",

    transp_footer1: "SoSoMon operates as a custodial investment platform in beta. Not financial advice.",

    transp_footer2: "AI decisions are logged immutably. Deposits are verifiable on-chain.",

    transp_scout_desc: "Daily screening of 30+ tokens per theme. Uses CoinGecko market data + SoSoValue SSI constituents + Gemini AI rationale.",

    transp_rebalancer_desc: "Executes trades on SoDEX DEX based on Scout proposals. Applies sentiment-based stablecoin buffer.",

    transp_narrator_desc: "Generates daily market commentary using SoSoValue macro data, SSI performance, and portfolio context.",

    transp_monitor_desc: "Monitors Base network (chainId 8453) for USDC transfers to the fund wallet. Runs every 2 minutes.",

    // Index detail

    idx_nav_token: "NAV per Token", idx_btc: "vs BTC Alpha", idx_constituents: "Constituents",

    idx_weight: "Weight", idx_price: "Price", idx_7d: "7d",

    idx_fund_wallet: "Fund Wallet (Base Network)", idx_usdc_balance: "USDC Balance on Base",

    idx_send_instr: "Send USDC on Base to the address below. Your position is registered automatically after deposit is detected.",

    idx_invest: "Invest in this Index", idx_min_invest: "Minimum $5",

    idx_receive: "Receive index tokens · Withdraw anytime",

    idx_mgmt_fee: "Management fee", idx_perf_fee: "Performance fee", idx_protocol: "Protocol",

    idx_not_found: "Index not found.", idx_back: "← Back to Indexes",

    idx_last_rebalanced: "Last rebalanced", idx_subscribers: "Investors",

    // Withdraw

    wd_btn: "Withdraw", wd_title: "Withdraw from {index}",

    wd_deposited: "Deposited", wd_current: "Current Value", wd_pnl: "P&L",

    wd_amount_label: "Amount to withdraw (USD)", wd_available: "Available:",

    wd_min: "Minimum: $1", wd_exceeds: "Exceeds available balance",

    wd_preview_btn: "Preview withdrawal", wd_summary: "Withdrawal Summary",

    wd_cost_basis: "Cost basis", wd_current_val: "Current value withdrawn",

    wd_fees: "Fees", wd_mgmt_fee: "Management fee (0.75%/yr)",

    wd_perf_fee: "Performance fee (15%)", wd_gas: "Gas (Base Network)",

    wd_total_fees: "Total fees", wd_you_receive: "You will receive (estimated)",

    wd_usdc_wallet: "USDC to your wallet · Base network",

    wd_simulate: "Simulate (sandbox)", wd_execute: "Execute withdrawal →",

    wd_confirm_title: "Confirm Withdrawal", wd_confirm_from: "Withdraw from",

    wd_confirm_amount: "Amount", wd_confirm_to: "To wallet",

    wd_confirm_network: "Network", wd_confirm_token: "Token",

    wd_irreversible: "This action is irreversible. Once submitted, the transaction cannot be cancelled.",

    wd_processing: "Sending transaction to Base blockchain… Do not close this window.",

    wd_success: "Withdrawal sent!", wd_usdc_sent: "USDC sent to your wallet",

    wd_realized_pnl: "Realized P&L", wd_simulated: "Simulation complete",

    wd_no_tx: "No transaction was sent to the blockchain.",

    wd_system_checks: "System checks", wd_failed: "Withdrawal failed",

    wd_risks: "Systemic risks identified ↓",

    wd_back_confirm: "← Back", wd_cancel: "Cancel",

    // Session guard

    sess_expiring: "Session expiring",

    sess_msg: "For security, your session will end due to inactivity in:",

    sess_continue: "Stay connected", sess_disconnect: "Disconnect now",

    sess_hint: "Any page interaction automatically extends the session.",

    // Activity feed

    activity_empty: "No recent agent activity.",
    act_deposit: "Deposit", act_deposit_ok: "Deposit of ${amount} USDC from {wallet}",
    act_refund: "Refund below minimum", act_refund_sent: "Refund sent to {wallet}",
    act_refund_failed: "Refund FAILED for {wallet}", act_refund_pending: "Refund pending for {wallet}",
    act_withdrawal: "Withdrawal of ${amount} USDC",
    act_manual: "Manual credit of ${amount} USDC",
    act_min: "Minimum",

    // Macro widget

    macro_sentiment: "SoSoValue Sentiment", macro_fear: "Fear", macro_greed: "Greed",

    macro_stance: "AI Macro Stance", macro_flows: "Sector Flows (7d)",

    // Performance panel

    perf_loading: "Loading performance data…", perf_no_data: "No data available.",

    perf_total_return: "Total Return", perf_30d: "30d Return",

    perf_max_drawdown: "Max Drawdown", perf_stablecoin: "Stablecoin Buffer",

    perf_since_inception: "since inception", perf_trailing: "trailing 30 days",

    perf_nav_chart: "NAV Performance", perf_allocation: "Portfolio Allocation",

    perf_rebalance_history: "Rebalance History", perf_my_deposits: "My Deposits",

    perf_rebalanced: "Rebalanced",

    // What's New

    wn_wave2_label: "Wave 2 · Jun 2026", wn_wave1_label: "Wave 1 · May 2026",

    wn_roadmap: "Roadmap (post Wave 2)", wn_link_transparency: "View Transparency Log",

    wn_link_indexes: "Browse Indexes", wn_link_dashboard: "My Dashboard",

    wn_toggle_free: "Full flow testable at no cost",

    wn_toggle_eval: "Evaluators can test freely",

    wn_toggle_safe: "No risk of losing real funds",

    // Dashboard extra

    dash_connect_wallet: "Connect Your Wallet",

    dash_connect_desc: "Connect your wallet to view your portfolio, AI activity, and macro data.",

    dash_browse_no_connect: "Browse indexes without connecting →",

    dash_add_another: "Add another index to your portfolio?",

    dash_loading: "Loading portfolio…",

    dash_days_invested: "days invested",

    // Risk items (InvestButton)

    risk_volatility_label: "Extreme volatility risk",

    risk_volatility_text: "Crypto assets can vary 20–50% in a few days. You may lose part or all of the invested value.",

    risk_no_guarantee_label: "No return guarantee",

    risk_no_guarantee_text: "Past performance does not guarantee future results. AI agents may make decisions that result in losses.",

    risk_no_insurance_label: "No deposit insurance",

    risk_no_insurance_text: "Unlike traditional banks, there is no equivalent FGC/FDIC protection. In case of technical failure, losses are permanent.",

    risk_custody_label: "Custody risk",

    risk_custody_text: "Assets are held in an on-chain wallet. Compromise of admin keys may result in irreversible loss of funds.",

    risk_regulatory_label: "Regulatory risk",

    risk_regulatory_text: "Regulatory changes may restrict DeFi operations, limit withdrawals, or require position closure.",

    risk_network_label: "Network risk",

    risk_network_text: "Base network failures or congestion may temporarily prevent access to or withdrawal of funds.",

    risk_no_legal_label: "No traditional legal recourse",

    risk_no_legal_text: "DeFi operations function outside the regulated financial system. Disputes cannot be resolved by traditional means.",

    risk_ai_label: "AI strategy risk",

    risk_ai_text: "The portfolio is managed by AI algorithms. Performance is not guaranteed and may be unpredictable in adverse market conditions.",

    // What's New — Wave 1 items

    wn1_agents_title: "3 AI Agents launched",

    wn1_agents_desc: "Scout (daily token screening), Rebalancer (SoDEX execution), Narrator (market commentary) — all integrated with SoSoValue macro data.",

    wn1_indexes_title: "3 Thematic Indexes",

    wn1_indexes_desc: "AI×Crypto, RWA, and DePIN — each with its own token universe, NAV calculation and AI-generated rationale per constituent.",

    wn1_ssv_api_title: "SoSoValue API Integration",

    wn1_ssv_api_desc: "Real-time SSI index constituents, macro sentiment score, fear/greed index, thematic news, and benchmark performance data.",

    wn1_sodex_title: "SoDEX DEX Integration",

    wn1_sodex_desc: "Live market data (tickers, candles, orderbook) from SoDEX mainnet. Authenticated API with EIP-712 signed requests.",

    wn1_dashboard_title: "Investor Dashboard",

    wn1_dashboard_desc: "Per-wallet portfolio view with P&L, 30d return, high-water mark, accrued performance fees, and AI activity feed.",

    wn1_admin_title: "Admin Panel (wallet-gated)",

    wn1_admin_desc: "EIP-191 wallet signature authentication. Exclusive access to 0x1a3A…031c for proposal review and rebalancer control.",

    // What's New — Wave 2 items

    wn2_deposit_title: "Real On-Chain Deposit Detection",

    wn2_deposit_desc: "Deposit monitor polls Base network (chainId 8453) via eth_getLogs every 2 minutes. Each investor is identified by their sending wallet address — no manual registration needed.",

    wn2_trade_title: "Real SoDEX Trade Execution",

    wn2_trade_desc: "Rebalancer now submits live limit orders to SoDEX mainnet via the authenticated REST API. Dry-run mode available for safety. Execution logs stored with order IDs.",

    wn2_transparency_title: "Public Transparency Page",

    wn2_transparency_desc: "Every AI decision is logged with full data inputs (sentiment score, benchmark, news context). Every deposit is listed with tx_hash verifiable on Basescan.",

    wn2_sentiment_title: "Sentiment Score Formula Disclosed",

    wn2_sentiment_desc: "The 0–100 sentiment score formula is now public: 40% SoSoValue Fear & Greed + 25% BTC 30d momentum + 20% theme SSI ROI + 15% altcoin breadth.",

    wn2_gemini_title: "Gemini 2.0 Flash AI Rationale",

    wn2_gemini_desc: "Scout agent upgraded to Gemini 2.0 Flash for token rationale generation. Prompts include real SoSoValue benchmark data, news signals, and SoDEX on-chain price.",

    wn2_narrator_title: "Narrator cites SSI Components",

    wn2_narrator_desc: "Daily commentary now references specific SoSoValue SSI index movements that drove each rebalance decision — not generic text.",

    wn2_admin_rebal_title: "Admin: Run Rebalancer & Execute Proposals",

    wn2_admin_rebal_desc: "Admin panel now has buttons to manually trigger the rebalancer and execute individual proposals against SoDEX. Supports dry-run mode.",

    wn2_admin_portfolio_title: "SoDEX Portfolio & Trade History in Admin",

    wn2_admin_portfolio_desc: "Admin panel shows live SoDEX account balances, open positions, and full trade history with side, price, quantity, and fee columns.",

    wn2_admin_lock_title: "Admin Access Hard-Locked",

    wn2_admin_lock_desc: "Backend restricts admin panel to a single authorized wallet. Any other wallet receives HTTP 403 even with a valid EIP-191 signature.",

    wn2_withdrawal_title: "Automatic On-Chain Withdrawal",

    wn2_withdrawal_desc: "Investors can withdraw at any time. The system calculates management fee (0.75%/yr pro-rata), performance fee (15% on profits above HWM), and gas (~$0.01 on Base ETH). USDC is sent directly to the investor wallet on Base network — no manual processing.",

    wn2_sandbox_title: "Withdrawal Sandbox (Simulate mode)",

    wn2_sandbox_desc: "Before any real withdrawal, investors can run a full simulation: the system checks fund wallet USDC balance, ETH gas balance, builds and signs the transaction — but does not broadcast. All internal checks are shown with pass/fail status.",

    wn2_eip191_title: "EIP-191 Risk Disclosure — Wallet-Signed Term",

    wn2_eip191_desc: "Before any investment, the investor must individually acknowledge 8 specific risk items and sign a legally-structured risk disclosure using their wallet (EIP-191 personal sign). Signature, timestamp, and signed message are permanently recorded on the database.",

    wn2_routing_title: "Index-Linked Deposits — Protected Routing",

    wn2_routing_desc: "Each deposit is pre-linked to the investor's chosen index via a signed intent registered at the moment of investment. Only deposits originating from the authenticated wallet are credited. Deposits from unknown addresses are retained as admin reserve and logged with full Basescan traceability.",

    wn2_session_title: "Session Timeout — 30-Minute Inactivity Lock",

    wn2_session_desc: "Following financial platform security standards (Binance, Nubank), the session automatically disconnects after 30 minutes of inactivity. A countdown warning appears 5 minutes before expiry, allowing the investor to extend the session.",

    wn2_toggle_title: "Mainnet / Testnet Toggle",

    wn2_toggle_desc: "The entire platform can switch between Base Mainnet (real USDC) and Base Sepolia Testnet (test USDC) via a single environment variable. In testnet mode, a prominent orange banner is shown across all pages and MetaMask is guided to switch to Base Sepolia automatically.",

    // Coming Soon

    wn_cs_backup: "Daily DB backup automation",

    wn_cs_notifications: "Multi-index subscriber notifications via email/webhook",

    wn_cs_escrow: "Smart contract escrow for non-custodial deposits",

    wn_cs_multiwallet: "Multi-wallet support per investor",
    wn_api_ssv_badge: "INTEGRATED",
    wn_api_ssv_desc: "Market intelligence layer — all macro context, sentiment and price data feeding the AI agents come from SoSoValue endpoints.",
    wn_api_ssv_fn1: "SSI indexes + global Fear & Greed sentiment",
    wn_api_ssv_fn2: "AI-driven stablecoin buffer sizing (5%–30% USDC)",
    wn_api_ssv_fn3: "real-time NAV calculation for 3 thematic indexes",
    wn_api_ssv_fn4: "DeFi / AI Crypto / RWA sector performance",
    wn_api_sdx_badge: "INTEGRATED",
    wn_api_sdx_desc: "Execution layer — portfolio reads and all rebalance trades are routed through SoDEX; no other DEX dependency exists.",
    wn_api_sdx_fn1: "live token balances + USD weights per index",
    wn_api_sdx_fn2: "EIP-712 signed orders → on-chain settlement",
    wn_api_sdx_fn3: "available pairs for Scout agent token screening",
    wn_api_sdx_fn4: "full audit trail shown in Transparency dashboard",

    // InvestButton extended

    invest_read_warning: "Read carefully before investing",

    invest_warning_text: "This is a high-risk crypto investment product managed by AI agents. It is not regulated by traditional financial authorities. Check each item confirming you understood the corresponding risk.",

    invest_items_confirmed: "{n}/{total} items confirmed",

    invest_sign_note: "The signature is done locally in your wallet (EIP-191). No transaction is sent at this step.",

    invest_term_signed_title: "Term signed with your wallet",

    invest_term_signed_desc: "Your consent and deposit intent for this index are registered.",

    invest_minimum_title: "Minimum deposit: $5 USDC",

    invest_minimum_desc: "Deposits below $5 are automatically refunded to your wallet.",

    invest_testnet_warn: "TESTNET — Use test USDC (no real value)",

    invest_your_wallet: "Your wallet (sender)",

    invest_wallet_note: "Only deposits from this wallet will be credited.",
    invest_wallet_alert: "Send USDC only from the wallet shown above. Deposits from a different address will be credited to that address — not to your account here.",

    invest_send_to: "Send USDC to this address",

    invest_copied: "Copied!", invest_copy: "Copy",

    invest_fund_balance: "Fund balance:",

    invest_wallet_error: "Error loading fund address. Try again.",

    invest_usdc_contract: "USDC Contract",

    invest_how_works: "How it works",

    invest_step1_testnet: "Send test USDC (Base Sepolia) from your connected wallet",

    invest_step1_mainnet: "Send USDC from your connected wallet on Base network",

    invest_step2: "Your portfolio is credited automatically in 2–3 min",

    invest_step3: "Tokens issued at current NAV: ${nav} per token",

    invest_mgmt_fee_label: "Management fee", invest_mgmt_fee_val: "0.75% / year",

    invest_perf_fee_label: "Performance fee", invest_perf_fee_val: "15% on profits",

    invest_pending_title: "Transaction in progress",

    invest_summary_index: "Index", invest_summary_network: "Network",

    invest_summary_wallet: "Your wallet", invest_summary_nav: "Current NAV",

    invest_summary_term: "Signed term",

    invest_view_dashboard: "View Dashboard →", invest_close: "Close",

    invest_error_rejected: "Signature cancelled by user.",

    invest_error_generic: "Error signing. Please try again.",

  },

  pt: {

    nav_indexes: "Índices", nav_transparency: "Transparência", nav_whats_new: "Novidades",

    nav_dashboard: "Painel", nav_mainnet: "Mainnet", nav_testnet: "Testnet",

    testnet_banner: "MODO TESTNET — Base Sepolia — USDC de teste, sem valor real",
    mainnet_banner: "MAINNET — Base Mainnet — USDC real",

    dash_title: "Meu Portfólio", dash_connected: "Conectado:",

    dash_total_value: "Valor Total", dash_total_deposited: "Total Depositado",

    dash_30d: "Retorno 30D", dash_fee: "Taxa Perf. Acumulada",

    dash_alltime: "total", dash_across: "em {n} índices",

    dash_wavg: "média ponderada", dash_hwm: "15% sobre lucros acima do HWM",

    dash_empty: "Nenhum investimento ativo ainda.", dash_browse: "Ver Índices",

    tab_portfolio: "Portfólio", tab_performance: "Desempenho",

    tab_activity: "Atividade IA", tab_macro: "Macro", tab_movements: "Movimentações",

    dash_refund_title: "Depósito estornado automaticamente",
    mov_deposit: "Depósito", mov_refund: "Estorno", mov_withdrawal: "Saque", mov_manual: "Crédito Manual",
    mov_empty: "Nenhuma movimentação encontrada.", mov_index: "Índice", mov_tx: "Hash TX", mov_refund_tx: "TX Estorno",
    mov_status_ok: "Enviado", mov_status_failed: "Falhou", mov_status_pending: "Pendente",
    mov_below_min: "Abaixo do depósito mínimo de",

    invest_btn: "Depositar & Investir", invest_connect: "Conectar Carteira para Investir",

    invest_title: "Termo de Risco — {index}",

    invest_signed: "Termo Assinado — Realize o Depósito",

    invest_waiting: "Aguardando Confirmação",

    invest_allcheck: "Todos os riscos confirmados. Assine para continuar.",

    invest_sign: "Assinar Termo de Risco", invest_signing: "Assinando…",

    invest_sent: "Já enviei o USDC →", invest_min: "Mínimo: $5 USDC",

    invest_pending: "Seu depósito aparecerá no painel em 2–3 min após confirmação on-chain.",

    idx_title: "Todos os Índices",

    idx_sub: "Portfólios temáticos gerenciados por IA. Rebalanceados por agentes, verificados na SoSoValue ValueChain.",

    idx_aum: "AUM", idx_nav: "NAV", idx_30d: "Retorno 30d", idx_alltime: "Histórico",

    idx_loading: "Carregando índices…",

    net_wrong: "Rede Incorreta", net_msg: "SoSoMon funciona na {net}. Troque para continuar.",

    net_btn: "Trocar para {net}", net_switching: "Trocando…",

    wn_title: "Novidades", wn_subtitle: "Wave 1 estabeleceu a base. Wave 2 torna real — depósitos on-chain, trades ao vivo, total transparência.",

    home_badge: "Construído na SoSoValue ValueChain · Powered by SoDEX",

    home_h1a: "Índices temáticos.", home_h1b: "Gerenciados por IA.", home_h1c: "Verificados on-chain.",

    home_sub: "SoSoMon usa agentes de IA que selecionam, rebalanceiam e reportam sobre índices temáticos de criptoativos — gestão de portfólio de qualidade institucional, totalmente automatizada na SoSoValue ValueChain.",

    home_explore: "Explorar Índices", home_how: "Como Funciona",

    home_aum: "AUM Total", home_indexes: "Índices Ativos", home_subs: "Investidores", home_avg30d: "Retorno Médio 30d",

    home_active: "Índices Ativos", home_viewall: "Ver todos",

    home_hiw_title: "Uma pessoa. Três agentes de IA.",

    home_hiw_sub: "SoSoMon funciona inteiramente com agentes de IA operando na SoSoValue ValueChain. Os agentes cuidam de tudo.",

    home_scout_role: "Pesquisa & Seleção",

    home_scout_desc: "Varre mais de 400 tokens diariamente usando feeds de dados da SoSoValue e dados de mercado do SoDEX. Gera listas de inclusão ranqueadas com justificativa gerada por IA.",

    home_rebal_role: "Manutenção de Portfólio",

    home_rebal_desc: "Monitora desvios, índice de sentimento e liquidez. Propõe rebalanceamento semanal ou quando gatilhos de risco são acionados. Executa ordens no SoDEX.",

    home_narrator_role: "Conteúdo & Relatórios",

    home_narrator_desc: "Gera automaticamente o Alpha Memo semanal, threads e resumos para investidores a partir dos dados dos agentes. Transparência total, sem rodeios.",

    admin_title: "Acesso Admin", admin_subtitle: "Painel do Fundador SoSoMon",

    admin_connect_wallet: "Conecte sua carteira para autenticar",

    admin_sign_to_auth: "Assinar para Autenticar", admin_signing: "Aguardando assinatura…",

    admin_sign_desc: "Assine uma mensagem com sua carteira para verificar a propriedade.",

    admin_not_authorized: "Acesso Negado",

    admin_not_authorized_desc: "Esta carteira não tem autorização. O acesso admin é restrito à carteira do fundador.",

    admin_sig_expired: "Assinatura expirada ou inválida.", admin_sig_cancelled: "Assinatura cancelada.",

    admin_auth_error: "Erro ao autenticar. Tente novamente.",

    admin_disconnect: "Desconectar",

    admin_total_aum: "AUM Total", admin_subscribers: "Investidores", admin_indexes: "Índices",

    admin_pending: "Pendentes", admin_proposals_label: "propostas",

    admin_fund_portfolio: "Portfólio do Fundo — SoDEX",

    admin_loading_portfolio: "Carregando portfólio…", admin_loading_balances: "Carregando saldos…",

    admin_no_positions: "Nenhuma posição encontrada na carteira do fundo.",

    admin_total_value: "Valor Total",

    admin_sodex_not_configured: "Credenciais SoDEX não configuradas. Defina SODEX_API_KEY e SODEX_PRIVATE_KEY no .env",

    admin_fund_wallet_title: "Carteira do Fundo — Gas & USDC",

    admin_eth_gas: "ETH (gas)", admin_eth_critical: "⚠ Saldo crítico — reponha ETH!",

    admin_proposals_title: "Propostas de Rebalanceamento",

    admin_pending_badge: "{n} pendentes", admin_ready_badge: "{n} prontas para executar",

    admin_run_rebalancer: "Executar Rebalancer", admin_running: "Executando…",
    admin_report_title: "Relatório Gerencial", admin_report_close: "Fechar",
    admin_report_proposals_status: "Propostas por Status", admin_report_no_proposals: "Nenhuma proposta ainda",
    admin_report_indexes: "Índices", admin_report_activity: "Atividade Recente", admin_report_proposals_total: "Propostas Total",

    admin_approve: "Aprovar", admin_reject: "Rejeitar", admin_execute: "Executar",

    admin_dry_run: "Simulação", admin_no_proposals: "Nenhuma proposta de rebalanceamento ainda.",

    admin_no_proposals_sub: "Execute o agente Rebalancer acima para gerar propostas.",

    admin_trades_title: "Histórico de Trades", admin_no_trades: "Nenhum trade encontrado.",

    admin_loading_trades: "Carregando trades…",

    admin_no_trades_sub: "Execute uma proposta de rebalanceamento para ver trades aqui.",

    admin_index_overview: "Visão Geral dos Índices",

    admin_investors: "{n} investidores",

    admin_show_changes: "Mostrar {n} mudanças", admin_hide_changes: "Ocultar mudanças",

    admin_executing: "Executando…",

    admin_nav_update: "Atualizar NAV", admin_refreshing: "Atualizando…",

    admin_network_mainnet: "Mainnet", admin_network_testnet: "Testnet",

    home_footer: "Não é conselho financeiro. Construído na SoSoValue ValueChain. Powered by SoDEX.",
    disclaimer: "SoSoMon é apenas para fins informativos. Não é consultoria financeira. Ativos cripto envolvem riscos significativos de perda. Desempenho passado não garante resultados futuros.",
    intellectual_credit: "Criação intelectual de Khamalmoney Inc.",

    transp_title: "Auditabilidade On-Chain", transp_log: "Log de Transparência",

    transp_sub: "Toda decisão dos agentes de IA e cada depósito de investidor são registrados com todos os dados de entrada. Sem caixa preta.",

    transp_tab_decisions: "Decisões IA", transp_tab_deposits: "Depósitos",

    transp_filter_all: "Todos os agentes", transp_no_decisions: "Nenhuma decisão registrada ainda.",

    transp_no_deposits: "Nenhum depósito registrado ainda.",

    transp_deposits_note: "Depósitos são detectados automaticamente na rede Base.",

    transp_verifiable: "Todos os depósitos verificáveis no Basescan. Ordenados pelo mais recente.",

    transp_data_inputs: "Ver dados de entrada →", transp_loading: "Carregando…",

    transp_back: "← Voltar ao início",

    transp_sentiment: "Fórmula do Índice de Sentimento",

    transp_footer1: "SoSoMon opera como plataforma custodial de investimento em beta. Não é conselho financeiro.",

    transp_footer2: "Decisões dos agentes são registradas de forma imutável. Depósitos são verificáveis on-chain.",

    transp_scout_desc: "Triagem diária de 30+ tokens por tema. Usa dados do CoinGecko + constituintes SSI da SoSoValue + justificativa por IA Gemini.",

    transp_rebalancer_desc: "Executa trades na SoDEX DEX baseado nas propostas do Scout. Aplica buffer de stablecoin baseado em sentimento.",

    transp_narrator_desc: "Gera comentários de mercado diários usando dados macro da SoSoValue, desempenho SSI e contexto do portfólio.",

    transp_monitor_desc: "Monitora a rede Base (chainId 8453) por transferências USDC para a fund wallet. Roda a cada 2 minutos.",

    idx_nav_token: "NAV por Token", idx_btc: "Alpha vs BTC", idx_constituents: "Constituintes",

    idx_weight: "Peso", idx_price: "Preço", idx_7d: "7d",

    idx_fund_wallet: "Fund Wallet (Rede Base)", idx_usdc_balance: "Saldo USDC na Base",

    idx_send_instr: "Envie USDC na rede Base para o endereço abaixo. Sua posição é registrada automaticamente após o depósito ser detectado.",

    idx_invest: "Investir neste Índice", idx_min_invest: "Mínimo $5",

    idx_receive: "Receba tokens do índice · Saque a qualquer momento",

    idx_mgmt_fee: "Taxa de gestão", idx_perf_fee: "Taxa de performance", idx_protocol: "Protocolo",

    idx_not_found: "Índice não encontrado.", idx_back: "← Voltar aos Índices",

    idx_last_rebalanced: "Último rebalanceamento", idx_subscribers: "Investidores",

    wd_btn: "Sacar", wd_title: "Sacar de {index}",

    wd_deposited: "Depositado", wd_current: "Valor Atual", wd_pnl: "P&L",

    wd_amount_label: "Valor a sacar (USD)", wd_available: "Disponível:",

    wd_min: "Mínimo: $1", wd_exceeds: "Excede o saldo disponível",

    wd_preview_btn: "Pré-visualizar saque", wd_summary: "Resumo do Saque",

    wd_cost_basis: "Custo de aquisição", wd_current_val: "Valor atual sacado",

    wd_fees: "Taxas", wd_mgmt_fee: "Taxa de gestão (0,75%/ano)",

    wd_perf_fee: "Taxa de performance (15%)", wd_gas: "Gas (rede Base)",

    wd_total_fees: "Total de taxas", wd_you_receive: "Você receberá (estimado)",

    wd_usdc_wallet: "USDC na sua carteira · rede Base",

    wd_simulate: "Simular (sandbox)", wd_execute: "Executar saque →",

    wd_confirm_title: "Confirmar Saque", wd_confirm_from: "Sacar de",

    wd_confirm_amount: "Valor solicitado", wd_confirm_to: "Para carteira",

    wd_confirm_network: "Rede", wd_confirm_token: "Token",

    wd_irreversible: "Esta ação é irreversível. Uma vez enviada, a transação não pode ser cancelada.",

    wd_processing: "Enviando transação para a blockchain Base… Não feche esta janela.",

    wd_success: "Saque enviado!", wd_usdc_sent: "USDC enviados para sua carteira",

    wd_realized_pnl: "P&L realizado", wd_simulated: "Simulação concluída",

    wd_no_tx: "Nenhuma transação foi enviada para a blockchain.",

    wd_system_checks: "Verificações do sistema", wd_failed: "Falha no saque",

    wd_risks: "Riscos sistêmicos identificados ↓",

    wd_back_confirm: "← Voltar", wd_cancel: "Cancelar",

    sess_expiring: "Sessão expirando",

    sess_msg: "Por segurança, sua sessão será encerrada por inatividade em:",

    sess_continue: "Continuar conectado", sess_disconnect: "Desconectar agora",

    sess_hint: "Qualquer interação na página estende a sessão automaticamente.",

    activity_empty: "Nenhuma atividade recente dos agentes.",
    act_deposit: "Depósito", act_deposit_ok: "Depósito de ${amount} USDC de {wallet}",
    act_refund: "Abaixo do mínimo", act_refund_sent: "Estorno enviado para {wallet}",
    act_refund_failed: "Estorno FALHOU para {wallet}", act_refund_pending: "Estorno pendente para {wallet}",
    act_withdrawal: "Saque de ${amount} USDC",
    act_manual: "Crédito manual de ${amount} USDC",
    act_min: "Mínimo",

    macro_sentiment: "Sentimento SoSoValue", macro_fear: "Medo", macro_greed: "Ganância",

    macro_stance: "Postura Macro da IA", macro_flows: "Fluxos do Setor (7d)",

    perf_loading: "Carregando dados de desempenho…", perf_no_data: "Sem dados disponíveis.",

    perf_total_return: "Retorno Total", perf_30d: "Retorno 30d",

    perf_max_drawdown: "Drawdown Máximo", perf_stablecoin: "Buffer Stablecoin",

    perf_since_inception: "desde o início", perf_trailing: "últimos 30 dias",

    perf_nav_chart: "Desempenho do NAV", perf_allocation: "Alocação do Portfólio",

    perf_rebalance_history: "Histórico de Rebalanceamentos", perf_my_deposits: "Meus Depósitos",

    perf_rebalanced: "Rebalanceado",

    wn_wave2_label: "Wave 2 · Jun 2026", wn_wave1_label: "Wave 1 · Mai 2026",

    wn_roadmap: "Roadmap (pós Wave 2)", wn_link_transparency: "Ver Log de Transparência",

    wn_link_indexes: "Ver Índices", wn_link_dashboard: "Meu Painel",

    wn_toggle_free: "Fluxo completo testável sem custo",

    wn_toggle_eval: "Avaliadores podem testar livremente",

    wn_toggle_safe: "Sem risco de perda de fundos reais",

    dash_connect_wallet: "Conecte sua Carteira",

    dash_connect_desc: "Conecte sua carteira para ver seu portfólio, atividade da IA e dados macro.",

    dash_browse_no_connect: "Explorar índices sem conectar →",

    dash_add_another: "Adicionar outro índice ao portfólio?",

    dash_loading: "Carregando portfólio…",

    dash_days_invested: "dias investido",

    risk_volatility_label: "Risco de volatilidade extrema",

    risk_volatility_text: "Criptoativos podem variar 20–50% em poucos dias. Você pode perder parte ou todo o valor investido.",

    risk_no_guarantee_label: "Sem garantia de retorno",

    risk_no_guarantee_text: "Rentabilidade passada não garante resultados futuros. Os agentes de IA podem tomar decisões que resultem em perdas.",

    risk_no_insurance_label: "Sem seguro de depósito",

    risk_no_insurance_text: "Diferente de bancos tradicionais, não há proteção equivalente ao FGC/FDIC. Em caso de falha técnica, as perdas são permanentes.",

    risk_custody_label: "Risco de custódia",

    risk_custody_text: "Os ativos são mantidos em carteira on-chain. O comprometimento das chaves de administração pode resultar em perda irreversível de fundos.",

    risk_regulatory_label: "Risco regulatório",

    risk_regulatory_text: "Mudanças regulatórias podem restringir operações DeFi, limitar saques ou exigir encerramento de posições.",

    risk_network_label: "Risco de rede",

    risk_network_text: "Falhas na rede Base ou congestionamento podem impedir temporariamente o acesso ou saque dos fundos.",

    risk_no_legal_label: "Sem recurso legal tradicional",

    risk_no_legal_text: "Operações DeFi funcionam fora do sistema financeiro regulado. Disputas não podem ser resolvidas por meios tradicionais.",

    risk_ai_label: "Risco de estratégia de IA",

    risk_ai_text: "O portfólio é gerenciado por algoritmos de IA. O desempenho não é garantido e pode ser imprevisível em condições de mercado adversas.",

    // What's New — Wave 1 items

    wn1_agents_title: "3 Agentes de IA lançados",

    wn1_agents_desc: "Scout (triagem diária de tokens), Rebalancer (execução no SoDEX), Narrator (comentário de mercado) — todos integrados com dados macro da SoSoValue.",

    wn1_indexes_title: "3 Índices Temáticos",

    wn1_indexes_desc: "AI×Crypto, RWA e DePIN — cada um com seu universo de tokens, cálculo de NAV e justificativa gerada por IA por constituinte.",

    wn1_ssv_api_title: "Integração API SoSoValue",

    wn1_ssv_api_desc: "Constituintes do índice SSI em tempo real, score de sentimento macro, índice de medo/ganância, notícias temáticas e dados de desempenho benchmark.",

    wn1_sodex_title: "Integração SoDEX DEX",

    wn1_sodex_desc: "Dados de mercado ao vivo (tickers, candles, orderbook) do mainnet SoDEX. API autenticada com requisições assinadas EIP-712.",

    wn1_dashboard_title: "Painel do Investidor",

    wn1_dashboard_desc: "Visão do portfólio por carteira com P&L, retorno 30d, high-water mark, taxas de performance acumuladas e feed de atividade da IA.",

    wn1_admin_title: "Painel Admin (restrito por carteira)",

    wn1_admin_desc: "Autenticação por assinatura de carteira EIP-191. Acesso exclusivo para 0x1a3A…031c para revisão de propostas e controle do rebalanceador.",

    // What's New — Wave 2 items

    wn2_deposit_title: "Detecção de Depósito On-Chain Real",

    wn2_deposit_desc: "O monitor de depósitos consulta a rede Base (chainId 8453) via eth_getLogs a cada 2 minutos. Cada investidor é identificado pelo endereço de envio — sem cadastro manual.",

    wn2_trade_title: "Execução Real de Trades no SoDEX",

    wn2_trade_desc: "O Rebalancer envia ordens limit ao vivo no mainnet SoDEX via API REST autenticada. Modo dry-run disponível para segurança. Logs de execução armazenados com IDs de ordem.",

    wn2_transparency_title: "Página de Transparência Pública",

    wn2_transparency_desc: "Cada decisão da IA é registrada com todos os dados de entrada (score de sentimento, benchmark, contexto de notícias). Cada depósito é listado com tx_hash verificável no Basescan.",

    wn2_sentiment_title: "Fórmula do Score de Sentimento Divulgada",

    wn2_sentiment_desc: "A fórmula do score 0–100 é agora pública: 40% SoSoValue Fear & Greed + 25% momentum BTC 30d + 20% ROI SSI do tema + 15% amplitude do mercado altcoin.",

    wn2_gemini_title: "Gemini 2.0 Flash AI Rationale",

    wn2_gemini_desc: "Agente Scout atualizado para Gemini 2.0 Flash na geração de justificativas. Prompts incluem dados reais de benchmark SoSoValue, sinais de notícias e preço on-chain do SoDEX.",

    wn2_narrator_title: "Narrator cita Componentes SSI",

    wn2_narrator_desc: "O comentário diário agora referencia movimentos específicos do índice SSI da SoSoValue que motivaram cada rebalanceamento — sem texto genérico.",

    wn2_admin_rebal_title: "Admin: Executar Rebalancer e Propostas",

    wn2_admin_rebal_desc: "O painel admin tem botões para acionar manualmente o rebalanceador e executar propostas individuais contra o SoDEX. Suporta modo dry-run.",

    wn2_admin_portfolio_title: "Portfólio SoDEX e Histórico de Trades no Admin",

    wn2_admin_portfolio_desc: "O painel admin exibe saldos ao vivo da conta SoDEX, posições abertas e histórico completo de trades com colunas de lado, preço, quantidade e taxa.",

    wn2_admin_lock_title: "Acesso Admin Bloqueado",

    wn2_admin_lock_desc: "O backend restringe o painel admin a uma única carteira autorizada. Qualquer outra carteira recebe HTTP 403 mesmo com assinatura EIP-191 válida.",

    wn2_withdrawal_title: "Saque Automático On-Chain",

    wn2_withdrawal_desc: "Investidores podem sacar a qualquer momento. O sistema calcula taxa de gestão (0,75%/ano pro-rata), taxa de performance (15% sobre lucros acima do HWM) e gas (~$0,01 na rede Base ETH). USDC enviado diretamente para a carteira do investidor — sem processamento manual.",

    wn2_sandbox_title: "Sandbox de Saque (modo Simulate)",

    wn2_sandbox_desc: "Antes de qualquer saque real, investidores rodam uma simulação completa: o sistema verifica saldo USDC, saldo ETH para gas, constrói e assina a transação — mas não transmite. Todas as verificações internas são exibidas com status passou/falhou.",

    wn2_eip191_title: "Termo de Risco EIP-191 — Assinado pela Carteira",

    wn2_eip191_desc: "Antes de qualquer investimento, o investidor confirma 8 itens de risco e assina um termo estruturado com sua carteira (EIP-191 personal sign). Assinatura, timestamp e mensagem assinada são registrados permanentemente no banco de dados.",

    wn2_routing_title: "Depósitos Vinculados ao Índice — Roteamento Protegido",

    wn2_routing_desc: "Cada depósito é pré-vinculado ao índice escolhido via intenção assinada registrada no momento do investimento. Apenas depósitos da carteira autenticada são creditados. Depósitos de endereços desconhecidos são retidos como reserva admin com rastreabilidade completa no Basescan.",

    wn2_session_title: "Timeout de Sessão — Bloqueio por Inatividade de 30 Minutos",

    wn2_session_desc: "Seguindo padrões de segurança de plataformas financeiras (Binance, Nubank), a sessão desconecta automaticamente após 30 minutos de inatividade. Um aviso de contagem regressiva aparece 5 minutos antes.",

    wn2_toggle_title: "Toggle Mainnet / Testnet",

    wn2_toggle_desc: "A plataforma inteira pode alternar entre Base Mainnet (USDC real) e Base Sepolia Testnet (USDC de teste) via uma única variável de ambiente. No modo testnet, um banner laranja aparece em todas as páginas e o MetaMask é guiado automaticamente para a rede correta.",

    // Coming Soon

    wn_cs_backup: "Automação de backup diário do banco de dados",

    wn_cs_notifications: "Notificações multi-índice por email/webhook",

    wn_cs_escrow: "Smart contract escrow para depósitos não-custodiais",

    wn_cs_multiwallet: "Suporte a múltiplas carteiras por investidor",
    wn_api_ssv_badge: "INTEGRADA",
    wn_api_ssv_desc: "Camada de inteligência de mercado — todo contexto macro, sentimento e preço que alimenta os agentes de IA vem dos endpoints da SoSoValue.",
    wn_api_ssv_fn1: "índices SSI + sentimento global Fear & Greed",
    wn_api_ssv_fn2: "dimensionamento do buffer de stablecoin por IA (5%–30% USDC)",
    wn_api_ssv_fn3: "cálculo de NAV em tempo real para 3 índices temáticos",
    wn_api_ssv_fn4: "performance setorial DeFi / AI Crypto / RWA",
    wn_api_sdx_badge: "INTEGRADA",
    wn_api_sdx_desc: "Camada de execução — leituras de portfólio e todos os trades de rebalanceamento passam pela SoDEX; sem dependência de outra DEX.",
    wn_api_sdx_fn1: "saldos de tokens em tempo real + pesos USD por índice",
    wn_api_sdx_fn2: "ordens assinadas EIP-712 → liquidação on-chain",
    wn_api_sdx_fn3: "pares disponíveis para triagem de tokens pelo agente Scout",
    wn_api_sdx_fn4: "trilha completa de auditoria no painel de Transparência",

    // InvestButton extended

    invest_read_warning: "Leia com atenção antes de investir",

    invest_warning_text: "Este é um produto de investimento em criptoativos de alto risco, gerenciado por agentes de inteligência artificial. Não é regulamentado por órgãos financeiros tradicionais. Marque cada item confirmando que entendeu o risco correspondente.",

    invest_items_confirmed: "{n}/{total} itens confirmados",

    invest_sign_note: "A assinatura é feita localmente na sua carteira (EIP-191). Nenhuma transação é enviada nesta etapa.",

    invest_term_signed_title: "Termo assinado com sua carteira",

    invest_term_signed_desc: "Seu consentimento e a intenção de depósito neste índice estão registrados.",

    invest_minimum_title: "Depósito mínimo: $5 USDC",

    invest_minimum_desc: "Depósitos abaixo de $5 são estornados automaticamente para sua carteira.",

    invest_testnet_warn: "TESTNET — Use USDC de teste (sem valor real)",

    invest_your_wallet: "Sua carteira (remetente)",

    invest_wallet_note: "Somente depósitos desta carteira serão creditados.",
    invest_wallet_alert: "Envie USDC somente da carteira exibida acima. Depósitos enviados de outro endereço serão creditados naquele endereço — e não na sua conta aqui.",

    invest_send_to: "Envie USDC para este endereço",

    invest_copied: "Copiado!", invest_copy: "Copiar",

    invest_fund_balance: "Saldo do fundo:",

    invest_wallet_error: "Erro ao carregar endereço do fundo. Tente novamente.",

    invest_usdc_contract: "Contrato USDC",

    invest_how_works: "Como funciona",

    invest_step1_testnet: "Envie USDC de teste (Base Sepolia) da carteira conectada",

    invest_step1_mainnet: "Envie USDC da carteira conectada na rede Base",

    invest_step2: "Seu portfólio é creditado automaticamente em 2–3 min",

    invest_step3: "Tokens emitidos ao NAV atual: ${nav} por token",

    invest_mgmt_fee_label: "Taxa de gestão", invest_mgmt_fee_val: "0,75% / ano",

    invest_perf_fee_label: "Taxa de performance", invest_perf_fee_val: "15% sobre lucros",

    invest_pending_title: "Transação em andamento",

    invest_summary_index: "Índice", invest_summary_network: "Rede",

    invest_summary_wallet: "Sua carteira", invest_summary_nav: "NAV atual",

    invest_summary_term: "Termo assinado",

    invest_view_dashboard: "Ver Dashboard →", invest_close: "Fechar",

    invest_error_rejected: "Assinatura cancelada pelo usuário.",

    invest_error_generic: "Erro ao assinar. Tente novamente.",

  },

  zh: {

    nav_indexes: "指数", nav_transparency: "透明度", nav_whats_new: "新功能",

    nav_dashboard: "仪表板", nav_mainnet: "主网", nav_testnet: "测试网",

    testnet_banner: "测试网模式 — Base Sepolia — 测试USDC，无实际价值",
    mainnet_banner: "主网模式 — Base Mainnet — 真实USDC",

    dash_title: "我的投资组合", dash_connected: "已连接：",

    dash_total_value: "总价值", dash_total_deposited: "总存款",

    dash_30d: "30天收益", dash_fee: "应计绩效费",

    dash_alltime: "历史", dash_across: "{n}个指数",

    dash_wavg: "加权平均", dash_hwm: "超过最高水位线利润的15%",

    dash_empty: "暂无活跃投资。", dash_browse: "浏览指数",

    tab_portfolio: "投资组合", tab_performance: "表现",

    tab_activity: "AI活动", tab_macro: "宏观", tab_movements: "交易记录",

    dash_refund_title: "存款已自动退还",
    mov_deposit: "存款", mov_refund: "退款", mov_withdrawal: "提款", mov_manual: "手动入账",
    mov_empty: "未找到交易记录。", mov_index: "指数", mov_tx: "交易哈希", mov_refund_tx: "退款TX",
    mov_status_ok: "已发送", mov_status_failed: "失败", mov_status_pending: "待处理",
    mov_below_min: "低于最低存款",

    invest_btn: "存款并投资", invest_connect: "连接钱包以投资",
    invest_wallet_alert: "请仅从上方显示的钱包发送USDC。从其他地址发送的存款将记入该地址，而非您的账户。",

    invest_title: "风险声明 — {index}", invest_signed: "已签署 — 进行存款",

    invest_waiting: "等待确认",

    invest_allcheck: "所有风险已确认。签名以继续。",

    invest_sign: "签署风险声明", invest_signing: "签署中…",

    invest_sent: "我已发送USDC →", invest_min: "最低：$5 USDC",

    invest_pending: "链上确认后2-3分钟内将显示在仪表板中。",

    idx_title: "所有指数", idx_sub: "AI管理的主题投资组合。由代理再平衡，在SoSoValue ValueChain上验证。",

    idx_aum: "AUM", idx_nav: "净值", idx_30d: "30天收益", idx_alltime: "历史总收益",

    idx_loading: "加载指数中…",

    net_wrong: "错误网络", net_msg: "SoSoMon运行在{net}上。请切换以继续。",

    net_btn: "切换到{net}", net_switching: "切换中…",

    wn_title: "新功能", wn_subtitle: "Wave 1建立了基础。Wave 2实现真实 — 链上存款、实时交易、完全透明。",

    wn_wave2_label: "Wave 2 · 2026年6月", wn_wave1_label: "Wave 1 · 2026年5月",

    wn_roadmap: "路线图（Wave 2之后）",

    wn_link_transparency: "查看透明度日志", wn_link_indexes: "浏览指数", wn_link_dashboard: "我的仪表板",

    wn_toggle_free: "完整流程可免费测试", wn_toggle_eval: "评估者可自由测试", wn_toggle_safe: "无丢失真实资金的风险",

    wn1_agents_title: "3个AI代理上线",

    wn1_agents_desc: "Scout（每日代币筛选）、Rebalancer（SoDEX执行）、Narrator（市场评论）——全部与SoSoValue宏观数据整合。",

    wn1_indexes_title: "3个主题指数",

    wn1_indexes_desc: "AI×Crypto、RWA和DePIN——各有独立代币池、NAV计算和AI生成的成分股说明。",

    wn1_ssv_api_title: "SoSoValue API集成",

    wn1_ssv_api_desc: "实时SSI指数成分股、宏观情绪评分、恐贪指数、主题新闻和基准表现数据。",

    wn1_sodex_title: "SoDEX DEX集成",

    wn1_sodex_desc: "来自SoDEX主网的实时市场数据（行情、K线、订单簿）。EIP-712签名请求认证API。",

    wn1_dashboard_title: "投资者仪表板",

    wn1_dashboard_desc: "按钱包查看投资组合，包含P&L、30天收益、高水位线、应计绩效费和AI活动动态。",

    wn1_admin_title: "管理员面板（钱包限制）",

    wn1_admin_desc: "EIP-191钱包签名认证。仅限0x1a3A…031c访问，用于审查提案和控制再平衡器。",

    wn2_deposit_title: "真实链上存款检测",

    wn2_deposit_desc: "存款监控每2分钟通过eth_getLogs轮询Base网络（chainId 8453）。每位投资者由其发送钱包地址识别，无需手动注册。",

    wn2_trade_title: "真实SoDEX交易执行",

    wn2_trade_desc: "再平衡器通过认证REST API向SoDEX主网提交实时限价订单。提供干运行模式保障安全。执行日志存储订单ID。",

    wn2_transparency_title: "公共透明度页面",

    wn2_transparency_desc: "每个AI决策均记录完整数据输入（情绪评分、基准、新闻背景）。每笔存款均列出可在Basescan验证的tx_hash。",

    wn2_sentiment_title: "情绪评分公式公开",

    wn2_sentiment_desc: "0–100情绪评分公式：40% SoSoValue恐贪指数 + 25% BTC 30天动量 + 20%主题SSI ROI + 15%山寨币广度。",

    wn2_gemini_title: "Gemini 2.0 Flash AI说明",

    wn2_gemini_desc: "Scout代理升级为Gemini 2.0 Flash生成代币说明。提示包含真实SoSoValue基准数据、新闻信号和SoDEX链上价格。",

    wn2_narrator_title: "Narrator引用SSI组件",

    wn2_narrator_desc: "每日评论现在引用推动每次再平衡决策的具体SoSoValue SSI指数变动——非通用文本。",

    wn2_admin_rebal_title: "管理员：运行再平衡器和执行提案",

    wn2_admin_rebal_desc: "管理员面板现有按钮可手动触发再平衡器并对SoDEX执行个别提案。支持干运行模式。",

    wn2_admin_portfolio_title: "管理员中的SoDEX投资组合和交易历史",

    wn2_admin_portfolio_desc: "管理员面板显示实时SoDEX账户余额、持仓和完整交易历史，包含方向、价格、数量和费用列。",

    wn2_admin_lock_title: "管理员访问硬锁定",

    wn2_admin_lock_desc: "后端将管理员面板限制为单一授权钱包。其他钱包即使有有效EIP-191签名也会收到HTTP 403。",

    wn2_withdrawal_title: "自动链上提款",

    wn2_withdrawal_desc: "投资者随时可以提款。系统计算管理费、绩效费和gas。USDC直接发送到投资者在Base网络的钱包——无需手动处理。",

    wn2_sandbox_title: "提款沙盒（模拟模式）",

    wn2_sandbox_desc: "在任何真实提款前，投资者可运行完整模拟：系统检查USDC余额、ETH gas余额，构建并签署交易——但不广播。",

    wn2_eip191_title: "EIP-191风险披露——钱包签署条款",

    wn2_eip191_desc: "在任何投资前，投资者必须逐项确认8个风险条目，并使用钱包签署法律结构的风险披露（EIP-191个人签名）。",

    wn2_routing_title: "索引关联存款——受保护路由",

    wn2_routing_desc: "每笔存款通过投资时注册的签署意图预先关联到投资者选择的指数。仅已认证钱包的存款被记账。",

    wn2_session_title: "会话超时——30分钟不活动锁定",

    wn2_session_desc: "遵循金融平台安全标准（Binance、Nubank），会话在30分钟不活动后自动断开。",

    wn2_toggle_title: "主网/测试网切换",

    wn2_toggle_desc: "整个平台可在Base主网（真实USDC）和Base Sepolia测试网（测试USDC）之间切换。测试网模式下，所有页面显示醒目橙色横幅。",

    wn_cs_backup: "每日数据库备份自动化",

    wn_cs_notifications: "通过邮件/Webhook的多指数订阅者通知",

    wn_cs_escrow: "非托管存款的智能合约托管",

    wn_cs_multiwallet: "每位投资者支持多钱包",
    wn_api_ssv_badge: "已集成",
    wn_api_ssv_desc: "市场情报层——所有宏观背景、情绪和价格数据均来自SoSoValue端点，为AI代理提供支持。",
    wn_api_ssv_fn1: "SSI指数 + 全球恐惧贪婪情绪",
    wn_api_ssv_fn2: "AI驱动的稳定币缓冲定量（5%–30% USDC）",
    wn_api_ssv_fn3: "3个主题指数的实时NAV计算",
    wn_api_ssv_fn4: "DeFi / AI Crypto / RWA板块表现",
    wn_api_sdx_badge: "已集成",
    wn_api_sdx_desc: "执行层——所有投资组合读取和再平衡交易均通过SoDEX路由，不依赖其他DEX。",
    wn_api_sdx_fn1: "实时代币余额 + 每个指数的USD权重",
    wn_api_sdx_fn2: "EIP-712签名订单 → 链上结算",
    wn_api_sdx_fn3: "Scout代理代币筛选的可用交易对",
    wn_api_sdx_fn4: "透明度仪表板中的完整审计跟踪",

    transp_title: "链上可审计性", transp_log: "透明度日志", transp_tab_decisions: "AI决策", transp_tab_deposits: "存款",

    transp_filter_all: "所有代理", transp_no_decisions: "暂无决策记录。", transp_no_deposits: "暂无存款记录。",

    transp_loading: "加载中…", transp_back: "← 返回首页", transp_data_inputs: "查看数据输入 →",

    idx_nav_token: "每代币净值", idx_constituents: "成分股", idx_weight: "权重", idx_price: "价格",

    idx_invest: "投资此指数", idx_min_invest: "最低 $5", idx_not_found: "未找到指数。", idx_back: "← 返回指数",

    wd_btn: "提取", wd_deposited: "已存入", wd_current: "当前价值", wd_preview_btn: "预览提取",

    wd_simulate: "模拟(沙盒)", wd_execute: "执行提取 →", wd_success: "提取已发送!", wd_failed: "提取失败",

    sess_expiring: "会话即将到期", sess_continue: "保持连接", sess_disconnect: "立即断开",

    activity_empty: "暂无近期代理活动。",
    act_deposit: "存款", act_deposit_ok: "存入 ${amount} USDC 来自 {wallet}",
    act_refund: "低于最低金额", act_refund_sent: "退款已发送至 {wallet}",
    act_refund_failed: "退款失败 {wallet}", act_refund_pending: "退款待处理 {wallet}",
    act_withdrawal: "提取 ${amount} USDC", act_manual: "手动入账 ${amount} USDC", act_min: "最低",
    dash_connect_wallet: "连接您的钱包",

    perf_loading: "加载中…", perf_no_data: "暂无数据。", perf_total_return: "总收益",

    home_badge: "基于SoSoValue ValueChain · 由SoDEX驱动",

    home_h1a: "主题指数。", home_h1b: "由AI管理。", home_h1c: "链上验证。",

    home_sub: "SoSoMon运行AI代理，对加密主题指数进行筛选、再平衡和报告——机构级投资组合管理，完全自动化在SoSoValue ValueChain上。",

    home_explore: "探索指数", home_how: "工作原理",

    home_aum: "总AUM", home_indexes: "活跃指数", home_subs: "订阅者", home_avg30d: "平均30天收益",

    home_active: "活跃指数", home_viewall: "查看全部",

    home_hiw_title: "一个人。三个AI代理。",

    home_hiw_sub: "SoSoMon完全由在SoSoValue ValueChain上运行的AI代理驱动。代理处理一切。",

    home_scout_role: "研究与筛选", home_scout_desc: "每日扫描400多个代币，使用SoSoValue数据和SoDEX市场数据，输出带有AI撰写理由的排名纳入列表。",

    home_rebal_role: "投资组合维护", home_rebal_desc: "监控漂移、情绪评分和流动性。每周或触发风险时提出再平衡建议。在SoDEX上执行订单。",

    home_narrator_role: "内容与报告", home_narrator_desc: "自动从代理数据生成每周Alpha备忘录、推文和订阅者摘要。完全透明，零偏见。",

    admin_title: "管理员访问", admin_subtitle: "SoSoMon创始人仪表板",

    admin_connect_wallet: "连接您的钱包以进行身份验证",

    admin_sign_to_auth: "签名以认证", admin_signing: "等待签名…",

    admin_sign_desc: "使用您的钱包签署消息以验证所有权。",

    admin_not_authorized: "访问被拒绝",

    admin_not_authorized_desc: "此钱包无权访问。管理员访问仅限创始人钱包。",

    admin_sig_expired: "签名已过期或无效。", admin_sig_cancelled: "签名已取消。",

    admin_auth_error: "认证失败，请重试。",

    admin_disconnect: "断开连接",

    admin_total_aum: "总AUM", admin_subscribers: "订阅者", admin_indexes: "指数",

    admin_pending: "待处理", admin_proposals_label: "提案",

    admin_fund_portfolio: "资金投资组合 — SoDEX",

    admin_loading_portfolio: "加载投资组合…", admin_loading_balances: "加载余额…",

    admin_no_positions: "资金钱包中未找到持仓。",

    admin_total_value: "总价值",

    admin_sodex_not_configured: "SoDEX凭证未配置。",

    admin_fund_wallet_title: "资金钱包 — Gas & USDC",

    admin_eth_gas: "ETH (gas)", admin_eth_critical: "⚠ 余额严重不足 — 请充值ETH！",

    admin_proposals_title: "再平衡提案",

    admin_pending_badge: "{n} 待处理", admin_ready_badge: "{n} 可执行",

    admin_run_rebalancer: "运行再平衡器", admin_running: "运行中…",
    admin_investors: "{n} 位投资者",
    admin_report_title: "管理报告", admin_report_close: "关闭",
    admin_report_proposals_status: "提案状态", admin_report_no_proposals: "暂无提案",
    admin_report_indexes: "指数", admin_report_activity: "近期活动", admin_report_proposals_total: "提案总数",

    admin_approve: "批准", admin_reject: "拒绝", admin_execute: "执行",

    admin_dry_run: "模拟运行", admin_no_proposals: "暂无再平衡提案。",

    admin_no_proposals_sub: "运行上方的再平衡器代理以生成提案。",

    admin_trades_title: "交易历史", admin_no_trades: "暂无交易。",

    admin_nav_update: "更新NAV", admin_refreshing: "刷新中…",

    admin_network_mainnet: "主网", admin_network_testnet: "测试网",

    home_footer: "非财务建议。基于SoSoValue ValueChain。由SoDEX驱动。",
    disclaimer: "SoSoMon仅供参考。非财务建议。加密资产存在重大亏损风险。过去表现不代表未来结果。",
    intellectual_credit: "Khamalmoney Inc. 的智识创作",

  },

  ja: {

    nav_indexes: "インデックス", nav_transparency: "透明性", nav_whats_new: "新機能",

    nav_dashboard: "ダッシュボード", nav_mainnet: "メインネット", nav_testnet: "テストネット",

    testnet_banner: "テストネットモード — Base Sepolia — テストUSDC、実際の価値なし",
    mainnet_banner: "メインネットモード — Base Mainnet — 実際のUSDC",

    dash_title: "マイポートフォリオ", dash_connected: "接続済み：",

    dash_total_value: "総価値", dash_total_deposited: "総預金",

    dash_30d: "30日リターン", dash_fee: "発生パフォーマンス手数料",

    dash_alltime: "通算", dash_across: "{n}インデックス",

    dash_wavg: "加重平均", dash_hwm: "HWM超過利益の15%",

    dash_empty: "アクティブな投資はまだありません。", dash_browse: "インデックスを見る",

    tab_portfolio: "ポートフォリオ", tab_performance: "パフォーマンス",

    tab_activity: "AIアクティビティ", tab_macro: "マクロ", tab_movements: "取引履歴",

    dash_refund_title: "預金が自動返金されました",
    mov_deposit: "預金", mov_refund: "返金", mov_withdrawal: "出金", mov_manual: "手動クレジット",
    mov_empty: "取引履歴がありません。", mov_index: "インデックス", mov_tx: "TXハッシュ", mov_refund_tx: "返金TX",
    mov_status_ok: "送信済み", mov_status_failed: "失敗", mov_status_pending: "保留中",
    mov_below_min: "最低預金額未満",

    invest_btn: "預金して投資", invest_connect: "投資するためにウォレットを接続",
    invest_wallet_alert: "上記のウォレットからのみUSDCを送金してください。別のアドレスからの入金はそのアドレスに記録され、あなたのアカウントには反映されません。",

    invest_title: "リスク開示 — {index}", invest_signed: "署名済み — 入金してください",

    invest_waiting: "確認待ち",

    invest_allcheck: "すべてのリスクを確認。署名して続けてください。",

    invest_sign: "リスク開示に署名", invest_signing: "署名中…",

    invest_sent: "USDCを送りました →", invest_min: "最低：$5 USDC",

    invest_pending: "オンチェーン確認後2〜3分でダッシュボードに表示されます。",

    idx_title: "すべてのインデックス", idx_sub: "AIが管理するテーマ型ポートフォリオ。エージェントによりリバランス、SoSoValue ValueChainで検証。",

    idx_aum: "AUM", idx_nav: "NAV", idx_30d: "30日リターン", idx_alltime: "通算リターン",

    idx_loading: "インデックスを読み込み中…",

    net_wrong: "ネットワークエラー", net_msg: "SoSoMonは{net}で動作しています。切り替えてください。",

    net_btn: "{net}に切り替え", net_switching: "切り替え中…",

    wn_title: "新機能", wn_subtitle: "Wave 1が基盤を構築。Wave 2がリアルに — オンチェーン預金、ライブ取引、完全な透明性。",

    wn_wave2_label: "Wave 2 · 2026年6月", wn_wave1_label: "Wave 1 · 2026年5月",

    wn_roadmap: "ロードマップ（Wave 2以降）",

    wn_link_transparency: "透明性ログを見る", wn_link_indexes: "インデックスを探す", wn_link_dashboard: "マイダッシュボード",

    wn_toggle_free: "完全なフローをコストなしでテスト可能", wn_toggle_eval: "評価者は自由にテスト可能", wn_toggle_safe: "実際の資金を失うリスクなし",

    wn1_agents_title: "3つのAIエージェント起動",

    wn1_agents_desc: "Scout（毎日のトークンスクリーニング）、Rebalancer（SoDEX実行）、Narrator（市場解説）— すべてSoSoValueマクロデータと統合。",

    wn1_indexes_title: "3つのテーマ型インデックス",

    wn1_indexes_desc: "AI×Crypto、RWA、DePIN — それぞれ独自のトークンユニバース、NAV計算とAI生成の構成銘柄説明を持つ。",

    wn1_ssv_api_title: "SoSoValue API統合",

    wn1_ssv_api_desc: "リアルタイムSSIインデックス構成銘柄、マクロセンチメントスコア、恐怖・欲望指数、テーマニュース、ベンチマークパフォーマンスデータ。",

    wn1_sodex_title: "SoDEX DEX統合",

    wn1_sodex_desc: "SoDEXメインネットからのライブ市場データ（ティッカー、ローソク足、注文簿）。EIP-712署名リクエストによる認証API。",

    wn1_dashboard_title: "投資家ダッシュボード",

    wn1_dashboard_desc: "ウォレット別ポートフォリオビュー。P&L、30日リターン、高水位線、累積パフォーマンス手数料、AIアクティビティフィード付き。",

    wn1_admin_title: "管理パネル（ウォレット制限）",

    wn1_admin_desc: "EIP-191ウォレット署名認証。0x1a3A…031cのみアクセス可能。提案レビューとリバランサー制御。",

    wn2_deposit_title: "リアルオンチェーン入金検出",

    wn2_deposit_desc: "入金モニターは2分ごとにeth_getLogsでBase ネットワーク（chainId 8453）をポーリング。各投資家は送信ウォレットアドレスで識別 — 手動登録不要。",

    wn2_trade_title: "リアルSoDEXトレード実行",

    wn2_trade_desc: "リバランサーが認証REST APIを通じてSoDEXメインネットにライブ指値注文を提出。安全のためドライランモードあり。",

    wn2_transparency_title: "公開透明性ページ",

    wn2_transparency_desc: "すべてのAI決定は完全なデータ入力とともに記録。すべての入金はBasescanで検証可能なtx_hashとともに掲載。",

    wn2_sentiment_title: "センチメントスコア計算式公開",

    wn2_sentiment_desc: "0–100スコアの計算式：40% SoSoValue恐怖・欲望 + 25% BTC 30日モメンタム + 20%テーマSSI ROI + 15%オルトコイン幅。",

    wn2_gemini_title: "Gemini 2.0 Flash AI説明",

    wn2_gemini_desc: "ScoutエージェントがGemini 2.0 Flashにアップグレード。プロンプトに実際のSoSoValueベンチマークデータ、ニュースシグナル、SoDEXオンチェーン価格を含む。",

    wn2_narrator_title: "NarratorがSSIコンポーネントを引用",

    wn2_narrator_desc: "毎日のコメンタリーが各リバランス決定を推進した具体的なSoSoValue SSIインデックスの動きを参照 — 汎用テキストなし。",

    wn2_admin_rebal_title: "管理：リバランサー実行と提案実行",

    wn2_admin_rebal_desc: "管理パネルにリバランサーを手動トリガーし、個別の提案をSoDEXに対して実行するボタンが追加。ドライランモードをサポート。",

    wn2_admin_portfolio_title: "管理パネルのSoDEXポートフォリオとトレード履歴",

    wn2_admin_portfolio_desc: "管理パネルにライブSoDEXアカウント残高、オープンポジション、完全トレード履歴を表示。",

    wn2_admin_lock_title: "管理者アクセスハードロック",

    wn2_admin_lock_desc: "バックエンドが管理パネルを単一の認可ウォレットに制限。有効なEIP-191署名があっても他のウォレットはHTTP 403。",

    wn2_withdrawal_title: "自動オンチェーン出金",

    wn2_withdrawal_desc: "投資家はいつでも出金可能。USDCは直接投資家のBase ネットワークウォレットに送信 — 手動処理なし。",

    wn2_sandbox_title: "出金サンドボックス（シミュレートモード）",

    wn2_sandbox_desc: "実際の出金前に完全なシミュレーションを実行可能：USDC残高、ETHガス残高を確認し、トランザクションを構築・署名するが、ブロードキャストしない。",

    wn2_eip191_title: "EIP-191リスク開示 — ウォレット署名条項",

    wn2_eip191_desc: "投資前に、投資家は8つの特定リスク項目を個別に確認し、ウォレットを使って法的に構造化されたリスク開示に署名（EIP-191パーソナルサイン）。",

    wn2_routing_title: "インデックス連動入金 — 保護されたルーティング",

    wn2_routing_desc: "各入金は投資時に登録された署名済みインテントを通じて選択されたインデックスに事前リンク。認証済みウォレットからの入金のみがクレジットされる。",

    wn2_session_title: "セッションタイムアウト — 30分不活動ロック",

    wn2_session_desc: "金融プラットフォームのセキュリティ基準（Binance、Nubank）に従い、30分の不活動後にセッションが自動的に切断。",

    wn2_toggle_title: "メインネット / テストネット切替",

    wn2_toggle_desc: "プラットフォーム全体がBase メインネット（実際のUSDC）とBase Sepoliaテストネット（テストUSDC）を切り替え可能。テストネットモードでは全ページに橙色バナーを表示。",

    wn_cs_backup: "毎日のDBバックアップ自動化",

    wn_cs_notifications: "メール/Webhookによるマルチインデックス購読者通知",

    wn_cs_escrow: "非カストディアル入金のスマートコントラクトエスクロー",

    wn_cs_multiwallet: "投資家ごとのマルチウォレットサポート",
    wn_api_ssv_badge: "統合済み",
    wn_api_ssv_desc: "市場インテリジェンス層——マクロコンテキスト、センチメント、価格データはすべてSoSoValueのエンドポイントからAIエージェントに提供されます。",
    wn_api_ssv_fn1: "SSIインデックス + グローバルFear & Greedセンチメント",
    wn_api_ssv_fn2: "AI駆動のステーブルコインバッファサイジング（5%–30% USDC）",
    wn_api_ssv_fn3: "3つのテーマ別インデックスのリアルタイムNAV計算",
    wn_api_ssv_fn4: "DeFi / AI Crypto / RWAセクターパフォーマンス",
    wn_api_sdx_badge: "統合済み",
    wn_api_sdx_desc: "実行層——ポートフォリオの読み取りとすべてのリバランストレードはSoDEXを経由し、他のDEX依存性はありません。",
    wn_api_sdx_fn1: "リアルタイムトークン残高 + 各インデックスのUSDウェイト",
    wn_api_sdx_fn2: "EIP-712署名注文 → オンチェーン決済",
    wn_api_sdx_fn3: "Scoutエージェントのトークンスクリーニング用利用可能ペア",
    wn_api_sdx_fn4: "透明性ダッシュボードに表示された完全な監査証跡",

    transp_title: "オンチェーン監査可能性", transp_log: "透明性ログ", transp_tab_decisions: "AI決定", transp_tab_deposits: "預金",

    transp_filter_all: "全エージェント", transp_no_decisions: "決定はまだ記録されていません。", transp_no_deposits: "預金はまだ記録されていません。",

    transp_loading: "読み込み中…", transp_back: "← ホームに戻る", transp_data_inputs: "データ入力を見る →",

    idx_nav_token: "トークンあたりNAV", idx_constituents: "構成銘柄", idx_weight: "ウェイト", idx_price: "価格",

    idx_invest: "このインデックスに投資", idx_min_invest: "最低 $5", idx_not_found: "インデックスが見つかりません。", idx_back: "← インデックスに戻る",

    wd_btn: "引き出し", wd_deposited: "預入済み", wd_current: "現在価値", wd_preview_btn: "引き出しプレビュー",

    wd_simulate: "シミュレート(サンドボックス)", wd_execute: "引き出し実行 →", wd_success: "引き出し送信完了!", wd_failed: "引き出し失敗",

    sess_expiring: "セッションが期限切れになります", sess_continue: "接続を維持", sess_disconnect: "今すぐ切断",

    activity_empty: "最近のエージェント活動はありません。",
    act_deposit: "入金", act_deposit_ok: "${amount} USDC入金 {wallet}より",
    act_refund: "最低金額未満", act_refund_sent: "{wallet}へ返金送信",
    act_refund_failed: "{wallet}への返金失敗", act_refund_pending: "{wallet}への返金保留",
    act_withdrawal: "${amount} USDC出金", act_manual: "${amount} USDC手動入金", act_min: "最低",
    dash_connect_wallet: "ウォレットを接続",

    perf_loading: "読み込み中…", perf_no_data: "データがありません。", perf_total_return: "総リターン",

    home_badge: "SoSoValue ValueChain上に構築 · SoDEXで駆動",

    home_h1a: "テーマ型インデックス。", home_h1b: "AIが管理。", home_h1c: "オンチェーンで検証済み。",

    home_sub: "SoSoMonはAIエージェントを使用して暗号テーマインデックスのスクリーニング、リバランス、レポートを行います。SoSoValue ValueChain上で完全自動化された機関クオリティのポートフォリオ管理です。",

    home_explore: "インデックスを探す", home_how: "仕組み",

    home_aum: "総AUM", home_indexes: "アクティブなインデックス", home_subs: "サブスクライバー", home_avg30d: "平均30日リターン",

    home_active: "アクティブなインデックス", home_viewall: "すべて見る",

    home_hiw_title: "一人。三つのAIエージェント。",

    home_hiw_sub: "SoSoMonはSoSoValue ValueChain上で動作するAIエージェントで完全に動いています。エージェントがすべてを処理します。",

    home_scout_role: "リサーチ&スクリーニング", home_scout_desc: "SoSoValueデータとSoDEX市場データを使用して400以上のトークンを毎日スキャン。AI生成の根拠付き順位リストを出力。",

    home_rebal_role: "ポートフォリオ管理", home_rebal_desc: "ドリフト、センチメントスコア、流動性を監視。週次またはリスクトリガー時にリバランスを提案。SoDEXで注文を実行。",

    home_narrator_role: "コンテンツ&レポート", home_narrator_desc: "エージェントデータから週次アルファメモ、Twitterスレッド、サブスクライバーダイジェストを自動生成。完全な透明性。",

    admin_title: "管理者アクセス", admin_subtitle: "SoSoMonファウンダーダッシュボード",

    admin_connect_wallet: "認証するためにウォレットを接続してください",

    admin_sign_to_auth: "署名して認証", admin_signing: "署名を待っています…",

    admin_sign_desc: "ウォレットでメッセージに署名して所有権を確認します。",

    admin_not_authorized: "アクセス拒否",

    admin_not_authorized_desc: "このウォレットは認証されていません。管理者アクセスはファウンダーウォレットのみです。",

    admin_sig_expired: "署名が期限切れまたは無効です。", admin_sig_cancelled: "署名がキャンセルされました。",

    admin_auth_error: "認証エラー。再試行してください。",

    admin_disconnect: "切断",

    admin_total_aum: "総AUM", admin_subscribers: "サブスクライバー", admin_indexes: "インデックス",

    admin_pending: "保留中", admin_proposals_label: "提案",

    admin_fund_portfolio: "ファンドポートフォリオ — SoDEX",

    admin_loading_portfolio: "ポートフォリオを読み込み中…", admin_loading_balances: "残高を読み込み中…",

    admin_no_positions: "ファンドウォレットにポジションがありません。",

    admin_total_value: "総価値",

    admin_sodex_not_configured: "SoDEX認証情報が設定されていません。",

    admin_fund_wallet_title: "ファンドウォレット — Gas & USDC",

    admin_eth_gas: "ETH (gas)", admin_eth_critical: "⚠ 残高危機 — ETHを補充してください！",

    admin_proposals_title: "リバランス提案",

    admin_pending_badge: "{n} 保留中", admin_ready_badge: "{n} 実行可能",

    admin_run_rebalancer: "リバランサーを実行", admin_running: "実行中…",
    admin_investors: "{n} 名の投資家",
    admin_report_title: "管理レポート", admin_report_close: "閉じる",
    admin_report_proposals_status: "提案ステータス別", admin_report_no_proposals: "提案はまだありません",
    admin_report_indexes: "インデックス", admin_report_activity: "最近のアクティビティ", admin_report_proposals_total: "提案合計",

    admin_approve: "承認", admin_reject: "拒否", admin_execute: "実行",

    admin_dry_run: "ドライラン", admin_no_proposals: "リバランス提案はまだありません。",

    admin_no_proposals_sub: "上のリバランサーエージェントを実行して提案を生成してください。",

    admin_trades_title: "取引履歴", admin_no_trades: "取引はまだありません。",

    admin_nav_update: "NAVを更新", admin_refreshing: "更新中…",

    admin_network_mainnet: "メインネット", admin_network_testnet: "テストネット",

    home_footer: "投資アドバイスではありません。SoSoValue ValueChain上に構築。SoDEXで駆動。",
    disclaimer: "SoSoMonは情報提供のみを目的としています。投資アドバイスではありません。暗号資産には重大な損失リスクが伴います。過去の実績は将来の結果を保証しません。",
    intellectual_credit: "Khamalmoney Inc. の知的創造物",

  },

  hi: {

    nav_indexes: "सूचकांक", nav_transparency: "पारदर्शिता", nav_whats_new: "नया क्या है",

    nav_dashboard: "डैशबोर्ड", nav_mainnet: "मेननेट", nav_testnet: "टेस्टनेट",

    testnet_banner: "टेस्टनेट मोड — Base Sepolia — टेस्ट USDC, कोई वास्तविक मूल्य नहीं",
    mainnet_banner: "मेननेट मोड — Base Mainnet — वास्तविक USDC",

    dash_title: "मेरा पोर्टफोलियो", dash_connected: "जुड़ा हुआ:",

    dash_total_value: "कुल मूल्य", dash_total_deposited: "कुल जमा",

    dash_30d: "30 दिन रिटर्न", dash_fee: "अर्जित प्रदर्शन शुल्क",

    dash_alltime: "सर्वकालिक", dash_across: "{n} सूचकांकों में",

    dash_wavg: "भारित औसत", dash_hwm: "HWM से ऊपर लाभ का 15%",

    dash_empty: "अभी तक कोई सक्रिय निवेश नहीं।", dash_browse: "सूचकांक देखें",

    tab_portfolio: "पोर्टफोलियो", tab_performance: "प्रदर्शन",

    tab_activity: "AI गतिविधि", tab_macro: "मैक्रो", tab_movements: "लेन-देन",

    dash_refund_title: "जमा स्वचालित रूप से वापस किया गया",
    mov_deposit: "जमा", mov_refund: "वापसी", mov_withdrawal: "निकासी", mov_manual: "मैनुअल क्रेडिट",
    mov_empty: "कोई लेन-देन नहीं मिला।", mov_index: "सूचकांक", mov_tx: "TX हैश", mov_refund_tx: "वापसी TX",
    mov_status_ok: "भेजा गया", mov_status_failed: "विफल", mov_status_pending: "लंबित",
    mov_below_min: "न्यूनतम जमा से कम",

    invest_btn: "जमा करें और निवेश करें", invest_connect: "निवेश के लिए वॉलेट कनेक्ट करें",
    invest_wallet_alert: "USDC केवल ऊपर दिखाए गए वॉलेट से भेजें। किसी अन्य पते से भेजी गई राशि उस पते पर क्रेडिट होगी, आपके खाते में नहीं।",

    invest_title: "जोखिम प्रकटीकरण — {index}", invest_signed: "हस्ताक्षरित — जमा करें",

    invest_waiting: "पुष्टि की प्रतीक्षा",

    invest_allcheck: "सभी जोखिम स्वीकृत। जारी रखने के लिए हस्ताक्षर करें।",

    invest_sign: "जोखिम प्रकटीकरण पर हस्ताक्षर करें", invest_signing: "हस्ताक्षर हो रहा है…",

    invest_sent: "मैंने USDC भेज दिया →", invest_min: "न्यूनतम: $5 USDC",

    invest_pending: "ऑन-चेन पुष्टि के 2-3 मिनट बाद डैशबोर्ड में दिखेगी।",

    idx_title: "सभी सूचकांक", idx_sub: "AI-प्रबंधित विषयगत पोर्टफोलियो। एजेंटों द्वारा पुनर्संतुलित, SoSoValue ValueChain पर सत्यापित।",

    idx_aum: "AUM", idx_nav: "NAV", idx_30d: "30d रिटर्न", idx_alltime: "सर्वकालिक",

    idx_loading: "सूचकांक लोड हो रहे हैं…",

    net_wrong: "गलत नेटवर्क", net_msg: "SoSoMon {net} पर चलता है। जारी रखने के लिए स्विच करें।",

    net_btn: "{net} पर स्विच करें", net_switching: "स्विच हो रहा है…",

    wn_title: "नया क्या है", wn_subtitle: "Wave 1 ने नींव रखी। Wave 2 इसे वास्तविक बनाता है।",

    wn_wave2_label: "Wave 2 · जून 2026", wn_wave1_label: "Wave 1 · मई 2026",

    wn_roadmap: "रोडमैप (Wave 2 के बाद)",

    wn_link_transparency: "पारदर्शिता लॉग देखें", wn_link_indexes: "इंडेक्स देखें", wn_link_dashboard: "मेरा डैशबोर्ड",

    wn_toggle_free: "पूर्ण प्रवाह बिना लागत के परीक्षण योग्य", wn_toggle_eval: "मूल्यांकनकर्ता स्वतंत्र रूप से परीक्षण कर सकते हैं", wn_toggle_safe: "वास्तविक धन खोने का कोई जोखिम नहीं",

    wn1_agents_title: "3 AI एजेंट लॉन्च",

    wn1_agents_desc: "Scout (दैनिक टोकन स्क्रीनिंग), Rebalancer (SoDEX निष्पादन), Narrator (बाजार टिप्पणी) — सभी SoSoValue मैक्रो डेटा के साथ एकीकृत।",

    wn1_indexes_title: "3 थीमैटिक इंडेक्स",

    wn1_indexes_desc: "AI×Crypto, RWA और DePIN — प्रत्येक का अपना टोकन यूनिवर्स, NAV गणना और AI-जनित घटक औचित्य।",

    wn1_ssv_api_title: "SoSoValue API एकीकरण",

    wn1_ssv_api_desc: "रियल-टाइम SSI इंडेक्स घटक, मैक्रो सेंटीमेंट स्कोर, भय/लालच सूचकांक, थीमैटिक समाचार और बेंचमार्क प्रदर्शन डेटा।",

    wn1_sodex_title: "SoDEX DEX एकीकरण",

    wn1_sodex_desc: "SoDEX मेननेट से लाइव बाजार डेटा (टिकर, कैंडल, ऑर्डरबुक)। EIP-712 हस्ताक्षरित अनुरोधों के साथ प्रमाणित API।",

    wn1_dashboard_title: "निवेशक डैशबोर्ड",

    wn1_dashboard_desc: "P&L, 30d रिटर्न, हाई-वॉटर मार्क, संचित प्रदर्शन शुल्क और AI गतिविधि फ़ीड के साथ प्रति-वॉलेट पोर्टफोलियो व्यू।",

    wn1_admin_title: "एडमिन पैनल (वॉलेट-गेटेड)",

    wn1_admin_desc: "EIP-191 वॉलेट हस्ताक्षर प्रमाणीकरण। केवल 0x1a3A…031c के लिए एक्सक्लूसिव एक्सेस।",

    wn2_deposit_title: "वास्तविक ऑन-चेन जमा पहचान",

    wn2_deposit_desc: "जमा मॉनिटर हर 2 मिनट में eth_getLogs के माध्यम से Base नेटवर्क (chainId 8453) को पोल करता है। प्रत्येक निवेशक उनके वॉलेट पते से पहचाना जाता है।",

    wn2_trade_title: "वास्तविक SoDEX ट्रेड निष्पादन",

    wn2_trade_desc: "Rebalancer प्रमाणित REST API के माध्यम से SoDEX मेननेट पर लाइव लिमिट ऑर्डर जमा करता है। सुरक्षा के लिए dry-run मोड उपलब्ध।",

    wn2_transparency_title: "सार्वजनिक पारदर्शिता पृष्ठ",

    wn2_transparency_desc: "प्रत्येक AI निर्णय पूर्ण डेटा इनपुट के साथ लॉग। प्रत्येक जमा Basescan पर सत्यापन योग्य tx_hash के साथ सूचीबद्ध।",

    wn2_sentiment_title: "सेंटीमेंट स्कोर फॉर्मूला प्रकट",

    wn2_sentiment_desc: "0–100 स्कोर फॉर्मूला: 40% SoSoValue Fear & Greed + 25% BTC 30d momentum + 20% theme SSI ROI + 15% altcoin breadth।",

    wn2_gemini_title: "Gemini 2.0 Flash AI Rationale",

    wn2_gemini_desc: "Scout एजेंट Gemini 2.0 Flash में अपग्रेड। प्रॉम्प्ट में वास्तविक SoSoValue बेंचमार्क डेटा, न्यूज़ सिग्नल और SoDEX ऑन-चेन मूल्य शामिल।",

    wn2_narrator_title: "Narrator SSI घटकों का उद्धरण देता है",

    wn2_narrator_desc: "दैनिक टिप्पणी अब प्रत्येक रीबैलेंस निर्णय को प्रेरित करने वाले विशिष्ट SoSoValue SSI इंडेक्स आंदोलनों का संदर्भ देती है।",

    wn2_admin_rebal_title: "एडमिन: Rebalancer चलाएं और प्रस्ताव निष्पादित करें",

    wn2_admin_rebal_desc: "एडमिन पैनल में Rebalancer को मैन्युअल रूप से ट्रिगर करने के बटन। Dry-run मोड समर्थित।",

    wn2_admin_portfolio_title: "एडमिन में SoDEX पोर्टफोलियो और ट्रेड इतिहास",

    wn2_admin_portfolio_desc: "एडमिन पैनल लाइव SoDEX खाता शेष, खुली स्थिति और पूरा ट्रेड इतिहास दिखाता है।",

    wn2_admin_lock_title: "एडमिन एक्सेस हार्ड-लॉक",

    wn2_admin_lock_desc: "बैकएंड एडमिन पैनल को एकल अधिकृत वॉलेट तक सीमित करता है। वैध EIP-191 हस्ताक्षर के साथ भी अन्य वॉलेट को HTTP 403 मिलता है।",

    wn2_withdrawal_title: "स्वचालित ऑन-चेन निकासी",

    wn2_withdrawal_desc: "निवेशक कभी भी निकासी कर सकते हैं। USDC सीधे निवेशक के Base नेटवर्क वॉलेट में भेजा जाता है।",

    wn2_sandbox_title: "निकासी सैंडबॉक्स (Simulate मोड)",

    wn2_sandbox_desc: "किसी भी वास्तविक निकासी से पहले, निवेशक पूर्ण सिमुलेशन चला सकते हैं — USDC और ETH gas जांचता है, लेकिन ब्रॉडकास्ट नहीं करता।",

    wn2_eip191_title: "EIP-191 जोखिम प्रकटीकरण — वॉलेट-हस्ताक्षरित शर्त",

    wn2_eip191_desc: "किसी भी निवेश से पहले, निवेशक 8 विशिष्ट जोखिम वस्तुओं को स्वीकार करता है और EIP-191 personal sign से हस्ताक्षर करता है।",

    wn2_routing_title: "इंडेक्स-लिंक्ड जमा — संरक्षित रूटिंग",

    wn2_routing_desc: "प्रत्येक जमा निवेश के समय पंजीकृत हस्ताक्षरित इरादे के माध्यम से चुने गए इंडेक्स से पूर्व-लिंक है।",

    wn2_session_title: "सत्र टाइमआउट — 30 मिनट निष्क्रियता लॉक",

    wn2_session_desc: "30 मिनट की निष्क्रियता के बाद सत्र स्वचालित रूप से डिस्कनेक्ट होता है। समाप्ति से 5 मिनट पहले चेतावनी दिखती है।",

    wn2_toggle_title: "Mainnet / Testnet Toggle",

    wn2_toggle_desc: "पूरा प्लेटफॉर्म Base Mainnet (वास्तविक USDC) और Base Sepolia Testnet (टेस्ट USDC) के बीच स्विच कर सकता है।",

    wn_cs_backup: "दैनिक DB बैकअप ऑटोमेशन",

    wn_cs_notifications: "ईमेल/Webhook के माध्यम से मल्टी-इंडेक्स सब्सक्राइबर अधिसूचनाएं",

    wn_cs_escrow: "नॉन-कस्टोडियल जमा के लिए स्मार्ट कॉन्ट्रैक्ट एस्क्रो",

    wn_cs_multiwallet: "प्रति निवेशक मल्टी-वॉलेट सपोर्ट",
    wn_api_ssv_badge: "एकीकृत",
    wn_api_ssv_desc: "बाजार बुद्धिमत्ता परत — सभी मैक्रो संदर्भ, भावना और मूल्य डेटा SoSoValue एंडपॉइंट से AI एजेंटों को फीड होते हैं।",
    wn_api_ssv_fn1: "SSI इंडेक्स + वैश्विक Fear & Greed भावना",
    wn_api_ssv_fn2: "AI-संचालित स्टेबलकॉइन बफर साइजिंग (5%–30% USDC)",
    wn_api_ssv_fn3: "3 थीमेटिक इंडेक्स के लिए रियल-टाइम NAV गणना",
    wn_api_ssv_fn4: "DeFi / AI Crypto / RWA सेक्टर प्रदर्शन",
    wn_api_sdx_badge: "एकीकृत",
    wn_api_sdx_desc: "निष्पादन परत — सभी पोर्टफोलियो रीड और रिबैलेंस ट्रेड SoDEX के माध्यम से रूट होते हैं; कोई अन्य DEX निर्भरता नहीं।",
    wn_api_sdx_fn1: "रियल-टाइम टोकन बैलेंस + प्रति इंडेक्स USD भार",
    wn_api_sdx_fn2: "EIP-712 हस्ताक्षरित ऑर्डर → ऑन-चेन सेटलमेंट",
    wn_api_sdx_fn3: "Scout एजेंट टोकन स्क्रीनिंग के लिए उपलब्ध पेयर",
    wn_api_sdx_fn4: "ट्रांसपेरेंसी डैशबोर्ड में पूर्ण ऑडिट ट्रेल",

    transp_title: "ऑन-चेन ऑडिटेबिलिटी", transp_tab_decisions: "AI निर्णय", transp_tab_deposits: "जमा",

    transp_filter_all: "सभी एजेंट", transp_no_decisions: "अभी तक कोई निर्णय दर्ज नहीं।", transp_loading: "लोड हो रहा है…",

    idx_invest: "इस इंडेक्स में निवेश करें", idx_not_found: "इंडेक्स नहीं मिला।", idx_back: "← इंडेक्स पर वापस",

    wd_btn: "निकासी", wd_preview_btn: "निकासी पूर्वावलोकन", wd_execute: "निकासी करें →",

    sess_expiring: "सत्र समाप्त हो रहा है", sess_continue: "जुड़े रहें", sess_disconnect: "अभी डिस्कनेक्ट करें",

    activity_empty: "कोई हालिया एजेंट गतिविधि नहीं।",
    act_deposit: "जमा", act_deposit_ok: "{wallet} से ${amount} USDC जमा",
    act_refund: "न्यूनतम से कम", act_refund_sent: "{wallet} को वापसी भेजी",
    act_refund_failed: "{wallet} को वापसी विफल", act_refund_pending: "{wallet} के लिए वापसी लंबित",
    act_withdrawal: "${amount} USDC निकासी", act_manual: "${amount} USDC मैनुअल क्रेडिट", act_min: "न्यूनतम",
    dash_connect_wallet: "अपना वॉलेट कनेक्ट करें",

    perf_loading: "लोड हो रहा है…", perf_total_return: "कुल रिटर्न",

    home_badge: "SoSoValue ValueChain पर निर्मित · SoDEX द्वारा संचालित",

    home_h1a: "थीमैटिक इंडेक्स।", home_h1b: "AI द्वारा प्रबंधित।", home_h1c: "ऑन-चेन सत्यापित।",

    home_sub: "SoSoMon AI एजेंट चलाता है जो क्रिप्टो थीमैटिक इंडेक्स की स्क्रीनिंग, रीबैलेंसिंग और रिपोर्टिंग करते हैं।",

    home_explore: "इंडेक्स देखें", home_how: "यह कैसे काम करता है",

    home_aum: "कुल AUM", home_indexes: "सक्रिय इंडेक्स", home_subs: "सब्सक्राइबर", home_avg30d: "औसत 30d रिटर्न",

    home_active: "सक्रिय इंडेक्स", home_viewall: "सभी देखें",

    home_hiw_title: "एक व्यक्ति। तीन AI एजेंट।",

    home_hiw_sub: "SoSoMon पूरी तरह से SoSoValue ValueChain पर AI एजेंटों द्वारा संचालित है।",

    home_scout_role: "अनुसंधान और स्क्रीनिंग", home_scout_desc: "SoSoValue डेटा और SoDEX मार्केट डेटा का उपयोग करके 400+ टोकन की दैनिक स्कैनिंग।",

    home_rebal_role: "पोर्टफोलियो रखरखाव", home_rebal_desc: "ड्रिफ्ट, भावना स्कोर और तरलता की निगरानी करता है। SoDEX पर ऑर्डर निष्पादित करता है।",

    home_narrator_role: "सामग्री और रिपोर्ट", home_narrator_desc: "एजेंट डेटा से साप्ताहिक Alpha Memo और सब्सक्राइबर डाइजेस्ट स्वचालित रूप से उत्पन्न करता है।",

    admin_title: "एडमिन एक्सेस", admin_subtitle: "SoSoMon फाउंडर डैशबोर्ड",

    admin_connect_wallet: "प्रमाणित करने के लिए अपना वॉलेट कनेक्ट करें",

    admin_sign_to_auth: "प्रमाणित करने के लिए हस्ताक्षर करें", admin_signing: "हस्ताक्षर की प्रतीक्षा…",

    admin_sign_desc: "स्वामित्व सत्यापित करने के लिए अपने वॉलेट से संदेश पर हस्ताक्षर करें।",

    admin_not_authorized: "पहुँच अस्वीकृत",

    admin_not_authorized_desc: "इस वॉलेट को अनुमति नहीं है। एडमिन एक्सेस केवल फाउंडर वॉलेट के लिए है।",

    admin_sig_expired: "हस्ताक्षर समाप्त या अमान्य।", admin_sig_cancelled: "हस्ताक्षर रद्द।",

    admin_auth_error: "प्रमाणीकरण त्रुटि। पुनः प्रयास करें।",

    admin_disconnect: "डिस्कनेक्ट",

    admin_total_aum: "कुल AUM", admin_subscribers: "सब्सक्राइबर", admin_indexes: "इंडेक्स",

    admin_pending: "लंबित", admin_proposals_label: "प्रस्ताव",

    admin_fund_portfolio: "फंड पोर्टफोलियो — SoDEX",

    admin_loading_portfolio: "पोर्टफोलियो लोड हो रहा है…", admin_loading_balances: "बैलेंस लोड हो रहा है…",

    admin_no_positions: "फंड वॉलेट में कोई पोजीशन नहीं मिली।",

    admin_total_value: "कुल मूल्य",

    admin_sodex_not_configured: "SoDEX क्रेडेंशियल्स कॉन्फ़िगर नहीं हैं।",

    admin_fund_wallet_title: "फंड वॉलेट — Gas & USDC",

    admin_eth_gas: "ETH (gas)", admin_eth_critical: "⚠ क्रिटिकल बैलेंस — ETH भरें!",

    admin_proposals_title: "रीबैलेंस प्रस्ताव",

    admin_pending_badge: "{n} लंबित", admin_ready_badge: "{n} निष्पादन के लिए तैयार",

    admin_run_rebalancer: "Rebalancer चलाएं", admin_running: "चल रहा है…",
    admin_investors: "{n} निवेशक",
    admin_report_title: "प्रबंधन रिपोर्ट", admin_report_close: "बंद करें",
    admin_report_proposals_status: "प्रस्ताव स्थिति", admin_report_no_proposals: "अभी कोई प्रस्ताव नहीं",
    admin_report_indexes: "सूचकांक", admin_report_activity: "हालिया गतिविधि", admin_report_proposals_total: "कुल प्रस्ताव",

    admin_approve: "अनुमोदन", admin_reject: "अस्वीकार", admin_execute: "निष्पादित करें",

    admin_dry_run: "ड्राई रन", admin_no_proposals: "अभी तक कोई रीबैलेंस प्रस्ताव नहीं।",

    admin_no_proposals_sub: "प्रस्ताव उत्पन्न करने के लिए ऊपर Rebalancer चलाएं।",

    admin_trades_title: "ट्रेड इतिहास", admin_no_trades: "अभी तक कोई ट्रेड नहीं।",

    admin_nav_update: "NAV अपडेट करें", admin_refreshing: "अपडेट हो रहा है…",

    admin_network_mainnet: "मेननेट", admin_network_testnet: "टेस्टनेट",

    home_footer: "वित्तीय सलाह नहीं। SoSoValue ValueChain पर निर्मित। SoDEX द्वारा संचालित।",
    disclaimer: "SoSoMon केवल सूचना के उद्देश्यों के लिए है। वित्तीय सलाह नहीं। क्रिप्टो संपत्तियों में महत्वपूर्ण जोखिम है। पिछला प्रदर्शन भविष्य के परिणामों की गारंटी नहीं देता।",
    intellectual_credit: "Khamalmoney Inc. की बौद्धिक कृति",

  },

  id: {

    nav_indexes: "Indeks", nav_transparency: "Transparansi", nav_whats_new: "Apa yang Baru",

    nav_dashboard: "Dasbor", nav_mainnet: "Mainnet", nav_testnet: "Testnet",

    testnet_banner: "MODE TESTNET — Base Sepolia — USDC uji coba, tanpa nilai nyata",
    mainnet_banner: "MODE MAINNET — Base Mainnet — USDC nyata",

    dash_title: "Portofolio Saya", dash_connected: "Terhubung:",

    dash_total_value: "Total Nilai", dash_total_deposited: "Total Disetorkan",

    dash_30d: "Imbal Hasil 30H", dash_fee: "Biaya Kinerja Terkumpul",

    dash_alltime: "sepanjang masa", dash_across: "di {n} indeks",

    dash_wavg: "rata-rata tertimbang", dash_hwm: "15% dari keuntungan di atas HWM",

    dash_empty: "Belum ada investasi aktif.", dash_browse: "Lihat Indeks",

    tab_portfolio: "Portofolio", tab_performance: "Kinerja",

    tab_activity: "Aktivitas AI", tab_macro: "Makro", tab_movements: "Riwayat Transaksi",

    dash_refund_title: "Setoran dikembalikan otomatis",
    mov_deposit: "Setoran", mov_refund: "Pengembalian", mov_withdrawal: "Penarikan", mov_manual: "Kredit Manual",
    mov_empty: "Tidak ada transaksi ditemukan.", mov_index: "Indeks", mov_tx: "Hash TX", mov_refund_tx: "TX Pengembalian",
    mov_status_ok: "Terkirim", mov_status_failed: "Gagal", mov_status_pending: "Tertunda",
    mov_below_min: "Di bawah setoran minimum",

    invest_btn: "Setor & Investasi", invest_connect: "Hubungkan Dompet untuk Investasi",
    invest_wallet_alert: "Kirim USDC hanya dari dompet yang ditampilkan di atas. Deposit dari alamat lain akan dikreditkan ke alamat tersebut, bukan ke akun Anda.",

    invest_title: "Pengungkapan Risiko — {index}", invest_signed: "Ditandatangani — Lakukan Setoran",

    invest_waiting: "Menunggu Konfirmasi",

    invest_allcheck: "Semua risiko diakui. Tandatangani untuk melanjutkan.",

    invest_sign: "Tandatangani Pengungkapan Risiko", invest_signing: "Menandatangani…",

    invest_sent: "Saya sudah mengirim USDC →", invest_min: "Minimum: $5 USDC",

    invest_pending: "Setoran Anda akan muncul di dasbor dalam 2–3 menit setelah konfirmasi on-chain.",

    idx_title: "Semua Indeks", idx_sub: "Portofolio tematik yang dikelola AI. Diseimbangkan ulang oleh agen, diverifikasi di SoSoValue ValueChain.",

    idx_aum: "AUM", idx_nav: "NAV", idx_30d: "Imbal Hasil 30h", idx_alltime: "Sepanjang Masa",

    idx_loading: "Memuat indeks…",

    net_wrong: "Jaringan Salah", net_msg: "SoSoMon berjalan di {net}. Ganti untuk melanjutkan.",

    net_btn: "Ganti ke {net}", net_switching: "Mengganti…",

    wn_title: "Apa yang Baru", wn_subtitle: "Wave 1 membangun fondasi. Wave 2 membuatnya nyata — setoran on-chain, perdagangan langsung, transparansi penuh.",

    wn_wave2_label: "Wave 2 · Jun 2026", wn_wave1_label: "Wave 1 · Mei 2026",

    wn_roadmap: "Peta Jalan (setelah Wave 2)",

    wn_link_transparency: "Lihat Log Transparansi", wn_link_indexes: "Jelajahi Indeks", wn_link_dashboard: "Dasbor Saya",

    wn_toggle_free: "Alur lengkap dapat diuji tanpa biaya", wn_toggle_eval: "Evaluator dapat menguji secara bebas", wn_toggle_safe: "Tidak ada risiko kehilangan dana nyata",

    wn1_agents_title: "3 Agen AI diluncurkan",

    wn1_agents_desc: "Scout (penyaringan token harian), Rebalancer (eksekusi SoDEX), Narrator (komentar pasar) — semua terintegrasi dengan data makro SoSoValue.",

    wn1_indexes_title: "3 Indeks Tematik",

    wn1_indexes_desc: "AI×Crypto, RWA, dan DePIN — masing-masing dengan alam semesta token sendiri, perhitungan NAV, dan alasan yang dihasilkan AI per konstituen.",

    wn1_ssv_api_title: "Integrasi API SoSoValue",

    wn1_ssv_api_desc: "Konstituen indeks SSI real-time, skor sentimen makro, indeks ketakutan/keserakahan, berita tematik, dan data kinerja benchmark.",

    wn1_sodex_title: "Integrasi SoDEX DEX",

    wn1_sodex_desc: "Data pasar langsung (ticker, candle, orderbook) dari mainnet SoDEX. API terautentikasi dengan permintaan bertanda tangan EIP-712.",

    wn1_dashboard_title: "Dasbor Investor",

    wn1_dashboard_desc: "Tampilan portofolio per dompet dengan P&L, return 30 hari, high-water mark, biaya kinerja terakumulasi, dan feed aktivitas AI.",

    wn1_admin_title: "Panel Admin (dibatasi dompet)",

    wn1_admin_desc: "Autentikasi tanda tangan dompet EIP-191. Akses eksklusif untuk 0x1a3A…031c untuk tinjauan proposal dan kontrol rebalancer.",

    wn2_deposit_title: "Deteksi Setoran On-Chain Nyata",

    wn2_deposit_desc: "Monitor setoran melakukan polling jaringan Base (chainId 8453) melalui eth_getLogs setiap 2 menit. Setiap investor diidentifikasi berdasarkan alamat dompet pengirim — tidak perlu pendaftaran manual.",

    wn2_trade_title: "Eksekusi Trade SoDEX Nyata",

    wn2_trade_desc: "Rebalancer mengirimkan order limit langsung ke mainnet SoDEX melalui REST API terautentikasi. Mode dry-run tersedia untuk keamanan.",

    wn2_transparency_title: "Halaman Transparansi Publik",

    wn2_transparency_desc: "Setiap keputusan AI dicatat dengan input data lengkap. Setiap setoran tercantum dengan tx_hash yang dapat diverifikasi di Basescan.",

    wn2_sentiment_title: "Formula Skor Sentimen Diungkapkan",

    wn2_sentiment_desc: "Formula skor 0–100: 40% SoSoValue Fear & Greed + 25% momentum BTC 30 hari + 20% ROI SSI tema + 15% breadth altcoin.",

    wn2_gemini_title: "Gemini 2.0 Flash AI Rationale",

    wn2_gemini_desc: "Agen Scout ditingkatkan ke Gemini 2.0 Flash. Prompt menyertakan data benchmark SoSoValue nyata, sinyal berita, dan harga on-chain SoDEX.",

    wn2_narrator_title: "Narrator mengutip Komponen SSI",

    wn2_narrator_desc: "Komentar harian kini merujuk pergerakan indeks SSI SoSoValue spesifik yang mendorong setiap keputusan rebalancing.",

    wn2_admin_rebal_title: "Admin: Jalankan Rebalancer & Eksekusi Proposal",

    wn2_admin_rebal_desc: "Panel admin kini memiliki tombol untuk memicu rebalancer secara manual dan mengeksekusi proposal individual ke SoDEX. Mendukung mode dry-run.",

    wn2_admin_portfolio_title: "Portofolio SoDEX & Riwayat Trade di Admin",

    wn2_admin_portfolio_desc: "Panel admin menampilkan saldo akun SoDEX langsung, posisi terbuka, dan riwayat trade lengkap.",

    wn2_admin_lock_title: "Akses Admin Dikunci Keras",

    wn2_admin_lock_desc: "Backend membatasi panel admin ke satu dompet yang berwenang. Dompet lain menerima HTTP 403 meskipun memiliki tanda tangan EIP-191 yang valid.",

    wn2_withdrawal_title: "Penarikan On-Chain Otomatis",

    wn2_withdrawal_desc: "Investor dapat menarik kapan saja. USDC dikirim langsung ke dompet investor di jaringan Base — tanpa pemrosesan manual.",

    wn2_sandbox_title: "Sandbox Penarikan (mode Simulate)",

    wn2_sandbox_desc: "Sebelum penarikan nyata, investor dapat menjalankan simulasi lengkap: memeriksa saldo USDC, ETH gas, membangun dan menandatangani transaksi — tetapi tidak menyiarkan.",

    wn2_eip191_title: "Pengungkapan Risiko EIP-191 — Syarat Bertanda Tangan Dompet",

    wn2_eip191_desc: "Sebelum investasi apa pun, investor harus mengakui 8 item risiko spesifik dan menandatangani pengungkapan risiko menggunakan dompet mereka (EIP-191 personal sign).",

    wn2_routing_title: "Setoran Terhubung Indeks — Perutean Terlindungi",

    wn2_routing_desc: "Setiap setoran dikaitkan ke indeks yang dipilih investor melalui intent yang ditandatangani pada saat investasi. Hanya setoran dari dompet yang diautentikasi yang dikreditkan.",

    wn2_session_title: "Batas Waktu Sesi — Kunci Ketidakaktifan 30 Menit",

    wn2_session_desc: "Mengikuti standar keamanan platform keuangan (Binance, Nubank), sesi secara otomatis terputus setelah 30 menit tidak aktif.",

    wn2_toggle_title: "Toggle Mainnet / Testnet",

    wn2_toggle_desc: "Seluruh platform dapat beralih antara Base Mainnet (USDC nyata) dan Base Sepolia Testnet (USDC uji). Mode testnet menampilkan banner oranye di semua halaman.",

    wn_cs_backup: "Otomatisasi backup DB harian",

    wn_cs_notifications: "Notifikasi multi-indeks untuk subscriber via email/webhook",

    wn_cs_escrow: "Smart contract escrow untuk setoran non-kustodial",

    wn_cs_multiwallet: "Dukungan multi-dompet per investor",
    wn_api_ssv_badge: "TERINTEGRASI",
    wn_api_ssv_desc: "Lapisan kecerdasan pasar — semua konteks makro, sentimen, dan data harga yang memberi makan agen AI berasal dari endpoint SoSoValue.",
    wn_api_ssv_fn1: "indeks SSI + sentimen Fear & Greed global",
    wn_api_ssv_fn2: "ukuran buffer stablecoin berbasis AI (5%–30% USDC)",
    wn_api_ssv_fn3: "perhitungan NAV real-time untuk 3 indeks tematik",
    wn_api_ssv_fn4: "kinerja sektor DeFi / AI Crypto / RWA",
    wn_api_sdx_badge: "TERINTEGRASI",
    wn_api_sdx_desc: "Lapisan eksekusi — pembacaan portofolio dan semua perdagangan rebalance dirutekan melalui SoDEX; tidak ada ketergantungan DEX lain.",
    wn_api_sdx_fn1: "saldo token real-time + bobot USD per indeks",
    wn_api_sdx_fn2: "pesanan bertanda tangan EIP-712 → penyelesaian on-chain",
    wn_api_sdx_fn3: "pasangan tersedia untuk penyaringan token agen Scout",
    wn_api_sdx_fn4: "jejak audit lengkap ditampilkan di dasbor Transparansi",

    transp_title: "Auditabilitas On-Chain", transp_tab_decisions: "Keputusan AI", transp_tab_deposits: "Setoran",

    transp_filter_all: "Semua agen", transp_no_decisions: "Belum ada keputusan tercatat.", transp_loading: "Memuat…",

    idx_invest: "Investasi di Indeks Ini", idx_not_found: "Indeks tidak ditemukan.", idx_back: "← Kembali ke Indeks",

    wd_btn: "Tarik", wd_preview_btn: "Pratinjau penarikan", wd_execute: "Jalankan penarikan →",

    sess_expiring: "Sesi akan berakhir", sess_continue: "Tetap terhubung", sess_disconnect: "Putuskan sekarang",

    activity_empty: "Belum ada aktivitas agen terbaru.",
    act_deposit: "Setoran", act_deposit_ok: "Setoran ${amount} USDC dari {wallet}",
    act_refund: "Di bawah minimum", act_refund_sent: "Pengembalian dikirim ke {wallet}",
    act_refund_failed: "Pengembalian GAGAL untuk {wallet}", act_refund_pending: "Pengembalian tertunda untuk {wallet}",
    act_withdrawal: "Penarikan ${amount} USDC", act_manual: "Kredit manual ${amount} USDC", act_min: "Minimum",
    dash_connect_wallet: "Hubungkan Dompet Anda",

    perf_loading: "Memuat…", perf_total_return: "Total Imbal Hasil",

    home_badge: "Dibangun di SoSoValue ValueChain · Didukung oleh SoDEX",

    home_h1a: "Indeks tematik.", home_h1b: "Dikelola oleh AI.", home_h1c: "Diverifikasi on-chain.",

    home_sub: "SoSoMon menjalankan agen AI yang menyaring, menyeimbangkan ulang, dan melaporkan indeks tematik kripto — manajemen portofolio berkualitas institusional, sepenuhnya otomatis.",

    home_explore: "Jelajahi Indeks", home_how: "Cara Kerja",

    home_aum: "Total AUM", home_indexes: "Indeks Aktif", home_subs: "Pelanggan", home_avg30d: "Rata-rata Imbal Hasil 30h",

    home_active: "Indeks Aktif", home_viewall: "Lihat semua",

    home_hiw_title: "Satu orang. Tiga agen AI.",

    home_hiw_sub: "SoSoMon berjalan sepenuhnya pada agen AI yang beroperasi di SoSoValue ValueChain.",

    home_scout_role: "Riset & Penyaringan", home_scout_desc: "Memindai 400+ token setiap hari menggunakan data SoSoValue dan SoDEX. Menghasilkan daftar inklusi berperingkat dengan alasan yang ditulis AI.",

    home_rebal_role: "Pemeliharaan Portofolio", home_rebal_desc: "Memantau drift, skor sentimen, dan likuiditas. Mengeksekusi pesanan di SoDEX.",

    home_narrator_role: "Konten & Laporan", home_narrator_desc: "Menghasilkan Alpha Memo mingguan dan ringkasan pelanggan secara otomatis dari data agen.",

    admin_title: "Akses Admin", admin_subtitle: "Dasbor Pendiri SoSoMon",

    admin_connect_wallet: "Hubungkan dompet Anda untuk autentikasi",

    admin_sign_to_auth: "Tanda Tangani untuk Autentikasi", admin_signing: "Menunggu tanda tangan…",

    admin_sign_desc: "Tanda tangani pesan dengan dompet Anda untuk memverifikasi kepemilikan.",

    admin_not_authorized: "Akses Ditolak",

    admin_not_authorized_desc: "Dompet ini tidak diizinkan. Akses admin dibatasi hanya untuk dompet pendiri.",

    admin_sig_expired: "Tanda tangan kedaluwarsa atau tidak valid.", admin_sig_cancelled: "Tanda tangan dibatalkan.",

    admin_auth_error: "Kesalahan autentikasi. Coba lagi.",

    admin_disconnect: "Putuskan Sambungan",

    admin_total_aum: "Total AUM", admin_subscribers: "Pelanggan", admin_indexes: "Indeks",

    admin_pending: "Tertunda", admin_proposals_label: "proposal",

    admin_fund_portfolio: "Portofolio Dana — SoDEX",

    admin_loading_portfolio: "Memuat portofolio…", admin_loading_balances: "Memuat saldo…",

    admin_no_positions: "Tidak ada posisi ditemukan di dompet dana.",

    admin_total_value: "Total Nilai",

    admin_sodex_not_configured: "Kredensial SoDEX belum dikonfigurasi.",

    admin_fund_wallet_title: "Dompet Dana — Gas & USDC",

    admin_eth_gas: "ETH (gas)", admin_eth_critical: "⚠ Saldo kritis — isi ulang ETH!",

    admin_proposals_title: "Proposal Rebalancing",

    admin_pending_badge: "{n} tertunda", admin_ready_badge: "{n} siap dieksekusi",

    admin_run_rebalancer: "Jalankan Rebalancer", admin_running: "Berjalan…",
    admin_investors: "{n} investor",
    admin_report_title: "Laporan Manajemen", admin_report_close: "Tutup",
    admin_report_proposals_status: "Proposal per Status", admin_report_no_proposals: "Belum ada proposal",
    admin_report_indexes: "Indeks", admin_report_activity: "Aktivitas Terkini", admin_report_proposals_total: "Total Proposal",

    admin_approve: "Setujui", admin_reject: "Tolak", admin_execute: "Eksekusi",

    admin_dry_run: "Uji Coba", admin_no_proposals: "Belum ada proposal rebalancing.",

    admin_no_proposals_sub: "Jalankan agen Rebalancer di atas untuk menghasilkan proposal.",

    admin_trades_title: "Riwayat Perdagangan", admin_no_trades: "Belum ada perdagangan.",

    admin_nav_update: "Perbarui NAV", admin_refreshing: "Memperbarui…",

    admin_network_mainnet: "mainnet", admin_network_testnet: "testnet",

    home_footer: "Bukan saran keuangan. Dibangun di SoSoValue ValueChain. Didukung oleh SoDEX.",
    disclaimer: "SoSoMon hanya untuk tujuan informasi. Bukan saran keuangan. Aset kripto melibatkan risiko kerugian yang signifikan. Kinerja masa lalu tidak menjamin hasil di masa depan.",
    intellectual_credit: "Kreasi intelektual dari Khamalmoney Inc.",

  },

  ko: {

    nav_indexes: "인덱스", nav_transparency: "투명성", nav_whats_new: "새로운 기능",

    nav_dashboard: "대시보드", nav_mainnet: "메인넷", nav_testnet: "테스트넷",

    testnet_banner: "테스트넷 모드 — Base Sepolia — 테스트 USDC, 실제 가치 없음",
    mainnet_banner: "메인넷 모드 — Base Mainnet — 실제 USDC",

    dash_title: "내 포트폴리오", dash_connected: "연결됨:",

    dash_total_value: "총 가치", dash_total_deposited: "총 예치금",

    dash_30d: "30일 수익률", dash_fee: "누적 성과 수수료",

    dash_alltime: "전체 기간", dash_across: "{n}개 인덱스",

    dash_wavg: "가중 평균", dash_hwm: "HWM 초과 수익의 15%",

    dash_empty: "아직 활성 투자가 없습니다.", dash_browse: "인덱스 보기",

    tab_portfolio: "포트폴리오", tab_performance: "성과",

    tab_activity: "AI 활동", tab_macro: "매크로", tab_movements: "거래 내역",

    dash_refund_title: "입금이 자동으로 환불되었습니다",
    mov_deposit: "입금", mov_refund: "환불", mov_withdrawal: "출금", mov_manual: "수동 크레딧",
    mov_empty: "거래 내역이 없습니다.", mov_index: "인덱스", mov_tx: "TX 해시", mov_refund_tx: "환불 TX",
    mov_status_ok: "전송됨", mov_status_failed: "실패", mov_status_pending: "대기 중",
    mov_below_min: "최소 입금액 미만",

    invest_btn: "입금 및 투자", invest_connect: "투자를 위해 지갑 연결",
    invest_wallet_alert: "위에 표시된 지갑에서만 USDC를 보내세요. 다른 주소에서 보낸 입금은 해당 주소에 기록되며 귀하의 계정에는 반영되지 않습니다.",

    invest_title: "위험 공시 — {index}", invest_signed: "서명 완료 — 입금하세요",

    invest_waiting: "확인 대기 중",

    invest_allcheck: "모든 위험을 확인했습니다. 서명하여 계속하세요.",

    invest_sign: "위험 공시 서명", invest_signing: "서명 중…",

    invest_sent: "USDC를 이미 보냈습니다 →", invest_min: "최소: $5 USDC",

    invest_pending: "온체인 확인 후 2~3분 내에 대시보드에 표시됩니다.",

    idx_title: "모든 인덱스", idx_sub: "AI가 관리하는 테마형 포트폴리오. 에이전트에 의해 리밸런싱되고 SoSoValue ValueChain에서 검증됩니다.",

    idx_aum: "AUM", idx_nav: "NAV", idx_30d: "30일 수익률", idx_alltime: "전체 기간",

    idx_loading: "인덱스 로딩 중…",

    net_wrong: "잘못된 네트워크", net_msg: "SoSoMon은 {net}에서 실행됩니다. 전환하여 계속하세요.",

    net_btn: "{net}로 전환", net_switching: "전환 중…",

    wn_title: "새로운 기능", wn_subtitle: "Wave 1이 기반을 구축했습니다. Wave 2가 실제로 만듭니다.",

    wn_wave2_label: "Wave 2 · 2026년 6월", wn_wave1_label: "Wave 1 · 2026년 5월",

    wn_roadmap: "로드맵 (Wave 2 이후)",

    wn_link_transparency: "투명성 로그 보기", wn_link_indexes: "인덱스 찾아보기", wn_link_dashboard: "내 대시보드",

    wn_toggle_free: "비용 없이 전체 흐름 테스트 가능", wn_toggle_eval: "평가자가 자유롭게 테스트 가능", wn_toggle_safe: "실제 자금 손실 위험 없음",

    wn1_agents_title: "3개의 AI 에이전트 출시",

    wn1_agents_desc: "Scout (매일 토큰 스크리닝), Rebalancer (SoDEX 실행), Narrator (시장 해설) — 모두 SoSoValue 매크로 데이터와 통합.",

    wn1_indexes_title: "3개의 테마 인덱스",

    wn1_indexes_desc: "AI×Crypto, RWA, DePIN — 각자의 토큰 유니버스, NAV 계산, AI 생성 구성 종목 설명을 보유.",

    wn1_ssv_api_title: "SoSoValue API 통합",

    wn1_ssv_api_desc: "실시간 SSI 인덱스 구성 종목, 매크로 센티멘트 점수, 공포/탐욕 지수, 테마 뉴스, 벤치마크 성과 데이터.",

    wn1_sodex_title: "SoDEX DEX 통합",

    wn1_sodex_desc: "SoDEX 메인넷의 라이브 시장 데이터 (티커, 캔들, 호가창). EIP-712 서명 요청으로 인증된 API.",

    wn1_dashboard_title: "투자자 대시보드",

    wn1_dashboard_desc: "지갑별 포트폴리오 뷰 — P&L, 30일 수익률, 고수위선, 누적 성과 수수료, AI 활동 피드.",

    wn1_admin_title: "관리자 패널 (지갑 제한)",

    wn1_admin_desc: "EIP-191 지갑 서명 인증. 0x1a3A…031c만 독점 접근. 제안 검토 및 리밸런서 제어.",

    wn2_deposit_title: "실제 온체인 입금 감지",

    wn2_deposit_desc: "입금 모니터는 2분마다 eth_getLogs를 통해 Base 네트워크 (chainId 8453)를 폴링합니다. 각 투자자는 송신 지갑 주소로 식별 — 수동 등록 불필요.",

    wn2_trade_title: "실제 SoDEX 거래 실행",

    wn2_trade_desc: "리밸런서가 인증된 REST API를 통해 SoDEX 메인넷에 실시간 지정가 주문을 제출합니다. 드라이런 모드 지원.",

    wn2_transparency_title: "공개 투명성 페이지",

    wn2_transparency_desc: "모든 AI 결정은 완전한 데이터 입력과 함께 기록됩니다. 모든 입금은 Basescan에서 확인 가능한 tx_hash와 함께 나열됩니다.",

    wn2_sentiment_title: "센티멘트 점수 공식 공개",

    wn2_sentiment_desc: "0–100 점수 공식: 40% SoSoValue 공포/탐욕 + 25% BTC 30일 모멘텀 + 20% 테마 SSI ROI + 15% 알트코인 폭.",

    wn2_gemini_title: "Gemini 2.0 Flash AI 근거",

    wn2_gemini_desc: "Scout 에이전트가 Gemini 2.0 Flash로 업그레이드. 프롬프트에 실제 SoSoValue 벤치마크 데이터, 뉴스 시그널, SoDEX 온체인 가격 포함.",

    wn2_narrator_title: "Narrator가 SSI 구성 요소 인용",

    wn2_narrator_desc: "일일 해설이 각 리밸런싱 결정을 이끈 특정 SoSoValue SSI 인덱스 움직임을 참조합니다.",

    wn2_admin_rebal_title: "관리자: 리밸런서 실행 및 제안 실행",

    wn2_admin_rebal_desc: "관리자 패널에 리밸런서를 수동으로 트리거하고 SoDEX에 개별 제안을 실행하는 버튼이 추가. 드라이런 모드 지원.",

    wn2_admin_portfolio_title: "관리자의 SoDEX 포트폴리오 및 거래 이력",

    wn2_admin_portfolio_desc: "관리자 패널에 실시간 SoDEX 계정 잔액, 오픈 포지션, 방향/가격/수량/수수료 열이 있는 전체 거래 이력이 표시됩니다.",

    wn2_admin_lock_title: "관리자 접근 하드 잠금",

    wn2_admin_lock_desc: "백엔드가 관리자 패널을 단일 승인된 지갑으로 제한합니다. 다른 지갑은 유효한 EIP-191 서명이 있어도 HTTP 403을 받습니다.",

    wn2_withdrawal_title: "자동 온체인 출금",

    wn2_withdrawal_desc: "투자자는 언제든지 출금 가능합니다. USDC는 Base 네트워크의 투자자 지갑으로 직접 전송됩니다.",

    wn2_sandbox_title: "출금 샌드박스 (Simulate 모드)",

    wn2_sandbox_desc: "실제 출금 전에 전체 시뮬레이션을 실행할 수 있습니다: USDC 잔액, ETH 가스 잔액을 확인하고 트랜잭션을 구성하지만 브로드캐스트하지 않습니다.",

    wn2_eip191_title: "EIP-191 위험 공시 — 지갑 서명 조항",

    wn2_eip191_desc: "모든 투자 전에 투자자는 8개의 특정 위험 항목을 개별적으로 확인하고 지갑을 사용하여 EIP-191 personal sign으로 서명해야 합니다.",

    wn2_routing_title: "인덱스 연동 입금 — 보호된 라우팅",

    wn2_routing_desc: "각 입금은 투자 시 등록된 서명된 인텐트를 통해 투자자가 선택한 인덱스에 미리 연결됩니다.",

    wn2_session_title: "세션 시간 초과 — 30분 비활성 잠금",

    wn2_session_desc: "금융 플랫폼 보안 기준 (Binance, Nubank)에 따라 30분 비활성 후 세션이 자동으로 끊깁니다.",

    wn2_toggle_title: "메인넷 / 테스트넷 전환",

    wn2_toggle_desc: "전체 플랫폼이 Base 메인넷 (실제 USDC)과 Base Sepolia 테스트넷 (테스트 USDC) 사이를 전환할 수 있습니다. 테스트넷 모드에서 모든 페이지에 주황색 배너 표시.",

    wn_cs_backup: "일일 DB 백업 자동화",

    wn_cs_notifications: "이메일/웹훅을 통한 멀티 인덱스 구독자 알림",

    wn_cs_escrow: "비수탁 입금을 위한 스마트 계약 에스크로",

    wn_cs_multiwallet: "투자자당 멀티 지갑 지원",
    wn_api_ssv_badge: "통합됨",
    wn_api_ssv_desc: "시장 인텔리전스 레이어 — AI 에이전트에 공급되는 모든 매크로 컨텍스트, 감정 및 가격 데이터는 SoSoValue 엔드포인트에서 제공됩니다.",
    wn_api_ssv_fn1: "SSI 지수 + 글로벌 Fear & Greed 감정",
    wn_api_ssv_fn2: "AI 기반 스테이블코인 버퍼 사이징 (5%–30% USDC)",
    wn_api_ssv_fn3: "3개 테마 지수의 실시간 NAV 계산",
    wn_api_ssv_fn4: "DeFi / AI Crypto / RWA 섹터 성과",
    wn_api_sdx_badge: "통합됨",
    wn_api_sdx_desc: "실행 레이어 — 모든 포트폴리오 읽기 및 리밸런싱 거래는 SoDEX를 통해 라우팅되며 다른 DEX 의존성은 없습니다.",
    wn_api_sdx_fn1: "실시간 토큰 잔액 + 지수별 USD 가중치",
    wn_api_sdx_fn2: "EIP-712 서명 주문 → 온체인 결제",
    wn_api_sdx_fn3: "Scout 에이전트 토큰 스크리닝을 위한 사용 가능한 쌍",
    wn_api_sdx_fn4: "투명성 대시보드에 표시된 전체 감사 추적",

    transp_title: "온체인 감사 가능성", transp_tab_decisions: "AI 결정", transp_tab_deposits: "입금",

    transp_filter_all: "모든 에이전트", transp_no_decisions: "아직 결정이 기록되지 않았습니다.", transp_loading: "로딩 중…",

    idx_invest: "이 인덱스에 투자", idx_not_found: "인덱스를 찾을 수 없습니다.", idx_back: "← 인덱스로 돌아가기",

    wd_btn: "출금", wd_preview_btn: "출금 미리보기", wd_execute: "출금 실행 →",

    sess_expiring: "세션이 만료됩니다", sess_continue: "연결 유지", sess_disconnect: "지금 연결 해제",

    activity_empty: "최근 에이전트 활동이 없습니다.",
    act_deposit: "입금", act_deposit_ok: "{wallet}에서 ${amount} USDC 입금",
    act_refund: "최소 금액 미만", act_refund_sent: "{wallet}으로 환불 발송",
    act_refund_failed: "{wallet} 환불 실패", act_refund_pending: "{wallet} 환불 대기",
    act_withdrawal: "${amount} USDC 출금", act_manual: "${amount} USDC 수동 크레딧", act_min: "최소",
    dash_connect_wallet: "지갑 연결",

    perf_loading: "로딩 중…", perf_total_return: "총 수익률",

    home_badge: "SoSoValue ValueChain 기반 · SoDEX 제공",

    home_h1a: "테마형 인덱스.", home_h1b: "AI가 관리합니다.", home_h1c: "온체인 검증.",

    home_sub: "SoSoMon은 AI 에이전트를 통해 암호화폐 테마 인덱스를 스크리닝, 리밸런싱, 보고합니다 — SoSoValue ValueChain에서 완전 자동화된 기관급 포트폴리오 관리.",

    home_explore: "인덱스 탐색", home_how: "작동 방식",

    home_aum: "총 AUM", home_indexes: "활성 인덱스", home_subs: "구독자", home_avg30d: "평균 30일 수익률",

    home_active: "활성 인덱스", home_viewall: "모두 보기",

    home_hiw_title: "한 사람. 세 개의 AI 에이전트.",

    home_hiw_sub: "SoSoMon은 SoSoValue ValueChain에서 운영되는 AI 에이전트로 완전히 구동됩니다.",

    home_scout_role: "리서치 & 스크리닝", home_scout_desc: "SoSoValue 데이터와 SoDEX 시장 데이터를 사용하여 매일 400개 이상의 토큰을 스캔합니다.",

    home_rebal_role: "포트폴리오 유지관리", home_rebal_desc: "드리프트, 감성 점수, 유동성을 모니터링하고 SoDEX에서 주문을 실행합니다.",

    home_narrator_role: "콘텐츠 & 보고서", home_narrator_desc: "에이전트 데이터에서 주간 Alpha Memo와 구독자 다이제스트를 자동으로 생성합니다.",

    admin_title: "관리자 접근", admin_subtitle: "SoSoMon 창립자 대시보드",

    admin_connect_wallet: "인증을 위해 지갑을 연결하세요",

    admin_sign_to_auth: "서명하여 인증", admin_signing: "서명 대기 중…",

    admin_sign_desc: "소유권 확인을 위해 지갑으로 메시지에 서명하세요.",

    admin_not_authorized: "접근 거부",

    admin_not_authorized_desc: "이 지갑은 권한이 없습니다. 관리자 접근은 창립자 지갑으로만 제한됩니다.",

    admin_sig_expired: "서명이 만료되었거나 유효하지 않습니다.", admin_sig_cancelled: "서명이 취소되었습니다.",

    admin_auth_error: "인증 오류. 다시 시도하세요.",

    admin_disconnect: "연결 끊기",

    admin_total_aum: "총 AUM", admin_subscribers: "구독자", admin_indexes: "인덱스",

    admin_pending: "대기 중", admin_proposals_label: "제안",

    admin_fund_portfolio: "펀드 포트폴리오 — SoDEX",

    admin_loading_portfolio: "포트폴리오 로딩 중…", admin_loading_balances: "잔액 로딩 중…",

    admin_no_positions: "펀드 지갑에 포지션이 없습니다.",

    admin_total_value: "총 가치",

    admin_sodex_not_configured: "SoDEX 자격 증명이 설정되지 않았습니다.",

    admin_fund_wallet_title: "펀드 지갑 — Gas & USDC",

    admin_eth_gas: "ETH (gas)", admin_eth_critical: "⚠ 잔액 위험 — ETH를 충전하세요!",

    admin_proposals_title: "리밸런싱 제안",

    admin_pending_badge: "{n} 대기 중", admin_ready_badge: "{n} 실행 준비됨",

    admin_run_rebalancer: "리밸런서 실행", admin_running: "실행 중…",
    admin_investors: "{n} 명의 투자자",
    admin_report_title: "관리 보고서", admin_report_close: "닫기",
    admin_report_proposals_status: "상태별 제안", admin_report_no_proposals: "아직 제안 없음",
    admin_report_indexes: "인덱스", admin_report_activity: "최근 활동", admin_report_proposals_total: "총 제안",

    admin_approve: "승인", admin_reject: "거부", admin_execute: "실행",

    admin_dry_run: "드라이 런", admin_no_proposals: "아직 리밸런싱 제안이 없습니다.",

    admin_no_proposals_sub: "위의 리밸런서 에이전트를 실행하여 제안을 생성하세요.",

    admin_trades_title: "거래 기록", admin_no_trades: "아직 거래가 없습니다.",

    admin_nav_update: "NAV 업데이트", admin_refreshing: "업데이트 중…",

    admin_network_mainnet: "메인넷", admin_network_testnet: "테스트넷",

    home_footer: "재무 조언이 아닙니다. SoSoValue ValueChain 기반. SoDEX 제공.",
    disclaimer: "SoSoMon은 정보 제공 목적으로만 제공됩니다. 금융 조언이 아닙니다. 암호화폐 자산은 상당한 손실 위험을 수반합니다. 과거 실적이 미래 결과를 보장하지 않습니다.",
    intellectual_credit: "Khamalmoney Inc.의 지적 창작물",

  },

};



// Traduções dos índices (nome + descrição) por slug e idioma

export const INDEX_I18N: Record<string, Record<Lang, { name: string; description: string }>> = {

  "ai-crypto-infrastructure": {

    en: { name: "AI × Crypto Index", description: "Tracks leading AI infrastructure and on-chain AI tokens. Managed by Scout agent with daily momentum screening." },

    pt: { name: "Índice AI × Cripto", description: "Acompanha os principais tokens de infraestrutura de IA e IA on-chain. Gerenciado pelo agente Scout com triagem diária de momentum." },

    zh: { name: "AI × 加密基础设施指数", description: "追踪领先的AI基础设施和链上AI代币。由Scout代理通过每日动量筛选管理。" },

    ja: { name: "AI × クリプトインフラ指数", description: "主要なAIインフラとオンチェーンAIトークンを追跡。Scoutエージェントが毎日モメンタムスクリーニングで管理。" },

    hi: { name: "AI × क्रिप्टो इंडेक्स", description: "प्रमुख AI इंफ्रास्ट्रक्चर और ऑन-चेन AI टोकन ट्रैक करता है। Scout एजेंट द्वारा दैनिक मोमेंटम स्क्रीनिंग के साथ प्रबंधित।" },

    id: { name: "Indeks AI × Kripto", description: "Melacak token infrastruktur AI terkemuka dan AI on-chain. Dikelola oleh agen Scout dengan penyaringan momentum harian." },

    ko: { name: "AI × 크립토 인덱스", description: "주요 AI 인프라 및 온체인 AI 토큰을 추적합니다. Scout 에이전트가 일일 모멘텀 스크리닝으로 관리합니다." },

  },

  "real-world-assets-top10": {

    en: { name: "Real World Assets Index", description: "Tokenized real-world assets: bonds, credit, commodities. Tracks the convergence of TradFi and DeFi." },

    pt: { name: "Índice de Ativos do Mundo Real", description: "Ativos do mundo real tokenizados: títulos, crédito, commodities. Acompanha a convergência de TradFi e DeFi." },

    zh: { name: "现实世界资产指数", description: "代币化现实资产：债券、信贷、大宗商品。追踪传统金融与DeFi的融合。" },

    ja: { name: "リアルワールドアセット指数", description: "トークン化された実世界資産：債券、クレジット、コモディティ。TradFiとDeFiの融合を追跡。" },

    hi: { name: "रियल वर्ल्ड एसेट्स इंडेक्स", description: "टोकनाइज़्ड वास्तविक दुनिया की संपत्ति: बॉन्ड, क्रेडिट, कमोडिटी। TradFi और DeFi के अभिसरण को ट्रैक करता है।" },

    id: { name: "Indeks Aset Dunia Nyata", description: "Aset dunia nyata yang ditokenisasi: obligasi, kredit, komoditas. Melacak konvergensi TradFi dan DeFi." },

    ko: { name: "실물 자산 인덱스", description: "토큰화된 실물 자산: 채권, 신용, 원자재. TradFi와 DeFi의 융합을 추적합니다." },

  },

  "depin-momentum": {

    en: { name: "DePIN Index", description: "Decentralized Physical Infrastructure Networks — wireless, compute, energy, maps. The physical layer of Web3." },

    pt: { name: "Índice DePIN", description: "Redes de Infraestrutura Física Descentralizada — wireless, computação, energia, mapas. A camada física da Web3." },

    zh: { name: "DePIN 指数", description: "去中心化实体基础设施网络——无线、计算、能源、地图。Web3的物理层。" },

    ja: { name: "DePIN指数", description: "分散型物理インフラネットワーク — ワイヤレス、コンピュート、エネルギー、マップ。Web3の物理レイヤー。" },

    hi: { name: "DePIN इंडेक्स", description: "विकेंद्रीकृत भौतिक अवसंरचना नेटवर्क — वायरलेस, कंप्यूट, ऊर्जा, मानचित्र। Web3 की भौतिक परत।" },

    id: { name: "Indeks DePIN", description: "Jaringan Infrastruktur Fisik Terdesentralisasi — nirkabel, komputasi, energi, peta. Lapisan fisik Web3." },

    ko: { name: "DePIN 인덱스", description: "탈중앙화 물리적 인프라 네트워크 — 무선, 컴퓨팅, 에너지, 지도. Web3의 물리적 레이어." },

  },

};



export function tr(lang: Lang, key: string, vars?: Record<string, string | number>): string {

  let s = T[lang]?.[key] ?? T["en"]?.[key] ?? key;

  if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });

  return s;

}

