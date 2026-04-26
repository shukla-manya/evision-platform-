import { redirect } from 'next/navigation';

/** Public URL for the admin app (e.g. admin.lenscart.com/signin) — form lives at /admin/login. */
export default function AdminSignInAliasPage() {
  redirect('/admin/login');
}
