import { redirect } from 'next/navigation';

/** Legacy path: storefront home is the public landing at `/` for everyone. */
export default function LegacyHomeRedirect() {
  redirect('/');
}
