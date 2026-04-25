'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Store,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  RefreshCw,
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
};

const statusColors: Record<string, string> = {
  pending: 'bg-ev-warning/10 text-ev-warning border border-ev-warning/20',
  approved: 'bg-ev-success/10 text-ev-success border border-ev-success/20',
  rejected: 'bg-ev-error/10 text-ev-error border border-ev-error/20',
  suspended: 'bg-ev-subtle/20 text-ev-muted border border-ev-border',
};

export default function SuperadminShopsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superadminApi.getAllAdmins();
      setAdmins(Array.isArray(data) ? (data as AdminRow[]) : []);
    } catch {
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAll();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAll]);

  async function approve(id: string) {
    setActionLoading(id + '_approve');
    try {
      await superadminApi.approveAdmin(id);
      toast.success('Approved');
      loadAll();
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
      loadAll();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed'));
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleSuspend(id: string, currentStatus: string) {
    setActionLoading(id + '_suspend');
    try {
      await superadminApi.suspendAdmin(id);
      toast.success(currentStatus === 'suspended' ? 'Reactivated' : 'Suspended');
      loadAll();
    } catch {
      toast.error('Failed');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ev-text mb-1">All shops</h1>
            <p className="text-ev-muted text-sm">Every registered shop admin and status</p>
          </div>
          <button type="button" onClick={() => loadAll()} className="ev-btn-secondary inline-flex items-center gap-2 py-2 px-4 text-sm self-start">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading && admins.length === 0 ? (
          <div className="flex justify-center py-24">
            <Loader2 size={32} className="animate-spin text-ev-primary" />
          </div>
        ) : admins.length === 0 ? (
          <div className="ev-card p-16 text-center text-ev-muted">No shops yet</div>
        ) : (
          <div className="space-y-4">
            {admins.map((admin) => (
              <div key={admin.id} className="ev-card overflow-hidden">
                <button
                  type="button"
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-ev-surface2/50 transition-colors"
                  onClick={() => setExpandedRow(expandedRow === admin.id ? null : admin.id)}
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
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`ev-badge ${statusColors[admin.status ?? ''] || ''}`}>{admin.status}</span>
                    {expandedRow === admin.id ? <ChevronUp size={16} className="text-ev-muted" /> : <ChevronDown size={16} className="text-ev-muted" />}
                  </div>
                </button>

                {expandedRow === admin.id && (
                  <div className="border-t border-ev-border p-5 bg-ev-surface2 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-ev-muted block text-xs">Phone</span>
                        <span className="text-ev-text">{admin.phone}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs">GST No.</span>
                        <span className="text-ev-text">{admin.gst_no}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs">Registered</span>
                        <span className="text-ev-text">
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <span className="text-ev-muted block text-xs">Address</span>
                        <span className="text-ev-text">{admin.address}</span>
                      </div>
                    </div>

                    {admin.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => approve(admin.id)}
                          disabled={!!actionLoading}
                          className="ev-btn-primary flex items-center justify-center gap-2 py-2 px-5 text-sm"
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
                            className="bg-ev-error/10 border border-ev-error/30 text-ev-error hover:bg-ev-error/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                          >
                            {actionLoading === admin.id + '_reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {admin.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => toggleSuspend(admin.id, admin.status ?? 'approved')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ev-warning/10 border border-ev-warning/20 text-ev-warning text-sm font-medium hover:bg-ev-warning/20"
                      >
                        {actionLoading === admin.id + '_suspend' ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                        Suspend shop
                      </button>
                    )}

                    {admin.status === 'suspended' && (
                      <button
                        type="button"
                        onClick={() => toggleSuspend(admin.id, admin.status ?? 'suspended')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ev-success/10 border border-ev-success/20 text-ev-success text-sm font-medium hover:bg-ev-success/20"
                      >
                        {actionLoading === admin.id + '_suspend' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Reactivate shop
                      </button>
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
