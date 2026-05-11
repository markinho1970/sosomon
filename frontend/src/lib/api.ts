import axios from "axios";
import type {
  AlphaIndex,
  AgentActivity,
  MacroData,
  DashboardData,
  ApiResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

export const indexApi = {
  getAll: async (): Promise<AlphaIndex[]> => {
    const { data } = await api.get<ApiResponse<AlphaIndex[]>>("/api/indexes");
    return data.data;
  },

  getBySlug: async (slug: string): Promise<AlphaIndex> => {
    const { data } = await api.get<ApiResponse<AlphaIndex>>(`/api/indexes/${slug}`);
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
  getPortfolio: async (walletAddress: string) => {
    const { data } = await api.get(`/api/invest/portfolio/${walletAddress}`);
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

  getFundWallet: async (): Promise<{ address: string | null; usdc_balance: number | null; configured: boolean }> => {
    const { data } = await api.get("/api/invest/fund-wallet");
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

  getStats: async (address: string, message: string, signature: string) => {
    const { data } = await api.get("/api/admin/stats", adminHeaders(address, message, signature));
    return data.data;
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
  get: async (): Promise<PublicStats> => {
    const { data } = await api.get<ApiResponse<PublicStats>>("/api/stats");
    return data.data;
  },
};

export default api;
