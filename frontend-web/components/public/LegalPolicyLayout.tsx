import type { ReactNode } from 'react';
import { publicCompanyLegalName } from '@/lib/public-contact';

export function LegalPolicyLayout({
  title,
  kicker = 'Legal',
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">{kicker}</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-2">{title}</h1>
      <p className="text-ev-subtle text-sm mb-10">
        Last updated: April 2026 · {publicCompanyLegalName}
      </p>
      <div className="ev-card p-6 sm:p-8 space-y-4 text-ev-muted text-sm leading-relaxed">{children}</div>
    </main>
  );
}
