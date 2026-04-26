'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

function isTechnicianRole(r: string | undefined) {
  return r === 'electrician' || r === 'electrician_pending' || r === 'electrician_rejected';
}

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
          <p className="text-ev-muted text-sm mb-8 leading-relaxed">
            Coverage expands with our technician network.{' '}
            <Link href="/login" className="text-ev-primary font-medium hover:underline">
              Sign in
            </Link>{' '}
            or{' '}
            <Link href="/register" className="text-ev-primary font-medium hover:underline">
              create an account
            </Link>
            , then book from{' '}
            <Link href="/service/request" className="text-ev-primary font-medium hover:underline">
              Book a technician
            </Link>{' '}
            or{' '}
            <Link href="/orders" className="text-ev-primary font-medium hover:underline">
              My orders
            </Link>{' '}
            once you have eligible purchases.
          </p>
        ) : shopper ? (
          <p className="text-ev-muted text-sm mb-8 leading-relaxed">
            Coverage expands with our technician network. Book installation or service from{' '}
            <Link href="/service/request" className="text-ev-primary font-medium hover:underline">
              Book a technician
            </Link>{' '}
            or from{' '}
            <Link href="/orders" className="text-ev-primary font-medium hover:underline">
              My orders
            </Link>{' '}
            for eligible items.
          </p>
        ) : technician ? (
          <p className="text-ev-muted text-sm mb-8 leading-relaxed">
            Coverage expands as more technicians join. Manage your profile, areas, and job requests from{' '}
            <Link href="/electrician/dashboard" className="text-ev-primary font-medium hover:underline">
              Technician home
            </Link>
            .
          </p>
        ) : (
          <p className="text-ev-muted text-sm mb-8 leading-relaxed">
            Coverage expands with our technician network. Shoppers book from their account via Book a technician or My
            orders after they sign in.
          </p>
        )}
      </main>
    </PublicShell>
  );
}
