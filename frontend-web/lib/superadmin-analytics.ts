/** Response shape for `GET /superadmin/analytics` — shared by dashboard and analytics pages. */
export type SuperadminAnalyticsSnapshot = {
  admins: { total: number; pending: number; approved: number; rejected: number; suspended: number };
  users: {
    total: number;
    customers: number;
    dealers: number;
    /** Rows in `users` with role electrician (technicians use the electricians table). */
    electricians?: number;
  };
  emails: { total: number; sent: number; failed: number };
  orders?: { platform_revenue: number; orders_today: number; total_count?: number };
  revenue_by_shop?: { admin_id: string; shop_name: string; amount: number; order_count?: number }[];
  recent_orders?: {
    id: string;
    group_id: string;
    customer: string;
    shop: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
  recent_emails?: { trigger: string; recipient: string; to_role: string; status: string; time: string }[];
  active_electricians?: number;
  generated_at?: string;
};

export function formatSuperadminINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function formatSuperadminCompactINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return formatSuperadminINR(n);
}

export function superadminOrderStatusTone(status: string): 'success' | 'error' | 'pending' | 'muted' {
  const s = status.toLowerCase();
  if (s.includes('deliver') || s.includes('complete')) return 'success';
  if (s.includes('fail') || s.includes('cancel')) return 'error';
  if (s.includes('transit') || s.includes('ship') || s.includes('process')) return 'pending';
  return 'muted';
}
