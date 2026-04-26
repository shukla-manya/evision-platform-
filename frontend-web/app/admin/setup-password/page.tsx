'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { PasswordInputWithToggle } from '@/components/auth/PasswordInputWithToggle';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Missing setup link. Open the link from your approval email.');
      return;
    }
    if (password.length < 8) {
      toast.error('Use at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.adminSetupPassword(token.trim(), password);
      toast.success('Password saved. You can sign in now.');
      router.push('/admin/login');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not set password'));
    } finally {
      setLoading(false);
    }
  }

  if (!token.trim()) {
    return (
      <div className="ev-card p-8 text-center space-y-4">
        <p className="text-ev-muted text-sm">This page needs a valid link from your shop approval email.</p>
        <Link href="/admin/login" className="ev-btn-primary text-sm py-2.5 px-5 inline-flex justify-center">
          Go to admin sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="ev-card p-8 space-y-5">
      <h1 className="text-xl font-bold text-ev-text">Create your admin password</h1>
      <p className="text-ev-muted text-sm leading-relaxed">
        Choose a password for your shop admin account. You will use this with your email every time you sign in.
      </p>
      <div>
        <label className="ev-label">New password</label>
        <PasswordInputWithToggle
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="ev-label">Confirm password</label>
        <PasswordInputWithToggle
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Save password <ArrowRight size={16} /></>}
      </button>
      <div className="flex justify-center pt-1">
        <Link href="/admin/login" className="ev-btn-secondary text-sm py-2 px-4 inline-flex">
          Already set up? Sign in
        </Link>
      </div>
    </form>
  );
}

export default function AdminSetupPasswordPage() {
  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">e vision</span>
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="ev-card p-8 text-center text-ev-muted text-sm flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-ev-primary" size={20} />
              Loading…
            </div>
          }
        >
          <SetupPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
