'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PasswordInputWithToggle } from '@/components/auth/PasswordInputWithToggle';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import type { PasswordResetApiRole } from '@/lib/user-roles';

type ResetRole = PasswordResetApiRole;

export default function ResetPasswordPage() {
  const role: ResetRole = 'admin';
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'start' | 'complete'>('start');
  const [loading, setLoading] = useState(false);

  async function startReset(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error('Enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authApi.passwordResetStart(role, em);
      setStep('complete');
      toast.success('OTP sent to your email');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Unable to start reset'));
    } finally {
      setLoading(false);
    }
  }

  async function completeReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.passwordResetComplete(role, email.trim().toLowerCase(), otp, newPassword);
      toast.success('Password updated successfully');
      setStep('start');
      setOtp('');
      setNewPassword('');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Unable to reset password'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="ev-card p-8">
          <h1 className="text-2xl font-bold text-ev-text mb-1">Reset password</h1>
          <p className="text-ev-muted text-sm mb-6">
            For <strong className="text-ev-text">approved shop admins</strong> and{' '}
            <strong className="text-ev-text">technicians with a password</strong>. We email a 6-digit code to the address on
            your account. <strong className="text-ev-text">Customers and dealers</strong> sign in with an email OTP — no
            password reset here. <strong className="text-ev-text">Superadmin</strong> uses the dedicated sign-in page.
          </p>

          {step === 'start' ? (
            <form onSubmit={startReset} className="space-y-4">
              <div>
                <label className="ev-label">Email</label>
                <input
                  type="email"
                  className="ev-input"
                  placeholder="admin@shop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="ev-btn-primary w-full inline-flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Send OTP <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={completeReset} className="space-y-4">
              <div>
                <label className="ev-label">OTP</label>
                <input
                  type="text"
                  className="ev-input text-center text-lg tracking-[0.35em] font-mono"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="ev-label">New password</label>
                <PasswordInputWithToggle
                  withLeadingLock={false}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="ev-btn-primary w-full inline-flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Update password'}
              </button>
              <button
                type="button"
                onClick={() => setStep('start')}
                className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
              >
                ← Resend OTP
              </button>
            </form>
          )}

          <p className="text-center text-ev-subtle text-sm mt-6">
            <Link href="/login" className="text-ev-primary hover:text-ev-primary-light">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
