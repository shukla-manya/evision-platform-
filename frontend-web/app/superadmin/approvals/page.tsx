'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type AdminRow = { id: string; shop_name?: string; owner_name?: string; email?: string };
type ElectricianRow = { id: string; name?: string; email?: string };

type QueueRow = { id: string; name: string; type: 'Admin' | 'Electrician' };

export default function SuperadminApprovalsPage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pa, pe] = await Promise.all([superadminApi.getPendingAdmins(), superadminApi.getPendingElectricians()]);
      const admins = Array.isArray(pa.data) ? (pa.data as AdminRow[]) : [];
      const elec = Array.isArray(pe.data) ? (pe.data as ElectricianRow[]) : [];
      const merged: QueueRow[] = [
        ...admins.map((a) => ({
          id: a.id,
          name: String(a.shop_name || a.owner_name || a.email || 'Shop'),
          type: 'Admin' as const,
        })),
        ...elec.map((e) => ({
          id: e.id,
          name: String(e.name || e.email || 'Electrician'),
          type: 'Electrician' as const,
        })),
      ];
      setRows(merged);
    } catch {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(row: QueueRow) {
    setBusy(row.id);
    try {
      if (row.type === 'Admin') await superadminApi.approveAdmin(row.id);
      else await superadminApi.reviewElectrician(row.id, { action: 'approve' });
      toast.success('Approved');
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10 max-w-4xl">
        <Link
          href="/superadmin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ev-muted hover:text-ev-text mb-6"
        >
          <ArrowLeft size={16} />
          Overview
        </Link>
        <h1 className="text-2xl font-bold text-ev-text mb-1">Approvals</h1>
        <p className="text-ev-muted text-sm mb-8">Pending shop admins and electricians awaiting your decision.</p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading…
          </div>
        ) : (
          <div className="ev-card overflow-hidden border-ev-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-ev-muted">
                        No pending items
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={`${row.type}-${row.id}`} className="border-b border-ev-border last:border-0">
                        <td className="px-4 py-3 font-medium text-ev-text">{row.name}</td>
                        <td className="px-4 py-3 text-ev-muted">{row.type}</td>
                        <td className="px-4 py-3 text-right space-x-3">
                          <button
                            type="button"
                            disabled={busy === row.id}
                            onClick={() => void approve(row)}
                            className="text-sm font-semibold text-ev-primary hover:text-ev-primary-light disabled:opacity-50"
                          >
                            {busy === row.id ? '…' : 'Approve'}
                          </button>
                          <Link
                            href={row.type === 'Admin' ? '/superadmin/pending-admins' : '/superadmin/pending-electricians'}
                            className="text-sm font-medium text-ev-muted hover:text-ev-text"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </SuperadminShell>
  );
}
