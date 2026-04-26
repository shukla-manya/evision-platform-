'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Loader2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { clearAuth } from '@/lib/auth';

type Profile = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  skills?: string[] | string;
  photo_url?: string | null;
  status?: string;
  rating_avg?: number;
  rating_count?: number;
};

function skillsList(skills: Profile['skills']): string[] {
  if (Array.isArray(skills)) return skills.map(String);
  const s = String(skills || '').trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map(String);
  } catch {
    /* comma list */
  }
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

function pincodeFromAddress(addr?: string): string {
  const m = String(addr || '').match(/\b\d{6}\b/);
  return m ? m[0] : '—';
}

export default function ElectricianProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await electricianApi.me();
        setProfile((data || null) as Profile | null);
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const skills = profile ? skillsList(profile.skills) : [];
  const approved = String(profile?.status || '').toLowerCase() === 'approved';
  const cityLine = String(profile?.address || '—').split(',').slice(-2).join(',').trim() || '—';

  return (
    <ElectricianShell>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted py-12">
          <Loader2 size={20} className="animate-spin text-ev-primary" />
          Loading…
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-ev-muted text-sm leading-relaxed border-l-2 border-ev-primary pl-3">
            This is how customers see your profile. Keep it updated to get more bookings.
          </p>

          <div className="ev-card overflow-hidden">
            <div className="p-6 space-y-6">
              <h1 className="text-2xl font-bold text-ev-text">Profile</h1>

              <div>
                <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-2">My photo</p>
                {profile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={String(profile.photo_url)}
                    alt=""
                    className="w-24 h-24 rounded-2xl object-cover border border-ev-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-ev-surface2 border border-ev-border flex items-center justify-center text-ev-muted text-xs">
                    No photo
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-ev-muted text-xs uppercase tracking-wide">Name</p>
                  <p className="text-ev-text font-medium mt-0.5">{profile?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-muted text-xs uppercase tracking-wide">Phone</p>
                  <p className="text-ev-text font-medium mt-0.5">{profile?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-muted text-xs uppercase tracking-wide">City / area</p>
                  <p className="text-ev-text font-medium mt-0.5">{cityLine}</p>
                </div>
                <div>
                  <p className="text-ev-muted text-xs uppercase tracking-wide">Pincode</p>
                  <p className="text-ev-text font-medium mt-0.5">{pincodeFromAddress(profile?.address)}</p>
                </div>
              </div>

              <div>
                <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Full address</p>
                <p className="text-ev-text text-sm leading-relaxed">{profile?.address || '—'}</p>
              </div>

              <div>
                <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Skills</p>
                {skills.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <li key={s} className="text-xs px-2.5 py-1 rounded-full bg-ev-surface2 border border-ev-border text-ev-text">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ev-subtle text-sm">—</p>
                )}
              </div>

              <div>
                <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Experience</p>
                <p className="text-ev-text text-sm">—</p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-ev-muted text-xs uppercase tracking-wide">Aadhar</p>
                {approved ? (
                  <span className="inline-flex items-center gap-1 text-ev-success text-sm font-medium">
                    <BadgeCheck size={18} />
                    Verified
                  </span>
                ) : (
                  <span className="text-ev-warning text-sm">Pending verification</span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-ev-border">
                <Link href="/electrician/settings" className="ev-btn-primary text-sm py-2.5 px-4">
                  Edit profile
                </Link>
                <Link href="/electrician/reviews" className="ev-btn-secondary text-sm py-2.5 px-4">
                  My reviews
                </Link>
                <Link href="/electrician/earnings" className="ev-btn-secondary text-sm py-2.5 px-4">
                  Earnings
                </Link>
                <Link href="/reset-password?role=electrician" className="ev-btn-secondary text-sm py-2.5 px-4">
                  Change password
                </Link>
                <button
                  type="button"
                  className="ev-btn-secondary text-sm py-2.5 px-4 inline-flex items-center gap-2 text-ev-error border-ev-error/30"
                  onClick={() => {
                    clearAuth();
                    router.push('/electrician/login');
                  }}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ElectricianShell>
  );
}
