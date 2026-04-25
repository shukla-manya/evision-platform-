'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getRole } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/electrician/dashboard', label: 'Dashboard' },
  { href: '/electrician/bookings/pending', label: 'Pending' },
  { href: '/electrician/bookings/active', label: 'Active' },
  { href: '/electrician/bookings/history', label: 'History' },
  { href: '/electrician/profile', label: 'Profile' },
];

export function ElectricianShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace('/electrician/login');
      return;
    }
    if (role !== 'electrician') {
      router.replace('/login');
    }
  }, [router]);

  const logout = () => {
    clearAuth();
    router.push('/electrician/login');
  };

  return (
    <div className="min-h-screen bg-ev-bg">
      <header className="border-b border-ev-border bg-ev-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ev-text">Electrician</span>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm px-3 py-1.5 rounded-lg ${
                  pathname === item.href ? 'bg-ev-primary text-white' : 'text-ev-muted hover:text-ev-text'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={logout} className="ev-btn-secondary text-sm py-2 px-3">
            Logout
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
