'use client';

import { Wallet } from 'lucide-react';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianEarningsPage() {
  return (
    <ElectricianShell>
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
          <Wallet size={24} className="text-ev-primary" />
          Earnings
        </h1>
        <div className="ev-card p-8 text-ev-muted text-sm">
          Weekly/monthly payout summary will show here when settlement APIs are available.
        </div>
      </div>
    </ElectricianShell>
  );
}
