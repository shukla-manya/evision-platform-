'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';

type ResetRole = 'electrician' | 'admin';

const ROLES: ResetRole[] = ['electrician', 'admin'];

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  return `+91${trimmed}`;
}

export default function ResetPasswordPage() {
  const [role, setRole] = useState<ResetRole>('admin');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'start' | 'complete'>('start');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const queryRole = new URLSearchParams(window.location.search).get('role');
    if (queryRole && ROLES.includes(queryRole as ResetRole)) {
      setRole(queryRole as ResetRole);
    }
  }, []);

  async function startReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.passwordResetStart(role, normalizePhone(phone));
      setStep('complete');
      toast.success('OTP sent to your mobile number');
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
      await authApi.passwordResetComplete(role, normalizePhone(phone), otp, newPassword);
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
            For shop admins and technicians only. Customers and dealers sign in with mobile OTP — no password to reset.
          </p>

          {step === 'start' ? (
            <form onSubmit={startReset} className="space-y-4">
              <div>
                <label className="ev-label">Role</label>
                <select
                  className="ev-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as ResetRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ev-label">Mobile number</label>
                <input
                  type="tel"
                  className="ev-input"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
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
                <input
                  type="password"
                  className="ev-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
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
