import { redirect } from 'next/navigation';

/** Shop partner self-registration is disabled; catalogue is superadmin-managed. */
export default function AdminRegisterPage() {
  redirect('/');
}
