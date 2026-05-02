import { redirect } from 'next/navigation';

/** Shop partner self-registration was removed; catalogue is superadmin-managed. */
export default function AdminRegisterRedirectPage() {
  redirect('/shop');
}
