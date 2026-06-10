import axios from "axios";
import type {
  AlphaIndex,
  AgentActivity,
  MacroData,
  DashboardData,
  ApiResponse,
} from "@/types";

// Empty string = relative URLs → hits Next.js rewrite proxy (/api/* → backend)
// Set NEXT_PUBLIC_API_URL only if frontend and backend are on different origins
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

export const indexApi = {
  getAll: async (networkMode: "mainnet" | "testnet" = "mainnet"): Promise<AlphaIndex[]> => {
    const { data } = await api.get<ApiResponse<AlphaIndex[]>>(`/api/indexes?network_mode=${networkMode}`);
    return data.data;
  },

  getBySlug: async (slug: string, networkMode: "mainnet" | "testnet" = "mainnet"): Promise<AlphaIndex> => {
    const { data } = await api.get<ApiResponse<AlphaIndex>>(`/api/indexes/${slug}?network_mode=${networkMode}`);
    return data.data;
  },
};

// ─── Agents ───────────────────────────────────────────────────────────────────

export const agentApi = {
  getRecentActivity: async (limit = 20): Promise<AgentActivity[]> => {
    const { data } = await api.get<ApiResponse<AgentActivity[]>>(
      `/api/agents/activity?limit=${limit}`
    );
    return data.data;
  },
};

// ─── Macro ────────────────────────────────────────────────────────────────────

export const macroApi = {
  get: async (): Promise<MacroData> => {
    const { data } = await api.get<ApiResponse<MacroData>>("/api/macro");
    return data.data;
  },
};

// ─── Portfolio / Invest ───────────────────────────────────────────────────────

export const investApi = {
  getPortfolio: async (walletAddress: string, networkMode: "mainnet" | "testnet" = "mainnet") => {
    const { data } = await api.get(`/api/invest/portfolio/${walletAddress}?network_mode=${networkMode}`);
    return data;
  },

  invest: async (walletAddress: string, indexId: string, amountUsd: number) => {
    const { data } = await api.post("/api/invest", {
      wallet_address: walletAddress,
      index_id: indexId,
      amount_usd: amountUsd,
    });
    return data;
  },

  getRefunds: async (walletAddress: string, networkMode: "mainnet" | "testnet" = "mainnet") => {
    const { data } = await api.get(`/api/invest/refunds/${walletAddress}?network_mode=${networkMode}`);
    return data.refunds as Array<{amount_usd: number; minimum_usd: number; tx_hash: string; timestamp: string; description: string}>;
  },

  getFundWallet: async (mode: "mainnet" | "testnet" = "mainnet"): Promise<{ address: string | null; usdc_balance: number | null; configured: boolean; network_mode: string }> => {
    const { data } = await api.get(`/api/invest/fund-wallet?mode=${mode}`);
    return data;
  },

  getNetworkConfig: async (mode: "mainnet" | "testnet" = "mainnet") => {
    const { data } = await api.get(`/api/invest/network-config?mode=${mode}`);
    return data;
  },

  withdraw: async (walletAddress: string, indexId: string, amountUsd: number) => {
    const { data } = await api.post("/api/invest/withdraw", {
      wallet_address: walletAddress,
      index_id: indexId,
      amount_usd: amountUsd,
    });
    return data;
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────

function adminHeaders(address: string, message: string, signature: string) {
  return {
    headers: {
      "x-wallet-address": address,
      "x-sign-message": message,
      "x-signature": signature,
    },
  };
}

export const adminApi = {
  verifySignature: async (address: string, message: string, signature: string) => {
    const { data } = await api.post("/api/admin/auth", { address, message, signature });
    return data;
  },

  getProposals: async (address: string, message: string, signature: string) => {
    const { data } = await api.get("/api/admin/proposals", adminHeaders(address, message, signature));
    return data.data;
  },

  approve: async (proposalId: number, address: string, message: string, signature: string) => {
    const { data } = await api.post(`/api/admin/proposals/${proposalId}/approve`, {}, adminHeaders(address, message, signature));
    return data;
  },

  reject: async (proposalId: number, address: string, message: string, signature: string) => {
    const { data } = await api.post(`/api/admin/proposals/${proposalId}/reject`, {}, adminHeaders(address, message, signature));
    return data;
  },

  getStats: async (address: string, message: string, signature: string, networkMode = "mainnet") => {
    const { data } = await api.get(`/api/admin/stats?network_mode=${networkMode}`, adminHeaders(address, message, signature));
    return data.data;
  },

  runRebalancer: async (address: string, message: string, signature: string, dryRun = true) => {
    const { data } = await api.post(
      "/api/admin/run-rebalancer",
      { dry_run: dryRun },
      adminHeaders(address, message, signature)
    );
    return data;
  },

  executeProposal: async (
    proposalId: number,
    address: string,
    message: string,
    signature: string,
    dryRun = false
  ) => {
    const { data } = await api.post(
      `/api/admin/proposals/${proposalId}/execute`,
      { dry_run: dryRun },
      adminHeaders(address, message, signature)
    );
    return data;
  },

  getPortfolio: async (address: string, message: string, signature: string) => {
    const { data } = await api.get("/api/admin/portfolio", adminHeaders(address, message, signature));
    return data.data;
  },

  getTrades: async (address: string, message: string, signature: string, limit = 50) => {
    const { data } = await api.get(
      `/api/admin/trades?limit=${limit}`,
      adminHeaders(address, message, signature)
    );
    return data.data;
  },
  getReport: async (address: string, message: string, signature: string, networkMode: string = "mainnet") => {
    const { data } = await api.get(`/api/admin/report?network_mode=${networkMode}`, adminHeaders(address, message, signature));
    return data.data;
  },

  getFundWallet: async (address: string, message: string, signature: string, networkMode = "mainnet") => {
    const { data } = await api.get(
      `/api/admin/fund-wallet?network_mode=${networkMode}`,
      adminHeaders(address, message, signature)
    );
    return data.data;
  },

  getMovements: async (address: string, message: string, signature: string, networkMode = "mainnet", limit = 50) => {
    const { data } = await api.get(
      `/api/admin/movements?network_mode=${networkMode}&limit=${limit}`,
      adminHeaders(address, message, signature)
    );
    return data;
  },

  alerts: async (address: string, message: string, signature: string) => {
    const { data } = await api.get("/api/admin/alerts", adminHeaders(address, message, signature));
    return data as { alerts: SystemAlert[]; healthy: boolean; checked_at: string };
  },
};

export interface SystemAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  message: string;
  since: string | null;
}

// ─── Performance ─────────────────────────────────────────────────────────────

export const performanceApi = {
  get: async (indexId: string, days = 90, walletAddress?: string) => {
    const params = new URLSearchParams({ days: String(days) });
    if (walletAddress) params.append("wallet_address", walletAddress);
    const { data } = await api.get(`/api/performance/${indexId}?${params}`);
    return data;
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: async (walletAddress: string): Promise<DashboardData> => {
    const { data } = await api.get<ApiResponse<DashboardData>>(
      `/api/dashboard?wallet=${walletAddress}`
    );
    return data.data;
  },
};

// ─── Stats (public) ───────────────────────────────────────────────────────────

export interface PublicStats {
  total_aum_usd: number;
  active_indexes: number;
  total_subscribers: number;
  total_rebalances: number;
  avg_return_30d_pct: number;
}

export const statsApi = {
  get: async (networkMode: "mainnet" | "testnet" = "mainnet"): Promise<PublicStats> => {
    const { data } = await api.get<ApiResponse<PublicStats>>(`/api/stats?network_mode=${networkMode}`);
    return data.data;
  },
};

export default api;
