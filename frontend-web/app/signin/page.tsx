import { redirect } from 'next/navigation';

/** Legacy “admin sign-in” alias — shop catalogue is managed under superadmin. */
export default function AdminSignInAliasPage() {
  redirect('/super/signin');
}
