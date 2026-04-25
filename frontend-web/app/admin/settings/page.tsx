'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { AdminShell } from '@/components/admin/AdminShell';

type AdminMe = {
  shop_name?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  gst_no?: string;
  address?: string;
  status?: string;
  logo_url?: string | null;
};

export default function AdminSettingsPage() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    adminApi
      .getMe()
      .then((r) => setAdmin(r.data as AdminMe))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await adminApi.uploadLogo(file);
      const logo_url = (data as { logo_url?: string })?.logo_url;
      setAdmin((a) => (a && logo_url ? { ...a, logo_url } : a));
      toast.success('Logo updated');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <AdminShell>
      <main className="p-6 sm:p-10 max-w-2xl">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Shop settings</h1>
        <p className="text-ev-muted text-sm mb-8">Profile and branding</p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading…
          </div>
        ) : admin ? (
          <div className="ev-card p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden shrink-0 flex items-center justify-center">
                {admin.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={admin.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-ev-subtle text-xs px-2 text-center">No logo</span>
                )}
              </div>
              <div>
                <p className="ev-label mb-1">Shop logo</p>
                <label className="ev-btn-secondary inline-flex items-center gap-2 py-2 px-4 text-sm cursor-pointer">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {uploading ? 'Uploading…' : 'Upload new logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={uploading} />
                </label>
              </div>
            </div>
            <dl className="grid gap-4 text-sm">
              {[
                ['Shop name', admin.shop_name],
                ['Owner', admin.owner_name],
                ['Email', admin.email],
                ['Phone', admin.phone],
                ['GST', admin.gst_no],
                ['Address', admin.address],
                ['Status', admin.status],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <dt className="text-ev-muted text-xs mb-0.5">{label}</dt>
                  <dd className="text-ev-text">{val || '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="pt-2">
              <a href="/reset-password?role=admin" className="ev-btn-primary inline-flex text-sm py-2 px-4">
                Change Password (OTP)
              </a>
            </div>
          </div>
        ) : null}
      </main>
    </AdminShell>
  );
}
