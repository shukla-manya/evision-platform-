import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';

export default function TechnicianServicesPage() {
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
        <p className="text-ev-muted text-sm mb-8">Coverage expands with our technician network. Book from your account after sign-in.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="ev-btn-primary">
            Sign in to book
          </Link>
          <Link href="/technician/register" className="ev-btn-secondary">
            Join as technician
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
