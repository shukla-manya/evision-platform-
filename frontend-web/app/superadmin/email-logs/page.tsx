'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type EmailLog = {
  id?: string;
  trigger_event?: string;
  status?: string;
  sent_at?: string;
  to?: string;
};

export default function SuperadminEmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi
      .getEmailLogs()
      .then((r) => setLogs(Array.isArray(r.data) ? (r.data as EmailLog[]) : []))
      .catch(() => toast.error('Could not load email logs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10 max-w-5xl">
        <Link
          href="/superadmin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ev-muted hover:text-ev-text mb-6"
        >
          <ArrowLeft size={16} />
          Overview
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-ev-primary/15 flex items-center justify-center">
            <Mail className="text-ev-primary" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ev-text">Email logs</h1>
            <p className="text-ev-muted text-sm">Delivery events recorded by the platform</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading…
          </div>
        ) : (
          <div className="ev-card overflow-hidden border-ev-border mt-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">To</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-ev-muted">
                        No email logs yet
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 100).map((log, i) => (
                      <tr key={String(log.id || i)} className="border-b border-ev-border last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-ev-text">{String(log.trigger_event || '—')}</td>
                        <td className="px-4 py-3 text-ev-muted truncate max-w-[200px]">{String(log.to || '—')}</td>
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
                            {String(log.status || '—')}
                          </span>
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
