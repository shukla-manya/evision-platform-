'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { homeJoinTechnicianSectionImageAlt, homeJoinTechnicianSectionImageSrc } from '@/lib/home-cctv-content';

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
      <main className="ev-container py-12 sm:py-14 w-full min-w-0">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-12 items-start max-w-6xl mx-auto">
          <div className="relative w-full min-h-[240px] sm:min-h-[280px] lg:min-h-[320px] rounded-2xl overflow-hidden border border-ev-border bg-ev-surface2 shadow-ev-sm lg:sticky lg:top-24 self-start aspect-[5/4] sm:aspect-[4/3] lg:aspect-auto">
            {/* eslint-disable-next-line @next/next/no-img-element -- marketing: technician install */}
            <img
              src={homeJoinTechnicianSectionImageSrc}
              alt={homeJoinTechnicianSectionImageAlt}
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-ev-navbar/30 via-transparent to-transparent pointer-events-none"
              aria-hidden
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-2">Technician Services</h1>
            <p className="text-ev-muted mb-6 leading-relaxed">
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
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
