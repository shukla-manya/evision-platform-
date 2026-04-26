'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bolt,
  CircleDot,
  Clock3,
  Home,
  Loader2,
  LogOut,
  UserRound,
} from 'lucide-react';
import { electricianApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';
import { ELECTRICIAN_SUPPORT_EMAIL } from '@/lib/electrician-ui';
import { EvisionLogo } from '@/components/brand/EvisionLogo';

type MeRow = {
  status?: string;
  reject_reason?: string | null;
  name?: string;
};

type Gate = 'loading' | 'pending' | 'rejected' | 'approved' | 'approved_refresh';

const NAV_ITEMS = [
  { href: '/electrician/dashboard', label: 'Home', icon: Home },
  { href: '/electrician/bookings/pending', label: 'Bookings', icon: Bolt, badge: 'pending' as const },
  { href: '/electrician/bookings/active', label: 'Active Job', icon: CircleDot },
  { href: '/electrician/bookings/history', label: 'History', icon: Clock3 },
  { href: '/electrician/profile', label: 'Profile', icon: UserRound },
];

function PendingApprovalView() {
  return (
    <div className="min-h-screen bg-ev-bg flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md ev-card p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-ev-warning/15 flex items-center justify-center">
          <Clock3 className="text-ev-warning" size={28} />
        </div>
        <h1 className="text-xl font-bold text-ev-text">Application under review</h1>
        <p className="text-ev-muted text-sm leading-relaxed">
          Your profile and Aadhar card have been submitted to our team. We&apos;ll review your documents and get back to
          you within 24 hours.
        </p>
        <p className="text-ev-subtle text-sm leading-relaxed">
          You&apos;ll receive an email and a notification here as soon as your account is approved.
        </p>
        <div className="pt-4 border-t border-ev-border space-y-2">
          <a href={`mailto:${ELECTRICIAN_SUPPORT_EMAIL}`} className="ev-btn-secondary text-sm py-2.5 px-4 inline-flex w-full justify-center">
            Email support
          </a>
          <p className="text-ev-subtle text-xs text-center font-mono break-all">{ELECTRICIAN_SUPPORT_EMAIL}</p>
        </div>
      </div>
    </div>
  );
}

function ApprovedSignInAgainView() {
  const router = useRouter();
  const onContinue = () => {
    clearAuth();
    router.push('/login?approved=1');
  };
  return (
    <div className="min-h-screen bg-ev-bg flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md ev-card p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 flex items-center justify-center">
          <Bolt className="text-emerald-400" size={28} />
        </div>
        <h1 className="text-xl font-bold text-ev-text">You&apos;re approved</h1>
        <p className="text-ev-muted text-sm leading-relaxed">
          Sign in once more with your mobile OTP to open your technician workspace and go online.
        </p>
        <button type="button" onClick={onContinue} className="ev-btn-primary w-full">
          Continue to sign in
        </button>
      </div>
    </div>
  );
}

function RejectedView({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-ev-bg flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md ev-card p-8 space-y-4">
        <h1 className="text-xl font-bold text-ev-text text-center">Application not approved</h1>
        <p className="text-ev-muted text-sm leading-relaxed">{reason}</p>
        <p className="text-ev-subtle text-xs text-center">
          You can update your details and submit a new application from registration.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/register?role=electrician" className="ev-btn-primary text-center text-sm py-2.5">
            Register again
          </Link>
        </div>
        <div className="pt-4 border-t border-ev-border space-y-2">
          <a href={`mailto:${ELECTRICIAN_SUPPORT_EMAIL}`} className="ev-btn-secondary text-sm py-2.5 px-4 inline-flex w-full justify-center">
            Email support
          </a>
          <p className="text-ev-subtle text-xs text-center font-mono break-all">{ELECTRICIAN_SUPPORT_EMAIL}</p>
        </div>
      </div>
    </div>
  );
}

export function ElectricianShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>('loading');
  const [rejectReason, setRejectReason] = useState('');
  const [loadingBadge, setLoadingBadge] = useState(true);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace('/login');
      return;
    }
    const allowed = new Set(['electrician', 'electrician_pending', 'electrician_rejected']);
    if (!allowed.has(role)) {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    const role = getRole();
    if (!role) return;
    const allowed = new Set(['electrician', 'electrician_pending', 'electrician_rejected']);
    if (!allowed.has(role)) return;

    let cancelled = false;

    const handleMe = (me: MeRow, jwtRole: string) => {
      const st = String(me.status || '').toLowerCase();
      if (jwtRole === 'electrician_pending') {
        if (st === 'approved') {
          setGate('approved_refresh');
          return;
        }
        if (st === 'rejected') {
          setRejectReason(String(me.reject_reason || 'Your application was not approved at this time.'));
          setGate('rejected');
          return;
        }
        setGate('pending');
        return;
      }
      if (jwtRole === 'electrician_rejected') {
        setRejectReason(String(me.reject_reason || 'Your application was not approved at this time.'));
        setGate('rejected');
        return;
      }
      if (st === 'pending') setGate('pending');
      else if (st === 'rejected') {
        setRejectReason(String(me.reject_reason || 'Your application was not approved at this time.'));
        setGate('rejected');
      } else setGate('approved');
    };

    electricianApi
      .me()
      .then((res) => {
        if (cancelled) return;
        handleMe((res.data || {}) as MeRow, String(role));
      })
      .catch(() => {
        if (cancelled) return;
        if (role === 'electrician_pending') setGate('pending');
        else if (role === 'electrician_rejected') {
          setRejectReason('Your application was not approved at this time.');
          setGate('rejected');
        } else setGate('approved');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (gate !== 'approved') return;
    let cancelled = false;
    electricianApi
      .pendingBookings()
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? (res.data as unknown[]) : [];
        setPendingCount(rows.length);
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingBadge(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gate]);

  const logout = () => {
    clearAuth();
    router.push('/login');
  };

  if (gate === 'loading') {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-ev-primary" size={28} />
      </div>
    );
  }

  if (gate === 'approved_refresh') {
    return (
      <div className="min-h-screen bg-ev-bg">
        <ApprovedSignInAgainView />
        <div className="fixed bottom-0 inset-x-0 p-4 bg-ev-surface border-t border-ev-border lg:hidden">
          <button
            type="button"
            onClick={logout}
            className="w-full ev-btn-secondary py-3 text-sm inline-flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (gate === 'pending') {
    return (
      <div className="min-h-screen bg-ev-bg">
        <PendingApprovalView />
        <div className="fixed bottom-0 inset-x-0 p-4 bg-ev-surface border-t border-ev-border lg:hidden">
          <button
            type="button"
            onClick={logout}
            className="w-full ev-btn-secondary py-3 text-sm inline-flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (gate === 'rejected') {
    return (
      <div className="min-h-screen bg-ev-bg">
        <RejectedView reason={rejectReason} />
        <div className="fixed bottom-0 inset-x-0 p-4 bg-ev-surface border-t border-ev-border lg:hidden">
          <button
            type="button"
            onClick={logout}
            className="w-full ev-btn-secondary py-3 text-sm inline-flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-bg flex flex-col lg:flex-row pb-20 lg:pb-0">
      <aside className="hidden lg:flex ev-sidebar w-60 sm:w-64 flex-col fixed inset-y-0 z-30">
        <div className="p-5 border-b ev-sidebar-border">
          <Link href="/electrician/dashboard" className="flex items-center gap-2.5">
            <EvisionLogo variant="mark" height={36} className="shrink-0 shadow-ev-glow rounded-lg" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">E vision</p>
              <p className="ev-sidebar-muted text-xs">Technician</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            const showBadge = badge === 'pending' && !loadingBadge && (pendingCount ?? 0) > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'ev-sidebar-link-active' : 'ev-sidebar-link'
                }`}
              >
                <Icon size={17} />
                <span className="flex-1 min-w-0 truncate">{label}</span>
                {badge === 'pending' && loadingBadge ? (
                  <Loader2 size={12} className="animate-spin text-white/60" />
                ) : null}
                {showBadge ? (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-ev-primary text-white text-[10px] font-bold">
                    {(pendingCount ?? 0) > 99 ? '99+' : pendingCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t ev-sidebar-border">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/65 hover:text-red-300 hover:bg-red-500/10 text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ev-shell-body min-h-screen min-w-0 flex-1 overflow-x-hidden lg:ml-64">
        {children}
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ev-border bg-ev-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-stretch max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            const showDot = badge === 'pending' && !loadingBadge && (pendingCount ?? 0) > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium ${
                  active ? 'text-ev-primary' : 'text-ev-muted'
                }`}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={active ? 2.25 : 2} />
                  {showDot ? (
                    <span className="absolute -top-0.5 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-ev-primary text-white text-[9px] font-bold flex items-center justify-center">
                      {(pendingCount ?? 0) > 9 ? '9+' : pendingCount}
                    </span>
                  ) : null}
                </span>
                <span className="truncate max-w-[4.5rem] text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
