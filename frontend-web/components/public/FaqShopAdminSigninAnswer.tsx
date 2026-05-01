'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { publicAdminSignInUrl } from '@/lib/public-links';

export function FaqShopAdminSigninAnswer() {
  const [guest, setGuest] = useState(true);
  const [superadmin, setSuperadmin] = useState(false);

  useEffect(() => {
    const loggedIn = isLoggedIn();
    setGuest(!loggedIn);
    setSuperadmin(getRole() === 'superadmin');
  }, []);

  if (!guest && superadmin) {
    return (
      <>
        You&apos;re signed in as superadmin. Open the{' '}
        <Link href="/super/dashboard" className="text-ev-primary hover:text-ev-primary-light font-medium">
          platform dashboard
        </Link>{' '}
        to manage the catalogue, orders, and platform workflows.
      </>
    );
  }

  if (!guest) {
    return (
      <>
        The public storefront catalogue is managed in the superadmin console (separate sign-in). Use the footer links
        when signed out, or ask your organisation for the correct URL.
      </>
    );
  }

  return (
    <>
      The product catalogue is maintained through{' '}
      <a href={publicAdminSignInUrl} className="text-ev-primary hover:text-ev-primary-light font-medium">
        superadmin sign-in
      </a>
      . Partner shop self-registration is not available; storefront fulfilment is coordinated by the platform team.
    </>
  );
}
