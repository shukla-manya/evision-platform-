'use client';

import { useEffect, useState, useCallback } from 'react';
import { Store, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
};

export default function SuperadminPendingAdminsPage() {
  const [pending, setPending] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superadminApi.getPendingAdmins();
      setPending(Array.isArray(data) ? (data as AdminRow[]) : []);
    } catch {
      toast.error('Failed to load pending admins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setActionLoading(id + '_approve');
    try {
      await superadminApi.approveAdmin(id);
      toast.success('Approved');
      load();
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
      toast.success('Rejected');
      load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed'));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Pending admins</h1>
        <p className="text-ev-muted text-sm mb-8">Review and approve new shop registrations</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-ev-primary" />
          </div>
        ) : pending.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <Store className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium">No pending registrations</p>
            <p className="text-sm mt-1">New shop sign-ups will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((admin) => (
              <div key={admin.id} className="ev-card overflow-hidden">
                <button
                  type="button"
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-ev-surface2/80 transition-colors"
                  onClick={() => setExpanded(expanded === admin.id ? null : admin.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-ev-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Store size={18} className="text-ev-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-ev-text font-semibold text-sm truncate">{admin.shop_name}</p>
                      <p className="text-ev-muted text-xs truncate">
                        {admin.owner_name} · {admin.email}
                      </p>
                    </div>
                  </div>
                  {expanded === admin.id ? <ChevronUp size={18} className="text-ev-muted shrink-0" /> : <ChevronDown size={18} className="text-ev-muted shrink-0" />}
                </button>

                {expanded === admin.id && (
                  <div className="border-t border-ev-border p-5 bg-ev-surface2 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-ev-muted block text-xs">Phone</span>
                        <span className="text-ev-text">{admin.phone}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs">GST</span>
                        <span className="text-ev-text">{admin.gst_no}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs">Registered</span>
                        <span className="text-ev-text">
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-ev-muted block text-xs">Address</span>
                        <span className="text-ev-text">{admin.address}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => approve(admin.id)}
                        disabled={!!actionLoading}
                        className="ev-btn-primary flex items-center justify-center gap-2 py-2.5 px-5 text-sm"
                      >
                        {actionLoading === admin.id + '_approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Approve
                      </button>
                      <div className="flex gap-2 flex-1">
                        <input
                          type="text"
                          className="ev-input flex-1 py-2 text-sm"
                          placeholder="Rejection reason…"
                          value={rejectReason[admin.id] || ''}
                          onChange={(e) => setRejectReason((r) => ({ ...r, [admin.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => reject(admin.id)}
                          disabled={!!actionLoading}
                          className="bg-ev-error/10 border border-ev-error/30 text-ev-error hover:bg-ev-error/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0"
                        >
                          {actionLoading === admin.id + '_reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Reject
                        </button>
                      </div>
                    </div>
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
