'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

function isTechnicianRole(r: string | undefined) {
  return r === 'electrician' || r === 'electrician_pending' || r === 'electrician_rejected';
}

const btnPrimary = 'ev-btn-primary text-sm py-2.5 px-4 inline-flex items-center justify-center';
const btnSecondary = 'ev-btn-secondary text-sm py-2.5 px-4 inline-flex items-center justify-center';

export default function TechnicianServicesPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
  }, []);

  const shopper = role === 'customer' || role === 'dealer';
  const technician = isTechnicianRole(role);

  return (
    <PublicShell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-ev-text mb-2">Technician Services</h1>
        <p className="text-ev-muted mb-6">
          Book verified electricians for AC repair, wiring, inverters, and more — after you buy your gear, we help you install and maintain it.
        </p>
        <p id="areas" className="text-ev-text font-medium mb-2">
          Service areas
        </p>
        {!loggedIn ? (
          <>
            <p className="text-ev-muted text-sm mb-4 leading-relaxed">
              Coverage expands with our technician network. Sign in or create an account, then book from Book a technician or open My orders once you have eligible purchases.
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              <Link href="/login" className={btnSecondary}>
                Sign in
              </Link>
              <Link href="/register" className={btnSecondary}>
                Create account
              </Link>
              <Link href="/service/request" className={btnPrimary}>
                Book a technician
              </Link>
              <Link href="/orders" className={btnSecondary}>
                My orders
              </Link>
            </div>
          </>
        ) : shopper ? (
          <>
            <p className="text-ev-muted text-sm mb-4 leading-relaxed">
              Coverage expands with our technician network. Book installation or service using the shortcuts below, or from My orders for eligible items.
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              <Link href="/service/request" className={btnPrimary}>
                Book a technician
              </Link>
              <Link href="/orders" className={btnSecondary}>
                My orders
              </Link>
            </div>
          </>
        ) : technician ? (
          <>
            <p className="text-ev-muted text-sm mb-4 leading-relaxed">
              Coverage expands as more technicians join. Manage your profile, areas, and job requests from Technician home.
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              <Link href="/electrician/dashboard" className={btnPrimary}>
                Technician home
              </Link>
            </div>
          </>
        ) : (
          <p className="text-ev-muted text-sm mb-8 leading-relaxed">
            Coverage expands with our technician network. Shoppers book from their account via Book a technician or My orders after they sign in.
          </p>
        )}
      </main>
    </PublicShell>
  );
}
