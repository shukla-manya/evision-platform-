import { redirect } from 'next/navigation';

/** Bookmarks only — dealer account lives on /profile with name, GST, and hub links. */
export default function DealerAccountPage() {
  redirect('/profile');
}
