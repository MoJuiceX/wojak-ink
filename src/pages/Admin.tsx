/**
 * Admin Dashboard — /admin
 *
 * Internal monitoring page for trait distribution, mint activity,
 * supply progress, and credit system health. Not linked in navigation.
 * Access by URL only.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';


// ─── Types ───

interface TraitPricing {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
}

interface PricingResponse {
  traits: Record<string, TraitPricing>;
  top3: Record<string, string[]>;
  supply: { minted: number; total: number };
  floorPrice: number;
}

interface RecentMint {
  mintNumber: number;
  wallet: string;
  mintType: string;
  totalPriceXch: number | null;
  surchargeXch: number | null;
  highestSurchargeTrait: string | null;
  mintedAt: string;
  layers: Record<string, string> | null;
}

interface CreditStats {
  totalEarned: number;
  totalSpent: number;
  freeMints: number;
  walletCount: number;
  avgPerWallet: number;
}

interface FlaggedMint {
  id: number;
  mint_number: number | null;
  wallet_address: string;
  step: string;
  mint_type: string;
  error_message: string | null;
  error_code: string | null;
  mintgarden_launcher_id: string | null;
  phase2_mint_id: number | null;
  created_at: string;
}

// ─── Helpers ───

function shortWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return addr.slice(0, 8) + '...' + addr.slice(-4);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function surchargeColor(xch: number): string {
  if (xch >= 0.5) return 'var(--color-error)';
  if (xch >= 0.1) return 'var(--color-primary)';
  return 'var(--color-text-secondary)';
}

// ─── Sections ───

function SupplyProgress({ minted, total }: { minted: number; total: number }) {
  const pct = total > 0 ? (minted / total) * 100 : 0;
  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        Supply Progress
      </h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
          {minted.toLocaleString()}
        </span>
        <span className="text-secondary text-sm">/ {total.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div
        className="w-full overflow-hidden"
        style={{
          height: 8,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-border)',
        }}
      >
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

function TraitTable({
  category,
  traits,
  top3,
}: {
  category: string;
  traits: { name: string; data: TraitPricing }[];
  top3: string[];
}) {
  const sorted = [...traits].sort((a, b) => b.data.surchargeXch - a.data.surchargeXch || a.name.localeCompare(b.name));

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {category}
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Trait</th>
              <th>Used</th>
              <th>Effective</th>
              <th>Surcharge</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const isExempt =
                t.name === 'No Headgear' || t.name === 'No Face Wear';
              const isTop3 = top3.includes(t.name);
              return (
                <tr key={t.name}>
                  <td style={{ color: 'var(--color-text)', fontSize: '0.8125rem' }}>
                    {t.name}
                    {isTop3 && (
                      <span
                        className="ml-1.5"
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'rgba(255,107,0,0.15)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        Top 3
                      </span>
                    )}
                    {isExempt && (
                      <span className="badge ml-1.5" style={{ fontSize: '0.625rem' }}>exempt</span>
                    )}
                  </td>
                  <td>{t.data.usageCount}</td>
                  <td>{t.data.effectiveUsage.toFixed(1)}</td>
                  <td>
                    {isExempt ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span style={{ color: surchargeColor(t.data.surchargeXch) }}>
                        {t.data.surchargeXch.toFixed(3)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted" style={{ textAlign: 'center' }}>
                  No usage data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentMintsTable({ mints }: { mints: RecentMint[] }) {
  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        Recent Mints
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Wallet</th>
              <th>Type</th>
              <th>Price</th>
              <th>Surcharge Trait</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {mints.map((m) => (
              <tr key={m.mintNumber}>
                <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  {m.mintNumber}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {shortWallet(m.wallet)}
                </td>
                <td>
                  <span
                    className={`badge ${m.mintType === 'free' ? 'badge-cyan' : 'badge-success'}`}
                    style={{ fontSize: '0.6875rem' }}
                  >
                    {m.mintType}
                  </span>
                </td>
                <td>
                  {m.totalPriceXch != null
                    ? `${m.totalPriceXch.toFixed(3)} XCH`
                    : '—'}
                </td>
                <td className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {m.highestSurchargeTrait || '—'}
                </td>
                <td className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {timeAgo(m.mintedAt)}
                </td>
              </tr>
            ))}
            {mints.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: 'center' }}>
                  No mints yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreditHealth({ stats }: { stats: CreditStats | null }) {
  if (!stats) {
    return (
      <div className="card-static p-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Credit System Health
        </h3>
        <p className="text-muted text-sm mt-2">Loading...</p>
      </div>
    );
  }

  const rows = [
    { label: 'Total Credits Earned', value: stats.totalEarned.toLocaleString() },
    { label: 'Total Credits Spent', value: stats.totalSpent.toLocaleString() },
    { label: 'Free Mints Used', value: stats.freeMints.toLocaleString() },
    { label: 'Wallets with Credits', value: stats.walletCount.toLocaleString() },
    { label: 'Avg Credits / Wallet', value: stats.avgPerWallet.toLocaleString() },
  ];

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        Credit System Health
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col">
            <span className="text-muted" style={{ fontSize: '0.6875rem' }}>
              {r.label}
            </span>
            <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Safety Rail ───

function MintSafetyRail({
  flaggedMints,
  adminSecret,
  onRefresh,
}: {
  flaggedMints: FlaggedMint[];
  adminSecret: string;
  onRefresh: () => void;
}) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  const [actionResults, setActionResults] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh every 30s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(onRefresh, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, onRefresh]);

  const handleRetry = async (jobId: number) => {
    setActionLoading((prev) => ({ ...prev, [jobId]: 'retry' }));
    setActionResults((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
    try {
      const res = await fetch('/api/mint/admin/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionResults((prev) => ({ ...prev, [jobId]: { ok: true, msg: `Retrying (${data.newStep})` } }));
        setTimeout(onRefresh, 1500);
      } else {
        setActionResults((prev) => ({ ...prev, [jobId]: { ok: false, msg: data.error || 'Retry failed' } }));
      }
    } catch {
      setActionResults((prev) => ({ ...prev, [jobId]: { ok: false, msg: 'Network error' } }));
    } finally {
      setActionLoading((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
    }
  };

  const handleMarkRefund = async (jobId: number, phase2MintId: number) => {
    setActionLoading((prev) => ({ ...prev, [jobId]: 'refund' }));
    setActionResults((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
    try {
      const res = await fetch('/api/mint/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ action: 'mark', mintId: phase2MintId, reason: 'Admin marked for refund via safety rail' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionResults((prev) => ({ ...prev, [jobId]: { ok: true, msg: 'Marked for refund' } }));
        setTimeout(onRefresh, 1500);
      } else {
        setActionResults((prev) => ({ ...prev, [jobId]: { ok: false, msg: data.error || 'Refund failed' } }));
      }
    } catch {
      setActionResults((prev) => ({ ...prev, [jobId]: { ok: false, msg: 'Network error' } }));
    } finally {
      setActionLoading((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
    }
  };

  const stepBadgeClass = (step: string): string => {
    if (step === 'failed') return 'badge-error';
    if (step === 'refunded') return 'badge-warning';
    return 'badge';
  };

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Mint Safety Rail
          {flaggedMints.length > 0 && (
            <span
              className="badge badge-error ml-2"
              style={{ fontSize: '0.625rem' }}
            >
              {flaggedMints.length}
            </span>
          )}
        </h3>
        <label className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          Auto-refresh
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Mint #</th>
              <th>Wallet</th>
              <th>Step</th>
              <th>Error</th>
              <th>Launcher ID</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flaggedMints.map((m) => (
              <tr key={m.id}>
                <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  {m.id}
                </td>
                <td>{m.mint_number ?? '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {shortWallet(m.wallet_address)}
                </td>
                <td>
                  <span
                    className={`badge ${stepBadgeClass(m.step)}`}
                    style={{ fontSize: '0.6875rem' }}
                  >
                    {m.step}
                  </span>
                </td>
                <td
                  className="text-muted"
                  style={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={m.error_message || ''}
                >
                  {m.error_message || '—'}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  {m.mintgarden_launcher_id
                    ? shortWallet(m.mintgarden_launcher_id)
                    : '—'}
                </td>
                <td className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  {timeAgo(m.created_at)}
                </td>
                <td>
                  <div className="flex gap-1.5 items-center">
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.6875rem', padding: '2px 8px' }}
                      disabled={!!actionLoading[m.id]}
                      onClick={() => handleRetry(m.id)}
                    >
                      {actionLoading[m.id] === 'retry' ? '...' : 'Retry'}
                    </button>
                    {m.mint_type === 'paid' && m.mintgarden_launcher_id && m.phase2_mint_id && (
                      <button
                        className="btn btn-ghost"
                        style={{
                          fontSize: '0.6875rem',
                          padding: '2px 8px',
                          color: 'var(--color-error)',
                        }}
                        disabled={!!actionLoading[m.id]}
                        onClick={() => handleMarkRefund(m.id, m.phase2_mint_id!)}
                      >
                        {actionLoading[m.id] === 'refund' ? '...' : 'Refund'}
                      </button>
                    )}
                    {actionResults[m.id] && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          color: actionResults[m.id].ok ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {actionResults[m.id].msg}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {flaggedMints.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted" style={{ textAlign: 'center' }}>
                  No flagged mints — all clear
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function Admin() {
  const { contentPadding } = useLayout();

  const adminSecret = (window as any).__ADMIN_SECRET__ || '';

  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [creditStats, setCreditStats] = useState<CreditStats | null>(null);
  const [flaggedMints, setFlaggedMints] = useState<FlaggedMint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const authHeaders = { 'Authorization': `Bearer ${adminSecret}` };

      const [pricingRes, mintsRes, creditsRes, flaggedRes] = await Promise.all([
        fetch('/api/mint/pricing'),
        fetch('/api/admin/recent-mints?limit=20', { headers: authHeaders }),
        fetch('/api/admin/credit-stats', { headers: authHeaders }),
        fetch('/api/mint/admin/flagged', { headers: authHeaders }),
      ]);

      if (mintsRes.status === 401 || creditsRes.status === 401) {
        setError('Invalid admin secret. Check your ?secret= parameter.');
        setLoading(false);
        return;
      }

      if (pricingRes.ok) setPricing(await pricingRes.json());
      if (mintsRes.ok) setRecentMints((await mintsRes.json()).mints || []);
      if (creditsRes.ok) setCreditStats(await creditsRes.json());
      if (flaggedRes.ok) {
        const flaggedData = await flaggedRes.json();
        setFlaggedMints(flaggedData.jobs || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Group traits by category (only surcharge categories)
  const surchargeCategories = ['Head', 'Clothes', 'Face Wear'];
  const traitsByCategory: Record<string, { name: string; data: TraitPricing }[]> = {};

  if (pricing) {
    for (const category of surchargeCategories) {
      traitsByCategory[category] = [];
    }
    for (const [key, data] of Object.entries(pricing.traits)) {
      const sepIdx = key.indexOf('_');
      if (sepIdx === -1) continue;
      const category = key.substring(0, sepIdx);
      const traitName = key.substring(sepIdx + 1);
      // Handle "Face Wear" which has a space
      const normalizedCategory = surchargeCategories.find(
        (c) => c === category || c.replace(' ', '') === category
      );
      if (normalizedCategory) {
        if (!traitsByCategory[normalizedCategory]) {
          traitsByCategory[normalizedCategory] = [];
        }
        traitsByCategory[normalizedCategory].push({ name: traitName, data });
      }
    }
  }

  if (!adminSecret) {
    return (
      <PageTransition>
        <div className="min-h-full flex items-center justify-center" style={{ padding: contentPadding }}>
          <div className="card-static p-6 flex flex-col gap-3" style={{ maxWidth: 400, textAlign: 'center' }}>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              Access Denied
            </h2>
            <p className="text-secondary text-sm">
              You do not have permission to view this page.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-full" style={{ padding: contentPadding }}>
        <div className="flex flex-col gap-4 pb-24" style={{ maxWidth: 960 }}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              Admin Dashboard
            </h1>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem' }}
              onClick={fetchAll}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div
              className="card-static p-3"
              style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              {error}
            </div>
          )}

          {/* Supply */}
          {pricing && (
            <SupplyProgress
              minted={pricing.supply.minted}
              total={pricing.supply.total}
            />
          )}

          {/* Credit Health */}
          <CreditHealth stats={creditStats} />

          {/* Safety Rail */}
          <MintSafetyRail
            flaggedMints={flaggedMints}
            adminSecret={adminSecret}
            onRefresh={fetchAll}
          />

          {/* Trait Distribution */}
          {surchargeCategories.map((cat) => (
            <TraitTable
              key={cat}
              category={cat}
              traits={traitsByCategory[cat] || []}
              top3={pricing?.top3?.[cat] || []}
            />
          ))}

          {/* Recent Mints */}
          <RecentMintsTable mints={recentMints} />
        </div>
      </div>
    </PageTransition>
  );
}
