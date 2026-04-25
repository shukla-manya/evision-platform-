'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type ElectricianRow = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  skills?: string[] | string;
  aadhar_url?: string;
  photo_url?: string;
  created_at?: string;
  status?: string;
};

function formatSkills(skills: ElectricianRow['skills']): string {
  if (Array.isArray(skills)) return skills.join(', ');
  if (typeof skills === 'string') return skills;
  return '—';
}

function extractPincode(addr: string): string {
  const m = addr.match(/\b\d{6}\b/);
  return m ? m[0] : '—';
}

export default function TechnicianRegistrationsPage() {
  const [pending, setPending] = useState<ElectricianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superadminApi.getPendingElectricians();
      setPending(Array.isArray(data) ? (data as ElectricianRow[]) : []);
    } catch {
      toast.error('Failed to load pending electricians');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function approve(id: string) {
    setActionLoading(id + '_approve');
    try {
      await superadminApi.reviewElectrician(id, { action: 'approve' });
      toast.success('Electrician approved');
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
      await superadminApi.reviewElectrician(id, { action: 'reject', reason: reason.trim() });
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
        <h1 className="text-2xl font-bold text-ev-text mb-1">Technician registrations</h1>
        <p className="text-ev-muted text-sm mb-8">Pending applications only. Approve or reject with a clear reason.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-ev-primary" />
          </div>
        ) : pending.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <User className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium">No pending registrations</p>
            <p className="text-sm mt-1">New electrician sign-ups will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((row) => (
              <div key={row.id} className="ev-card overflow-hidden">
                <button
                  type="button"
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-ev-surface2/80 transition-colors"
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-ev-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <User size={18} className="text-ev-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-ev-text font-semibold text-sm truncate">{row.name || '—'}</p>
                      <p className="text-ev-muted text-xs truncate">
                        {row.phone} · {row.email}
                      </p>
                    </div>
                  </div>
                  {expanded === row.id ? <ChevronUp size={18} className="text-ev-muted shrink-0" /> : <ChevronDown size={18} className="text-ev-muted shrink-0" />}
                </button>

                {expanded === row.id && (
                  <div className="border-t border-ev-border p-5 bg-ev-surface2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-ev-muted block text-xs">Phone</span>
                        <span className="text-ev-text">{row.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs">City / location</span>
                        <span className="text-ev-text">{row.address || '—'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-ev-muted block text-xs">Skills</span>
                        <span className="text-ev-text">{formatSkills(row.skills)}</span>
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs mb-2">Aadhar image</span>
                        {row.aadhar_url ? (
                          <a
                            href={row.aadhar_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ev-primary text-sm font-medium"
                          >
                            Open full size
                          </a>
                        ) : (
                          <span className="text-ev-muted">—</span>
                        )}
                        {row.aadhar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.aadhar_url} alt="Aadhar" className="mt-2 max-h-48 rounded-lg border border-ev-border object-contain bg-ev-bg" />
                        ) : null}
                      </div>
                      <div>
                        <span className="text-ev-muted block text-xs mb-2">Selfie photo</span>
                        {row.photo_url ? (
                          <a
                            href={row.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ev-primary text-sm font-medium"
                          >
                            Open full size
                          </a>
                        ) : (
                          <span className="text-ev-muted">—</span>
                        )}
                        {row.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.photo_url} alt="Selfie" className="mt-2 max-h-48 rounded-lg border border-ev-border object-contain bg-ev-bg" />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => approve(row.id)}
                        disabled={!!actionLoading}
                        className="ev-btn-primary flex items-center justify-center gap-2 py-2.5 px-5 text-sm"
                      >
                        {actionLoading === row.id + '_approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Approve
                      </button>
                      <div className="flex gap-2 flex-1">
                        <input
                          type="text"
                          className="ev-input flex-1 py-2 text-sm"
                          placeholder="Rejection reason…"
                          value={rejectReason[row.id] || ''}
                          onChange={(e) => setRejectReason((r) => ({ ...r, [row.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => reject(row.id)}
                          disabled={!!actionLoading}
                          className="bg-ev-error/10 border border-ev-error/30 text-ev-error hover:bg-ev-error/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0"
                        >
                          {actionLoading === row.id + '_reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
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
