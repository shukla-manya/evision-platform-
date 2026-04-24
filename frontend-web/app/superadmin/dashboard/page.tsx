'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Users, Store, Mail, BarChart3, CheckCircle, XCircle,
  Clock, ShieldAlert, LogOut, RefreshCw, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

type Tab = 'overview' | 'admins' | 'emails';

const statusColors: Record<string, string> = {
  pending: 'bg-ev-warning/10 text-ev-warning border border-ev-warning/20',
  approved: 'bg-ev-success/10 text-ev-success border border-ev-success/20',
  rejected: 'bg-ev-error/10 text-ev-error border border-ev-error/20',
  suspended: 'bg-ev-subtle/20 text-ev-muted border border-ev-border',
};

export default function SuperadminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (getRole() !== 'superadmin') { router.push('/auth/login'); return; }
    loadAll();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, adminsRes, emailRes] = await Promise.all([
        superadminApi.getAnalytics(),
        superadminApi.getAllAdmins(),
        superadminApi.getEmailLogs(),
      ]);
      setAnalytics(analyticsRes.data);
      setAdmins(adminsRes.data);
      setEmailLogs(emailRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  async function approve(id: string) {
    setActionLoading(id + '_approve');
    try {
      await superadminApi.approveAdmin(id);
      toast.success('Admin approved');
      loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(id: string) {
    const reason = rejectReason[id];
    if (!reason?.trim()) { toast.error('Enter a rejection reason'); return; }
    setActionLoading(id + '_reject');
    try {
      await superadminApi.rejectAdmin(id, reason);
      toast.success('Admin rejected');
      loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleSuspend(id: string, currentStatus: string) {
    setActionLoading(id + '_suspend');
    try {
      await superadminApi.suspendAdmin(id);
      toast.success(currentStatus === 'suspended' ? 'Admin reactivated' : 'Admin suspended');
      loadAll();
    } catch {
      toast.error('Failed');
    } finally {
      setActionLoading(null);
    }
  }

  const pendingAdmins = admins.filter(a => a.status === 'pending');

  return (
    <div className="min-h-screen bg-ev-bg">
      {/* Sidebar */}
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-ev-surface border-r border-ev-border flex flex-col fixed h-full">
          <div className="p-6 border-b border-ev-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow">
                <Zap size={18} className="text-white" />
              </div>
              <div>
                <p className="text-ev-text font-bold text-sm leading-tight">E Vision</p>
                <p className="text-ev-subtle text-xs">Superadmin</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {[
              { key: 'overview', icon: BarChart3, label: 'Overview' },
              { key: 'admins', icon: Store, label: 'Shop Admins', badge: pendingAdmins.length },
              { key: 'emails', icon: Mail, label: 'Email Logs' },
            ].map(({ key, icon: Icon, label, badge }) => (
              <button
                key={key}
                onClick={() => setTab(key as Tab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === key
                    ? 'bg-ev-primary/10 text-ev-primary border border-ev-primary/20'
                    : 'text-ev-muted hover:text-ev-text hover:bg-ev-surface2'
                }`}
              >
                <span className="flex items-center gap-2.5"><Icon size={16} />{label}</span>
                {badge ? (
                  <span className="bg-ev-warning text-ev-bg text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-ev-border">
            <button
              onClick={() => { clearAuth(); router.push('/auth/login'); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-ev-muted hover:text-ev-error hover:bg-ev-error/5 text-sm transition-all"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-64 flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-ev-text">
                {tab === 'overview' && 'Platform Overview'}
                {tab === 'admins' && 'Shop Admins'}
                {tab === 'emails' && 'Email Logs'}
              </h1>
              <p className="text-ev-muted text-sm mt-0.5">E Vision Pvt. Ltd. — Superadmin Panel</p>
            </div>
            <button onClick={loadAll} className="ev-btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {loading && !analytics ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-ev-primary" />
            </div>
          ) : (
            <>
              {/* ── Overview ── */}
              {tab === 'overview' && analytics && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Shops', value: analytics.admins.total, icon: Store, color: 'text-ev-primary', bg: 'bg-ev-primary/10' },
                      { label: 'Pending Approval', value: analytics.admins.pending, icon: Clock, color: 'text-ev-warning', bg: 'bg-ev-warning/10' },
                      { label: 'Total Users', value: analytics.users.total, icon: Users, color: 'text-ev-success', bg: 'bg-ev-success/10' },
                      { label: 'Emails Sent', value: analytics.emails.sent, icon: Mail, color: 'text-ev-primary-light', bg: 'bg-ev-primary/10' },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                      <div key={label} className="ev-card p-6">
                        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                          <Icon size={20} className={color} />
                        </div>
                        <p className="text-3xl font-bold text-ev-text">{value}</p>
                        <p className="text-ev-muted text-sm mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="ev-card p-6">
                      <h3 className="text-ev-text font-semibold mb-4 flex items-center gap-2"><Store size={16} className="text-ev-primary" /> Admin Breakdown</h3>
                      {[
                        { label: 'Approved', val: analytics.admins.approved, color: 'bg-ev-success' },
                        { label: 'Pending', val: analytics.admins.pending, color: 'bg-ev-warning' },
                        { label: 'Rejected', val: analytics.admins.rejected, color: 'bg-ev-error' },
                        { label: 'Suspended', val: analytics.admins.suspended, color: 'bg-ev-subtle' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-ev-border last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="text-ev-muted text-sm">{label}</span>
                          </div>
                          <span className="text-ev-text font-semibold">{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="ev-card p-6">
                      <h3 className="text-ev-text font-semibold mb-4 flex items-center gap-2"><Users size={16} className="text-ev-primary" /> User Breakdown</h3>
                      {[
                        { label: 'Customers', val: analytics.users.customers, color: 'bg-ev-primary' },
                        { label: 'Dealers', val: analytics.users.dealers, color: 'bg-ev-accent' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-ev-border last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="text-ev-muted text-sm">{label}</span>
                          </div>
                          <span className="text-ev-text font-semibold">{val}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-2 mt-2">
                        <span className="text-ev-muted text-sm font-medium">Email Failures</span>
                        <span className={`font-semibold ${analytics.emails.failed > 0 ? 'text-ev-error' : 'text-ev-success'}`}>
                          {analytics.emails.failed}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Admins ── */}
              {tab === 'admins' && (
                <div className="space-y-4 animate-fade-in">
                  {admins.length === 0 ? (
                    <div className="ev-card p-16 text-center text-ev-muted">No admins yet</div>
                  ) : admins.map(admin => (
                    <div key={admin.id} className="ev-card overflow-hidden">
                      <div
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-ev-surface2 transition-colors"
                        onClick={() => setExpandedRow(expandedRow === admin.id ? null : admin.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-ev-primary/10 rounded-xl flex items-center justify-center">
                            <Store size={18} className="text-ev-primary" />
                          </div>
                          <div>
                            <p className="text-ev-text font-semibold text-sm">{admin.shop_name}</p>
                            <p className="text-ev-muted text-xs">{admin.owner_name} · {admin.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`ev-badge ${statusColors[admin.status] || ''}`}>
                            {admin.status}
                          </span>
                          {expandedRow === admin.id ? <ChevronUp size={16} className="text-ev-muted" /> : <ChevronDown size={16} className="text-ev-muted" />}
                        </div>
                      </div>

                      {expandedRow === admin.id && (
                        <div className="border-t border-ev-border p-5 bg-ev-surface2 animate-fade-in">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                            <div><span className="text-ev-muted block">Phone</span><span className="text-ev-text">{admin.phone}</span></div>
                            <div><span className="text-ev-muted block">GST No.</span><span className="text-ev-text">{admin.gst_no}</span></div>
                            <div><span className="text-ev-muted block">Registered</span><span className="text-ev-text">{new Date(admin.created_at).toLocaleDateString()}</span></div>
                            <div><span className="text-ev-muted block">Address</span><span className="text-ev-text">{admin.address}</span></div>
                          </div>

                          {admin.status === 'pending' && (
                            <div className="flex flex-col sm:flex-row gap-3 mt-2">
                              <button
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
                                  placeholder="Rejection reason..."
                                  value={rejectReason[admin.id] || ''}
                                  onChange={e => setRejectReason(r => ({ ...r, [admin.id]: e.target.value }))}
                                />
                                <button
                                  onClick={() => reject(admin.id)}
                                  disabled={!!actionLoading}
                                  className="bg-ev-error/10 border border-ev-error/30 text-ev-error hover:bg-ev-error/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                  {actionLoading === admin.id + '_reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {admin.status === 'approved' && (
                            <button
                              onClick={() => toggleSuspend(admin.id, admin.status)}
                              disabled={!!actionLoading}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ev-warning/10 border border-ev-warning/20 text-ev-warning text-sm font-medium hover:bg-ev-warning/20 transition-colors"
                            >
                              <ShieldAlert size={14} /> Suspend Admin
                            </button>
                          )}

                          {admin.status === 'suspended' && (
                            <button
                              onClick={() => toggleSuspend(admin.id, admin.status)}
                              disabled={!!actionLoading}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ev-success/10 border border-ev-success/20 text-ev-success text-sm font-medium hover:bg-ev-success/20 transition-colors"
                            >
                              <CheckCircle size={14} /> Reactivate Admin
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Email Logs ── */}
              {tab === 'emails' && (
                <div className="ev-card overflow-hidden animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ev-border">
                          {['Event', 'To', 'Role', 'Subject', 'Status', 'Sent At'].map(h => (
                            <th key={h} className="text-left px-5 py-3.5 text-ev-muted text-xs font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ev-border">
                        {emailLogs.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-16 text-ev-muted">No email logs yet</td></tr>
                        ) : emailLogs.map(log => (
                          <tr key={log.id} className="hover:bg-ev-surface2 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs text-ev-primary">{log.trigger_event}</td>
                            <td className="px-5 py-3.5 text-ev-text">{log.to_email}</td>
                            <td className="px-5 py-3.5 text-ev-muted capitalize">{log.to_role}</td>
                            <td className="px-5 py-3.5 text-ev-muted max-w-[200px] truncate">{log.subject}</td>
                            <td className="px-5 py-3.5">
                              <span className={`ev-badge ${log.status === 'sent' ? 'bg-ev-success/10 text-ev-success border border-ev-success/20' : 'bg-ev-error/10 text-ev-error border border-ev-error/20'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-ev-muted whitespace-nowrap text-xs">
                              {new Date(log.sent_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
