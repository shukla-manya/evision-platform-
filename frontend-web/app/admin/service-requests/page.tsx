'use client';

import { LifeBuoy } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';

export default function AdminServiceRequestsPage() {
  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2 mb-2">
          <LifeBuoy size={26} className="text-ev-primary" />
          Service requests
        </h1>
        <p className="text-ev-muted text-sm mb-8">Repairs, returns, and technician jobs will appear here.</p>
        <div className="ev-card p-10 text-center text-ev-muted text-sm max-w-lg">
          This section is not wired to the API yet. You can still manage orders and invoices from the sidebar.
        </div>
      </main>
    </AdminShell>
  );
}
