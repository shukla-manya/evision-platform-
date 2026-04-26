'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type ShopRow = {
  admin_id: string;
  shop_name: string;
  orders_this_period: number;
  gross_amount: number;
  commission_deducted: number;
  net_payable: number;
  platform_commission_pct: number;
  last_settled_at: string | null;
};

type SettlementsPayload = {
  summary: {
    total_collected: number;
    total_settled: number;
    pending_to_settle: number;
    platform_commission_earned: number;
  };
  shops: ShopRow[];
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PaymentSettlementsPage() {
  const [data, setData] = useState<SettlementsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await superadminApi.getSettlements();
      setData(d as SettlementsPayload);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Could not load settlements'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markSettled(adminId: string) {
    setActing(adminId);
    try {
      await superadminApi.markShopSettled(adminId);
      toast.success('Marked as settled for this period');
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed'));
    } finally {
      setActing(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-6xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-ev-indigo/30 flex items-center justify-center">
            <Wallet className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ev-text">Payment settlements</h1>
            <p className="text-ev-muted text-sm">Per-shop payouts after platform commission</p>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center gap-2 text-ev-muted py-20">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading…
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 my-10">
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm">Total collected</p>
                <p className="text-xl font-bold text-ev-text mt-1">{formatINR(data.summary.total_collected)}</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm">Total settled (net)</p>
                <p className="text-xl font-bold text-ev-text mt-1">{formatINR(data.summary.total_settled)}</p>
              </div>
              <div className="ev-card p-5 border-ev-border border-ev-warning/20 bg-ev-warning/5">
                <p className="text-ev-muted text-sm">Pending to settle</p>
                <p className="text-xl font-bold text-ev-text mt-1">{formatINR(data.summary.pending_to_settle)}</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm">Platform commission earned</p>
                <p className="text-xl font-bold text-ev-text mt-1">{formatINR(data.summary.platform_commission_earned)}</p>
              </div>
            </div>

            <div className="ev-card overflow-hidden border-ev-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                      <th className="px-4 py-3 font-semibold">Shop</th>
                      <th className="px-4 py-3 font-semibold text-right">Orders (period)</th>
                      <th className="px-4 py-3 font-semibold text-right">Gross</th>
                      <th className="px-4 py-3 font-semibold text-right">Commission</th>
                      <th className="px-4 py-3 font-semibold text-right">Net payable</th>
                      <th className="px-4 py-3 font-semibold">Last settled</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.shops.map((s) => (
                      <tr key={s.admin_id} className="border-b border-ev-border last:border-0">
                        <td className="px-4 py-3 font-medium text-ev-text">{s.shop_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{s.orders_this_period}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatINR(s.gross_amount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ev-muted">
                          {formatINR(s.commission_deducted)}{' '}
                          <span className="text-xs">({s.platform_commission_pct}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{formatINR(s.net_payable)}</td>
                        <td className="px-4 py-3 text-ev-muted text-xs whitespace-nowrap">
                          {s.last_settled_at ? new Date(s.last_settled_at).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={acting === s.admin_id || (s.orders_this_period === 0 && s.net_payable === 0)}
                            onClick={() => markSettled(s.admin_id)}
                            className="text-xs font-semibold text-ev-primary hover:text-ev-primary-light disabled:opacity-40"
                          >
                            {acting === s.admin_id ? '…' : 'Mark as settled'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </SuperadminShell>
  );
}
