'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { publicAdminRegisterUrl, publicAdminSignInUrl } from '@/lib/public-links';

export function FaqShopAdminSigninAnswer() {
  const [guest, setGuest] = useState(true);
  const [shopAdmin, setShopAdmin] = useState(false);

  useEffect(() => {
    const loggedIn = isLoggedIn();
    setGuest(!loggedIn);
    setShopAdmin(getRole() === 'admin');
  }, []);

  if (!guest && shopAdmin) {
    return (
      <>
        You&apos;re signed in as a shop admin. Open your{' '}
        <Link href="/admin/dashboard" className="text-ev-primary hover:text-ev-primary-light font-medium">
          Shop dashboard
        </Link>
        .
      </>
    );
  }

  if (!guest) {
    return (
      <>
        Shop admins use a separate sign-in with <strong className="text-ev-text">email and password</strong>, not
        mobile OTP. Those links are meant for store owners and are shown in the site footer when you are signed out. To
        open the shop console, sign out first or use a saved bookmark to the admin URL.
      </>
    );
  }

  return (
    <>
      Shop admins use a separate sign-in with <strong className="text-ev-text">email and password</strong>, not mobile
      OTP. Use{' '}
      <a href={publicAdminSignInUrl} className="text-ev-primary hover:text-ev-primary-light font-medium">
        Admin sign in
      </a>{' '}
      (opens the admin site). New shops can{' '}
      <a href={publicAdminRegisterUrl} className="text-ev-primary hover:text-ev-primary-light font-medium">
        register
      </a>{' '}
      there or from the mobile app.
    </>
  );
}
