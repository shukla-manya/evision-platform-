'use client';

import { Star } from 'lucide-react';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianReviewsPage() {
  return (
    <ElectricianShell>
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
          <Star size={24} className="text-ev-warning" />
          My reviews
        </h1>
        <div className="ev-card p-8 text-ev-muted text-sm">
          Customer review listing will appear here once the review feed endpoint is connected.
        </div>
      </div>
    </ElectricianShell>
  );
}
