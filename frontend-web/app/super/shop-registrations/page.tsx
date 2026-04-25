'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Store, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type Tab = 'pending' | 'approved' | 'rejected';

type AdminRow = {
  id: string;
  shop_name?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  gst_no?: string;
  created_at?: string;
  address?: string;
  logo_url?: string | null;
  status?: string;
};

export default function ShopRegistrationsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [all, setAll] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        superadminApi.getPendingAdmins(),
        superadminApi.getAllAdmins(),
      ]);
      const pending = Array.isArray(pendingRes.data) ? (pendingRes.data as AdminRow[]) : [];
      const list = Array.isArray(allRes.data) ? (allRes.data as AdminRow[]) : [];
      if (tab === 'pending') {
        setAll(pending);
      } else {
        setAll(list.filter((a) => String(a.status) === tab));
      }
    } catch {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...all].sort(
        (a, b) =>
          new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime(),
      ),
    [all],
  );

  async function approve(id: string) {
    setActionLoading(id + '_approve');
    try {
      await superadminApi.approveAdmin(id);
      toast.success('Approved — login email sent to admin');
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed'));
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(id: string) {
    const reason = rejectReason[id];
    if (!reason?.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }
    setActionLoading(id + '_reject');
    try {
      await superadminApi.rejectAdmin(id, reason);
      toast.success('Rejected — reason emailed to admin');
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed'));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10 max-w-4xl">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Shop admin registrations</h1>
        <p className="text-ev-muted text-sm mb-8">Review shop owners before they can access the admin console.</p>

        <div className="flex gap-2 mb-8 border-b border-ev-border">
          {(['pending', 'approved', 'rejected'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-ev-primary text-ev-primary' : 'border-transparent text-ev-muted hover:text-ev-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-ev-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <Store className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium">No {tab} registrations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((admin) => (
              <div key={admin.id} className="ev-card overflow-hidden">
                <button
                  type="button"
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-ev-surface2/80 transition-colors"
                  onClick={() => setExpanded(expanded === admin.id ? null : admin.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {admin.logo_url ? (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-ev-border shrink-0 bg-ev-bg">
                        <Image src={admin.logo_url} alt="" fill className="object-cover" sizes="48px" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-ev-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Store size={20} className="text-ev-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-ev-text font-semibold text-sm truncate">{admin.shop_name}</p>
                      <p className="text-ev-muted text-xs truncate">
                        {admin.owner_name} · {admin.email}
                      </p>
                    </div>
                  </div>
                  {expanded === admin.id ? (
                    <ChevronUp size={18} className="text-ev-muted shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-ev-muted shrink-0" />
                  )}
                </button>

                {expanded === admin.id && (
                  <div className="border-t border-ev-border p-5 bg-ev-surface2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-ev-muted block text-xs">Phone</span>
                        <span className="text-ev-text">{admin.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs">GST number</span>
                        <span className="text-ev-text">{admin.gst_no || '—'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-ev-muted block text-xs">Address</span>
                        <span className="text-ev-text">{admin.address || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs">Date registered</span>
                        <span className="text-ev-text">
                          {admin.created_at ? new Date(admin.created_at).toLocaleString('en-IN') : '—'}
                        </span>
                      </div>
                    </div>

                    {tab === 'pending' && (
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => approve(admin.id)}
                          disabled={!!actionLoading}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm inline-flex items-center justify-center gap-2"
                        >
                          {actionLoading === admin.id + '_approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Approve
                        </button>
                        <div>
                          <label className="text-xs text-ev-muted block mb-1">Reason for rejection (required to reject)</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              className="ev-input flex-1 py-2 text-sm"
                              placeholder="e.g. GST number could not be verified"
                              value={rejectReason[admin.id] || ''}
                              onChange={(e) => setRejectReason((r) => ({ ...r, [admin.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              onClick={() => reject(admin.id)}
                              disabled={!!actionLoading}
                              className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-xl text-sm inline-flex items-center justify-center gap-2 shrink-0"
                            >
                              {actionLoading === admin.id + '_reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </SuperadminShell>
  );
}
