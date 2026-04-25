import { PublicShell } from '@/components/public/PublicShell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
