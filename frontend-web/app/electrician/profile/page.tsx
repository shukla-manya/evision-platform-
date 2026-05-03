'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Circle,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Star,
  MessageSquare,
  CalendarDays,
} from 'lucide-react';
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
  aadhar_url?: string | null;
  status?: string;
  rating_avg?: number;
  rating_count?: number;
  available?: boolean;
  created_at?: string;
  approved_at?: string;
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

/** "Experience: 2 yrs · Delhi, 110044" → parts */
function parseServiceAddress(addr?: string): {
  experienceLabel: string;
  areaLabel: string;
  full: string;
} {
  const raw = String(addr || '').trim();
  if (!raw) {
    return { experienceLabel: '', areaLabel: '—', full: '—' };
  }
  const m = raw.match(/^Experience:\s*([^·]+)\s*·\s*([\s\S]+)$/i);
  if (m) {
    return {
      experienceLabel: m[1].trim(),
      areaLabel: m[2].trim(),
      full: raw,
    };
  }
  return { experienceLabel: '', areaLabel: raw, full: raw };
}

function pincodeFromText(text: string): string {
  const m = text.match(/\b\d{6}\b/);
  return m ? m[0] : '—';
}

function formatMemberSince(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function statusPill(status?: string): { label: string; className: string } {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') {
    return {
      label: 'Verified technician',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    };
  }
  if (s === 'pending') {
    return { label: 'Pending review', className: 'bg-amber-50 text-amber-900 border-amber-200/80' };
  }
  if (s === 'rejected') {
    return { label: 'Not approved', className: 'bg-red-50 text-red-800 border-red-200/70' };
  }
  return { label: s || '—', className: 'bg-ev-surface2 text-ev-muted border-ev-border' };
}

function StarRating({ avg, count }: { avg: number; count: number }) {
  if (count <= 0) {
    return (
      <p className="text-sm text-ev-muted leading-relaxed">
        No customer ratings yet. Complete bookings to build your reputation.
      </p>
    );
  }
  const rounded = Math.min(5, Math.max(0, Math.round(avg)));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5" aria-label={`${avg.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={18}
            className={
              i <= rounded
                ? 'fill-amber-400 text-amber-400 shrink-0'
                : 'fill-ev-border/40 text-ev-border shrink-0'
            }
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-ev-text tabular-nums">{avg.toFixed(1)}</span>
      <span className="text-sm text-ev-muted">({count} {count === 1 ? 'rating' : 'ratings'})</span>
    </div>
  );
}

const quickLinks: {
  href: string;
  label: string;
  icon: typeof Pencil;
  variant?: 'primary';
}[] = [
  { href: '/electrician/settings', label: 'Edit profile', icon: Pencil, variant: 'primary' },
  { href: '/electrician/reviews', label: 'Reviews', icon: MessageSquare },
];

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
  const { experienceLabel, areaLabel, full: fullAddress } = parseServiceAddress(profile?.address);
  const pincode = pincodeFromText(areaLabel);
  const cityLine = areaLabel.includes(',')
    ? areaLabel
        .split(',')
        .map((x) => x.trim())
        .slice(-2)
        .join(', ')
    : areaLabel;
  const pill = statusPill(profile?.status);
  const ratingAvg = Number(profile?.rating_avg ?? 0);
  const ratingCount = Number(profile?.rating_count ?? 0);

  const initials = useMemo(() => {
    const n = String(profile?.name || '?').trim();
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase() || '?';
  }, [profile?.name]);

  return (
    <ElectricianShell>
      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ev-muted">
          <Loader2 size={28} className="animate-spin text-ev-primary" />
          <p className="text-sm">Loading your profile…</p>
        </div>
      ) : (
        <div className="w-full min-w-0 max-w-full animate-slide-up">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ev-text sm:text-3xl">Your profile</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ev-muted">
                This is how customers find and trust you on E vision. Keep your details accurate for better bookings.
              </p>
            </div>
          </div>

          {/* Quick actions — horizontal strip */}
          <div className="mb-8 flex flex-wrap gap-2">
            {quickLinks.map(({ href, label, icon: Icon, variant }) => (
              <Link
                key={href}
                href={href}
                className={
                  variant === 'primary'
                    ? 'inline-flex items-center gap-2 rounded-lg bg-ev-primary px-4 py-2.5 text-sm font-semibold text-white shadow-ev-sm transition hover:brightness-110 active:scale-[0.98]'
                    : 'inline-flex items-center gap-2 rounded-lg border border-ev-border bg-ev-surface px-4 py-2.5 text-sm font-medium text-ev-text shadow-ev-sm transition hover:border-ev-primary/35 hover:bg-ev-surface2/60'
                }
              >
                <Icon size={17} className={variant === 'primary' ? 'opacity-95' : 'text-ev-muted'} />
                {label}
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: identity card */}
            <aside className="lg:col-span-4">
              <div className="overflow-hidden rounded-2xl border border-ev-border bg-ev-surface shadow-ev-md">
                <div className="h-24 bg-gradient-to-br from-ev-navbar via-ev-indigo to-ev-primary/90" aria-hidden />
                <div className="relative px-5 pb-6 pt-0">
                  <div className="-mt-14 flex justify-center lg:justify-start">
                    {profile?.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={String(profile.photo_url)}
                        alt=""
                        className="h-28 w-28 rounded-2xl border-4 border-ev-surface object-cover shadow-ev-md ring-1 ring-black/5"
                      />
                    ) : (
                      <div
                        className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-ev-surface bg-gradient-to-br from-ev-surface2 to-ev-border/40 text-xl font-bold tracking-wide text-ev-text shadow-ev-md ring-1 ring-black/5"
                        aria-hidden
                      >
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-center lg:text-left">
                    <p className="text-lg font-bold text-ev-text sm:text-xl">{profile?.name || 'Your name'}</p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${pill.className}`}
                    >
                      {pill.label}
                    </span>
                  </div>
                  {typeof profile?.available === 'boolean' ? (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-ev-border bg-ev-bg/80 px-3 py-2.5 text-sm lg:justify-start">
                      <Circle
                        size={10}
                        className={`shrink-0 fill-current ${profile.available ? 'text-emerald-500' : 'text-ev-subtle'}`}
                        aria-hidden
                      />
                      <span className="font-medium text-ev-text">
                        {profile.available ? 'Available for new jobs' : 'Not accepting new jobs'}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-5 border-t border-ev-border pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ev-subtle">Customer rating</p>
                    <div className="mt-2">
                      <StarRating avg={ratingAvg} count={ratingCount} />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2 text-xs text-ev-muted lg:justify-start">
                    <CalendarDays size={14} className="shrink-0 opacity-70" />
                    <span>
                      Member since <span className="font-medium text-ev-text">{formatMemberSince(profile?.created_at)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Right: detail cards */}
            <div className="space-y-6 lg:col-span-8">
              <section className="rounded-2xl border border-ev-border bg-ev-surface p-5 shadow-ev-sm sm:p-6">
                <h2 className="border-b border-ev-border pb-3 text-base font-semibold text-ev-text">Contact information</h2>
                <dl className="mt-5 space-y-4">
                  <div className="flex gap-4 sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ev-surface2 text-ev-primary">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">Mobile</dt>
                      <dd className="mt-0.5 text-sm font-medium text-ev-text sm:text-base">{profile?.phone || '—'}</dd>
                    </div>
                  </div>
                  <div className="flex gap-4 sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ev-surface2 text-ev-primary">
                      <Mail size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">Email</dt>
                      <dd className="mt-0.5 break-all text-sm font-medium text-ev-text sm:text-base">{profile?.email || '—'}</dd>
                    </div>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-ev-border bg-ev-surface p-5 shadow-ev-sm sm:p-6">
                <h2 className="border-b border-ev-border pb-3 text-base font-semibold text-ev-text">Service area</h2>
                <div className="mt-5 flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ev-surface2 text-ev-primary">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">City / area</p>
                        <p className="mt-0.5 text-sm font-medium text-ev-text">{cityLine}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">PIN code</p>
                        <p className="mt-0.5 text-sm font-medium text-ev-text tabular-nums">{pincode}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">Full address on file</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ev-text">{fullAddress}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-ev-border bg-ev-surface p-5 shadow-ev-sm sm:p-6">
                <h2 className="border-b border-ev-border pb-3 text-base font-semibold text-ev-text">Skills & experience</h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">Experience</p>
                    <p className="mt-1 text-sm font-medium text-ev-text">{experienceLabel || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">Services you offer</p>
                    {skills.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {skills.map((s) => (
                          <li
                            key={s}
                            className="rounded-lg border border-ev-border bg-ev-bg px-3 py-1.5 text-xs font-medium text-ev-text"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-ev-muted">No skills listed yet.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-ev-border bg-ev-surface p-5 shadow-ev-sm sm:p-6">
                <h2 className="border-b border-ev-border pb-3 text-base font-semibold text-ev-text">Verification</h2>
                <ul className="mt-5 space-y-3">
                  <li className="flex items-start justify-between gap-4 rounded-xl border border-ev-border/80 bg-ev-bg/50 px-4 py-3">
                    <div className="flex min-w-0 gap-3">
                      <BadgeCheck className="mt-0.5 shrink-0 text-ev-success" size={22} aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-ev-text">Account status</p>
                        <p className="text-xs text-ev-muted">
                          {approved
                            ? 'Your profile is live to customers in your service area.'
                            : 'Complete verification to appear in customer search results.'}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold uppercase text-ev-success">
                      {approved ? 'Active' : profile?.status || '—'}
                    </span>
                  </li>
                  <li className="flex items-start justify-between gap-4 rounded-xl border border-ev-border/80 bg-ev-bg/50 px-4 py-3">
                    <div className="flex min-w-0 gap-3">
                      <Shield className="mt-0.5 shrink-0 text-ev-muted" size={22} aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-ev-text">Identity (Aadhaar)</p>
                        <p className="text-xs text-ev-muted">
                          {profile?.aadhar_url
                            ? 'Document on file. Our team may review for compliance.'
                            : 'Upload from registration or contact support if you need to add documents.'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold uppercase ${
                        profile?.aadhar_url ? 'text-ev-success' : 'text-ev-warning'
                      }`}
                    >
                      {profile?.aadhar_url ? 'On file' : 'Optional'}
                    </span>
                  </li>
                </ul>
              </section>

              <div className="rounded-2xl border border-ev-border/80 bg-ev-surface2/30 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-ev-subtle">Account</p>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/80 bg-ev-surface px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 sm:w-auto"
                  onClick={() => {
                    clearAuth();
                    router.push('/login');
                  }}
                >
                  <LogOut size={18} />
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
