/**
 * Admin Dashboard — /admin
 *
 * Internal monitoring page for trait distribution, mint activity,
 * supply progress, and credit system health. Not linked in navigation.
 * Access by URL only.
 */

import { useState, useEffect, useCallback } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';


// ─── Types ───

interface TraitPricing {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
  fairShare: number;
  percentOfFairShare: number;
}

interface PricingResponse {
  traits: Record<string, TraitPricing>;
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

function statusBadge(pct: number): { label: string; className: string } {
  if (pct > 100) return { label: `${pct}%`, className: 'badge-error' };
  if (pct >= 50) return { label: `${pct}%`, className: 'badge-warning' };
  return { label: `${pct}%`, className: 'badge-success' };
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
}: {
  category: string;
  traits: { name: string; data: TraitPricing }[];
}) {
  const sorted = [...traits].sort((a, b) => b.data.usageCount - a.data.usageCount);

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {category}
        <span className="text-muted text-xs ml-2">
          (fair share: {sorted[0]?.data.fairShare ?? '—'})
        </span>
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Trait</th>
              <th>Used</th>
              <th>Effective</th>
              <th>Surcharge</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const isExempt =
                t.name === 'No Headgear' || t.name === 'No Face Wear';
              const badge = statusBadge(t.data.percentOfFairShare);
              return (
                <tr key={t.name}>
                  <td style={{ color: 'var(--color-text)', fontSize: '0.8125rem' }}>
                    {t.name}
                  </td>
                  <td>{t.data.usageCount}</td>
                  <td>{t.data.effectiveUsage.toFixed(1)}</td>
                  <td>
                    {isExempt ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span style={{ color: 'var(--color-primary)' }}>
                        {t.data.surchargeXch.toFixed(3)}
                      </span>
                    )}
                  </td>
                  <td>
                    {isExempt ? (
                      <span className="badge" style={{ fontSize: '0.6875rem' }}>exempt</span>
                    ) : (
                      <span className={`badge ${badge.className}`} style={{ fontSize: '0.6875rem' }}>
                        {badge.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted" style={{ textAlign: 'center' }}>
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

// ─── Main Page ───

export default function Admin() {
  const { contentPadding } = useLayout();

  const adminSecret = (window as any).__ADMIN_SECRET__ || '';

  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [creditStats, setCreditStats] = useState<CreditStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const authHeaders = { 'Authorization': `Bearer ${adminSecret}` };

      const [pricingRes, mintsRes, creditsRes] = await Promise.all([
        fetch('/api/mint/pricing'),
        fetch('/api/admin/recent-mints?limit=20', { headers: authHeaders }),
        fetch('/api/admin/credit-stats', { headers: authHeaders }),
      ]);

      if (mintsRes.status === 401 || creditsRes.status === 401) {
        setError('Invalid admin secret. Check your ?secret= parameter.');
        setLoading(false);
        return;
      }

      if (pricingRes.ok) setPricing(await pricingRes.json());
      if (mintsRes.ok) setRecentMints((await mintsRes.json()).mints || []);
      if (creditsRes.ok) setCreditStats(await creditsRes.json());
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

          {/* Trait Distribution */}
          {surchargeCategories.map((cat) => (
            <TraitTable
              key={cat}
              category={cat}
              traits={traitsByCategory[cat] || []}
            />
          ))}

          {/* Recent Mints */}
          <RecentMintsTable mints={recentMints} />
        </div>
      </div>
    </PageTransition>
  );
}
