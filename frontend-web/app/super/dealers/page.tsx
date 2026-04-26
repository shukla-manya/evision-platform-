'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type PendingDealer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  gst_no: string;
  business_name: string | null;
  created_at: string | null;
};

export default function SuperDealerGstPage() {
  const [rows, setRows] = useState<PendingDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superadminApi.getPendingDealerGst();
      setRows(Array.isArray(data) ? (data as PendingDealer[]) : []);
    } catch {
      toast.error('Failed to load pending dealers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function verifyGst(userId: string) {
    setActing(userId);
    try {
      await superadminApi.verifyDealerGst(userId);
      toast.success('GST verified — dealer receives email and wholesale pricing is active.');
      void load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Could not verify GST'));
    } finally {
      setActing(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0">
        <h1 className="text-2xl font-bold text-ev-text mb-8">Dealer GST verification</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-ev-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <Building2 className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium">No dealers awaiting GST</p>
            <p className="text-sm mt-1">New dealer sign-ups with unverified GST will appear here.</p>
          </div>
        ) : (
          <div className="ev-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ev-border bg-ev-surface2/50 text-left text-ev-muted">
                    <th className="px-4 py-3 font-semibold">Dealer</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">GSTIN</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ev-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-ev-surface2/40">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-ev-text">{r.name || '—'}</p>
                        {r.business_name ? (
                          <p className="text-ev-subtle text-xs mt-0.5">{r.business_name}</p>
                        ) : null}
                        {r.created_at ? (
                          <p className="text-ev-subtle text-xs mt-1">
                            Registered {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium' })}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-ev-muted text-xs">
                        <p>{r.email || '—'}</p>
                        <p className="mt-1 font-mono">{r.phone || '—'}</p>
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-xs text-ev-text">{r.gst_no || '—'}</td>
                      <td className="px-4 py-3 align-top text-right">
                        <button
                          type="button"
                          disabled={acting === r.id}
                          onClick={() => void verifyGst(r.id)}
                          className="ev-btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {acting === r.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          Verify GST
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </SuperadminShell>
  );
}
