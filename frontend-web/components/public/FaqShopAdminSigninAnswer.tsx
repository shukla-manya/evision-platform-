'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { publicAdminRegisterUrl, publicAdminSignInUrl } from '@/lib/public-links';

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
        to manage the catalogue, orders, and registrations.
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
      Partner shop applications (optional) use{' '}
      <a href={publicAdminRegisterUrl} className="text-ev-primary hover:text-ev-primary-light font-medium">
        shop registration
      </a>
      . The product catalogue is maintained by{' '}
      <a href={publicAdminSignInUrl} className="text-ev-primary hover:text-ev-primary-light font-medium">
        superadmin sign-in
      </a>
      .
    </>
  );
}
