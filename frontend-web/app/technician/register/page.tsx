import { PublicShell } from '@/components/public/PublicShell';
import { TechnicianApplicationForm } from '@/components/register/TechnicianApplicationForm';

export default function TechnicianRegisterPage() {
  return (
    <PublicShell>
      <div className="px-4 py-12 flex justify-center">
        <TechnicianApplicationForm />
      </div>
    </PublicShell>
  );
}
