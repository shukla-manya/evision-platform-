'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type EmailLog = {
  id: string;
  trigger_event: string;
  status: string;
  sent_at: string;
  to_email: string;
  to_role: string;
  subject: string;
  error_message: string | null;
};

/** Common `trigger_event` values — must match backend logs; use text field for anything else. */
const EMAIL_TRIGGER_PRESETS = [
  'payment_confirmed',
  'payment_confirmed_admin',
  'admin_approved',
  'admin_registered',
  'admin_rejected',
  'invoice_generated',
  'order_cancelled',
  'order_shipped',
  'picked_up',
  'in_transit',
  'delivered',
  'service_booking_request',
  'electrician_approved',
  'dealer_gst_verified',
] as const;

function triggerPresetSelectValue(event: string): string {
  const t = event.trim();
  if (!t) return '';
  if ((EMAIL_TRIGGER_PRESETS as readonly string[]).includes(t)) return t;
  return 'custom';
}

export default function EmailDeliveryHistoryPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState('');
  const [status, setStatus] = useState('');
  const [toRole, setToRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superadminApi.getEmailLogs({
        event: event.trim() || undefined,
        status: status || undefined,
        to_role: toRole || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setLogs(Array.isArray(data) ? (data as EmailLog[]) : []);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Could not load email logs'));
    } finally {
      setLoading(false);
    }
  }, [event, status, toRole, dateFrom, dateTo]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch only; filters use "Apply filters"
  }, []);

  return (
    <SuperadminShell>
      <main className="w-full min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-ev-primary/15 flex items-center justify-center">
            <Mail className="text-ev-primary" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ev-text">Email delivery history</h1>
            <p className="text-ev-muted text-sm">Trigger, recipient, status, and time for each send attempt</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 my-8">
          <div>
            <label className="text-xs text-ev-muted block mb-1">Date from</label>
            <input type="date" className="ev-input py-2 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-ev-muted block mb-1">Date to</label>
            <input type="date" className="ev-input py-2 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-ev-muted block mb-1">Trigger (quick)</label>
            <select
              className="ev-input py-2 text-sm"
              value={triggerPresetSelectValue(event)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') setEvent('');
                else if (v !== 'custom') setEvent(v);
              }}
            >
              <option value="">Any trigger</option>
              {EMAIL_TRIGGER_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </div>
          <div className="xl:col-span-2">
            <label className="text-xs text-ev-muted block mb-1">Trigger (exact text)</label>
            <input
              type="text"
              className="ev-input py-2 text-sm font-mono"
              placeholder="e.g. service_review_prompt"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-ev-muted block mb-1">Recipient role</label>
            <select className="ev-input py-2 text-sm" value={toRole} onChange={(e) => setToRole(e.target.value)}>
              <option value="">Any</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
              <option value="dealer">Dealer</option>
              <option value="electrician">Technician</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-ev-muted block mb-1">Status</label>
            <select className="ev-input py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
            </select>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="ev-btn-secondary text-sm py-2 px-4 mb-6">
          Apply filters
        </button>

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
                    <th className="px-4 py-3 font-semibold">Trigger</th>
                    <th className="px-4 py-3 font-semibold">Recipient</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-ev-muted">
                        No matching email logs
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 500).map((log) => (
                      <tr key={log.id} className="border-b border-ev-border last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-ev-text">{log.trigger_event}</td>
                        <td className="px-4 py-3 text-ev-muted max-w-[200px] truncate" title={log.to_email}>
                          {log.to_email}
                        </td>
                        <td className="px-4 py-3 text-ev-muted">{log.to_role}</td>
                        <td className="px-4 py-3 text-ev-muted max-w-[220px] truncate" title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              log.status === 'sent'
                                ? 'text-ev-success font-medium'
                                : log.status === 'failed'
                                  ? 'text-ev-error font-medium'
                                  : 'text-ev-muted'
                            }
                          >
                            {log.status}
                          </span>
                          {log.error_message ? (
                            <p className="text-xs text-ev-error mt-1 max-w-xs truncate" title={log.error_message}>
                              {log.error_message}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-ev-muted text-xs whitespace-nowrap">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN') : '—'}
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
