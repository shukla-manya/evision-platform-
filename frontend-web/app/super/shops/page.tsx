'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  CheckCircle,
  Loader2,
  Eye,
  ShieldAlert,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type AdminRow = {
  id: string;
  shop_name?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  gst_no?: string;
  created_at?: string;
  address?: string;
  status?: string;
  platform_commission_pct?: number;
};

const statusColors: Record<string, string> = {
  pending: 'bg-ev-warning/10 text-ev-warning border border-ev-warning/20',
  approved: 'bg-ev-success/10 text-ev-success border border-ev-success/20',
  rejected: 'bg-ev-error/10 text-ev-error border border-ev-error/20',
  suspended: 'bg-ev-subtle/20 text-ev-muted border border-ev-border',
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function RegisteredShopsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [statsByAdmin, setStatsByAdmin] = useState<Record<string, { orders: number; revenue: number }>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commissionEdit, setCommissionEdit] = useState<Record<string, string>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [admRes, anRes] = await Promise.all([superadminApi.getAllAdmins(), superadminApi.getAnalytics()]);
      setAdmins(Array.isArray(admRes.data) ? (admRes.data as AdminRow[]) : []);
      const an = anRes.data as {
        revenue_by_shop?: { admin_id: string; amount: number; order_count?: number }[];
      };
      const map: Record<string, { orders: number; revenue: number }> = {};
      (an.revenue_by_shop || []).forEach((r) => {
        map[r.admin_id] = { orders: r.order_count ?? 0, revenue: r.amount };
      });
      setStatsByAdmin(map);
    } catch {
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function toggleSuspend(id: string, currentStatus: string) {
    setActionLoading(id + '_suspend');
    try {
      await superadminApi.suspendAdmin(id);
      toast.success(currentStatus === 'suspended' ? 'Shop reactivated' : 'Shop suspended');
      await loadAll();
    } catch {
      toast.error('Failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function saveCommission(id: string) {
    const raw = commissionEdit[id];
    if (raw === undefined) return;
    const pct = Number(raw);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Commission must be between 0 and 100');
      return;
    }
    setActionLoading(id + '_comm');
    try {
      await superadminApi.setPlatformCommission(id, pct);
      toast.success('Commission saved');
      setCommissionEdit((c) => {
        const next = { ...c };
        delete next[id];
        return next;
      });
      await loadAll();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed to save'));
    } finally {
      setActionLoading(null);
    }
  }

  const sorted = [...admins].sort(
    (a, b) =>
      new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime(),
  );

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ev-text mb-1">Registered shops</h1>
            <p className="text-ev-muted text-sm">Approved and pending shop admins — commission and access</p>
          </div>
          <button
            type="button"
            onClick={() => loadAll()}
            className="ev-btn-secondary inline-flex items-center gap-2 py-2 px-4 text-sm self-start"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading && admins.length === 0 ? (
          <div className="flex justify-center py-24">
            <Loader2 size={32} className="animate-spin text-ev-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="ev-card p-16 text-center text-ev-muted">No shops yet</div>
        ) : (
          <div className="ev-card overflow-hidden border-ev-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                    <th className="px-4 py-3 font-semibold">Shop</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Orders</th>
                    <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 font-semibold">Commission</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((admin) => {
                    const st = statsByAdmin[admin.id] || { orders: 0, revenue: 0 };
                    const pct = Number(admin.platform_commission_pct ?? 10);
                    const pctInput = commissionEdit[admin.id] ?? String(pct);
                    return (
                      <tr key={admin.id} className="border-b border-ev-border last:border-0 align-top">
                        <td className="px-4 py-3 font-medium text-ev-text">
                          <span className="inline-flex items-center gap-2">
                            <Store size={14} className="text-ev-primary shrink-0" />
                            {admin.shop_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ev-text">{admin.owner_name}</td>
                        <td className="px-4 py-3 text-ev-muted max-w-[180px] truncate" title={admin.email}>
                          {admin.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${statusColors[admin.status ?? ''] || ''}`}>
                            {admin.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{st.orders}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{formatINR(st.revenue)}</td>
                        <td className="px-4 py-3 text-ev-muted whitespace-nowrap">
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 max-w-[140px]">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              className="ev-input py-1.5 text-xs w-16"
                              value={pctInput}
                              onChange={(e) => setCommissionEdit((c) => ({ ...c, [admin.id]: e.target.value }))}
                            />
                            <span className="text-ev-muted text-xs">%</span>
                            <button
                              type="button"
                              disabled={actionLoading === admin.id + '_comm'}
                              onClick={() => saveCommission(admin.id)}
                              className="text-xs font-semibold text-ev-primary hover:text-ev-primary-light whitespace-nowrap"
                            >
                              Save
                            </button>
                          </div>
                          <p className="text-[10px] text-ev-subtle mt-1">Platform commission % of each order</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end items-end sm:items-center">
                            <button
                              type="button"
                              onClick={() => setDetailId(detailId === admin.id ? null : admin.id)}
                              className="text-xs font-semibold text-ev-primary inline-flex items-center gap-1"
                            >
                              <Eye size={12} />
                              {detailId === admin.id ? 'Hide' : 'Details'}
                            </button>
                            {admin.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => toggleSuspend(admin.id, admin.status ?? '')}
                                disabled={!!actionLoading}
                                className="text-xs font-semibold text-ev-warning inline-flex items-center gap-1"
                              >
                                <ShieldAlert size={12} />
                                Suspend
                              </button>
                            )}
                            {admin.status === 'suspended' && (
                              <button
                                type="button"
                                onClick={() => toggleSuspend(admin.id, 'suspended')}
                                disabled={!!actionLoading}
                                className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1"
                              >
                                <CheckCircle size={12} />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {detailId ? (
          <div className="mt-6 ev-card p-5 border-ev-border text-sm space-y-2">
            {(() => {
              const a = admins.find((x) => x.id === detailId);
              if (!a) return null;
              return (
                <>
                  <p className="font-semibold text-ev-text">Shop details</p>
                  <p className="text-ev-muted">
                    <span className="text-ev-text">Phone:</span> {a.phone || '—'}
                  </p>
                  <p className="text-ev-muted">
                    <span className="text-ev-text">GST:</span> {a.gst_no || '—'}
                  </p>
                  <p className="text-ev-muted">
                    <span className="text-ev-text">Address:</span> {a.address || '—'}
                  </p>
                  <Link href="/super/settlements" className="inline-flex items-center gap-1 text-ev-primary text-sm font-semibold mt-2">
                    <IndianRupee size={14} />
                    View settlements
                  </Link>
                </>
              );
            })()}
          </div>
        ) : null}
      </main>
    </SuperadminShell>
  );
}
