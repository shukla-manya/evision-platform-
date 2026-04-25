'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [online, setOnline] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await electricianApi.me();
      setProfile(data);
      setOnline(Boolean((data as any)?.available));
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleAvailability = async () => {
    try {
      setSaving(true);
      const next = !online;
      await electricianApi.setAvailability(next);
      setOnline(next);
      toast.success(next ? 'Marked online' : 'Marked offline');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update availability');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ElectricianShell>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted"><Loader2 size={18} className="animate-spin" /> Loading...</div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          <div className="ev-card p-6">
            <h1 className="text-2xl font-bold text-ev-text mb-3">My Profile</h1>
            <div className="space-y-1 text-sm">
              <p className="text-ev-text">Name: {profile?.name || '-'}</p>
              <p className="text-ev-text">Email: {profile?.email || '-'}</p>
              <p className="text-ev-text">Phone: {profile?.phone || '-'}</p>
              <p className="text-ev-text">Status: {profile?.status || '-'}</p>
              <p className="text-ev-text">Rating: {Number(profile?.rating_avg || 0).toFixed(1)} ({profile?.rating_count || 0})</p>
            </div>
          </div>
          <div className="ev-card p-6 flex flex-wrap gap-3">
            <button type="button" className="ev-btn-primary" onClick={() => void toggleAvailability()} disabled={saving}>
              {saving ? 'Saving...' : online ? 'Set Offline' : 'Set Online'}
            </button>
            <button type="button" className="ev-btn-secondary" onClick={() => void load()}>
              Refresh
            </button>
            <Link href="/reset-password?role=electrician" className="ev-btn-secondary">
              Change Password (OTP)
            </Link>
          </div>
        </div>
      )}
    </ElectricianShell>
  );
}
