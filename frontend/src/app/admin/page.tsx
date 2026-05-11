"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CheckCircle2, XCircle, RefreshCw, Clock, BarChart3, Users, DollarSign, AlertTriangle, ShieldCheck } from "lucide-react";
import { adminApi } from "@/lib/api";

interface Proposal {
  id: number;
  index_id: string;
  index_name: string;
  status: "pending" | "approved" | "rejected" | "executed";
  trigger: string;
  proposed_at: string;
  approved_at: string | null;
  executed_at: string | null;
  changes: Array<{ symbol: string; old_weight: number; new_weight: number; action: string }>;
  ai_rationale: string;
}

interface AdminStats {
  total_subscribers: number;
  pro_subscribers: number;
  total_aum_usd: number;
  pending_proposals: number;
  indexes: Array<{ id: string; name: string; aum_usd: number; subscriber_count: number; return_30d_pct: number }>;
}

interface AuthSession {
  address: string;
  message: string;
  signature: string;
}

function fmtUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  executed: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
};

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [signing, setSigning] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Limpa sessão se trocar de wallet
  useEffect(() => {
    setSession(null);
    setAuthError("");
  }, [address]);

  async function handleSign() {
    if (!address) return;
    setSigning(true);
    setAuthError("");
    try {
      const ts = Math.floor(Date.now() / 1000);
      const message = `SoSoMon Admin Access\nAddress: ${address}\nts:${ts}`;
      const signature = await signMessageAsync({ message });

      // Verifica no backend
      await adminApi.verifySignature(address, message, signature);

      setSession({ address, message, signature });
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setAuthError("Assinatura inválida ou expirada.");
      } else if ((e as { name?: string })?.name === "UserRejectedRequestError") {
        setAuthError("Assinatura cancelada.");
      } else {
        setAuthError("Erro ao autenticar.");
      }
    } finally {
      setSigning(false);
    }
  }

  async function loadData() {
    if (!session) return;
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        adminApi.getProposals(session.address, session.message, session.signature),
        adminApi.getStats(session.address, session.message, session.signature),
      ]);
      setProposals(p ?? []);
      setStats(s ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function handleApprove(id: number) {
    if (!session) return;
    setActionId(id);
    try {
      await adminApi.approve(id, session.address, session.message, session.signature);
      await loadData();
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: number) {
    if (!session) return;
    setActionId(id);
    try {
      await adminApi.reject(id, session.address, session.message, session.signature);
      await loadData();
    } finally {
      setActionId(null);
    }
  }

  // Não conectado
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="w-full max-w-sm card text-center">
          <ShieldCheck size={36} className="text-brand-blue mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-1">Admin Access</h1>
          <p className="text-white/40 text-sm mb-6">Connect your wallet to authenticate</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Conectado mas não autenticado
  if (!session) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="w-full max-w-sm card text-center">
          <ShieldCheck size={36} className="text-brand-blue mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-1">Admin Access</h1>
          <p className="text-white/40 text-sm mb-2">SoSoMon Founder Dashboard</p>
          <p className="text-xs text-white/30 font-mono mb-6">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </p>
          <p className="text-white/50 text-sm mb-4">
            Sign a message with your wallet to verify ownership and access the admin panel.
          </p>
          {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
          <button
            onClick={handleSign}
            disabled={signing}
            className="btn-primary w-full disabled:opacity-50"
          >
            {signing ? "Waiting for signature…" : "Sign to Authenticate"}
          </button>
          <div className="mt-4">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const pending = proposals.filter((p) => p.status === "pending");

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="border-b border-white/5 bg-black/60 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold">SoSoMon</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40 text-sm">Founder Admin</span>
          <span className="text-xs text-white/20 font-mono">
            {session.address.slice(0, 6)}…{session.address.slice(-4)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSession(null)} className="text-white/20 hover:text-white/50 text-xs transition-colors">
            Disconnect
          </button>
          <button onClick={loadData} className="text-white/30 hover:text-white transition-colors">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><DollarSign size={13} className="text-white/30" /><p className="stat-label">Total AUM</p></div>
              <p className="stat-value">{fmtUSD(stats.total_aum_usd)}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><Users size={13} className="text-white/30" /><p className="stat-label">Subscribers</p></div>
              <p className="stat-value">{stats.total_subscribers}</p>
              <p className="text-xs text-white/30">{stats.pro_subscribers} Pro</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><BarChart3 size={13} className="text-white/30" /><p className="stat-label">Indexes</p></div>
              <p className="stat-value">{stats.indexes.length}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={13} className="text-amber-400" /><p className="stat-label">Pending</p></div>
              <p className={`stat-value ${stats.pending_proposals > 0 ? "text-amber-400" : "text-white"}`}>{stats.pending_proposals}</p>
              <p className="text-xs text-white/30">proposals</p>
            </div>
          </div>
        )}

        {stats && stats.indexes.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Index Overview</h2>
            <div className="space-y-2">
              {stats.indexes.map((idx) => (
                <div key={idx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/3">
                  <div>
                    <p className="text-sm text-white font-medium">{idx.name}</p>
                    <p className="text-xs text-white/30">{idx.subscriber_count} investors</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{fmtUSD(idx.aum_usd)}</p>
                    <p className={`text-xs ${idx.return_30d_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {idx.return_30d_pct >= 0 ? "+" : ""}{idx.return_30d_pct.toFixed(1)}% 30d
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">
              Rebalance Proposals
              {pending.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                  {pending.length} pending
                </span>
              )}
            </h2>
          </div>

          {proposals.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-white/30 text-sm">No rebalance proposals yet.</p>
              <p className="text-white/20 text-xs mt-1">Proposals appear here when the Rebalancer agent generates them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <div key={p.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>
                          {p.status}
                        </span>
                        <span className="text-xs text-white/40 font-mono">{p.index_name}</span>
                        <span className="text-xs text-white/20">trigger: {p.trigger}</span>
                        <span className="text-xs text-white/20 flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(p.proposed_at)}
                        </span>
                      </div>

                      <p className="text-sm text-white/60 leading-relaxed">{p.ai_rationale}</p>

                      {p.changes && p.changes.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                            className="text-xs text-brand-blue hover:underline"
                          >
                            {expanded === p.id ? "Hide" : "Show"} {p.changes.length} changes
                          </button>
                          {expanded === p.id && (
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                              {p.changes.map((c, i) => (
                                <div key={i} className="bg-white/3 rounded-lg p-2 text-xs">
                                  <span className="text-white font-mono">{c.symbol}</span>
                                  <span className="text-white/30 ml-2">{c.action}</span>
                                  {c.old_weight !== undefined && (
                                    <div className="text-white/30 mt-0.5">
                                      {c.old_weight}% → <span className="text-white">{c.new_weight}%</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {p.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleReject(p.id)}
                          disabled={actionId === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs transition-all disabled:opacity-40"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(p.id)}
                          disabled={actionId === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs transition-all disabled:opacity-40"
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                      </div>
                    )}

                    {p.status !== "pending" && (
                      <div className="text-xs text-white/20 shrink-0">
                        {p.approved_at && <p>Approved {timeAgo(p.approved_at)}</p>}
                        {p.executed_at && <p>Executed {timeAgo(p.executed_at)}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
