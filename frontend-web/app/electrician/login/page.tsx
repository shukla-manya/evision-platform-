'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken } from '@/lib/auth';

export default function ElectricianLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!loginToken) {
        const { data } = await authApi.mobileLogin(email, password);
        if (data.role !== 'electrician') {
          toast.error('This account is not an electrician account');
          return;
        }
        setLoginToken(data.login_token);
        toast.success('OTP sent to your registered phone');
      } else {
        const { data } = await authApi.mobileLoginVerify(loginToken, otp);
        if (data.role !== 'electrician') {
          toast.error('Invalid role for electrician login');
          return;
        }
        saveToken(data.access_token, 'electrician');
        toast.success('Welcome back');
        router.push('/electrician/dashboard');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">E Vision</span>
          </Link>
          <h1 className="text-2xl font-bold text-ev-text">Electrician sign in</h1>
          <p className="text-ev-muted text-sm mt-1">Login with email/password then verify OTP on mobile</p>
        </div>
        <div className="ev-card p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            {!loginToken ? (
              <>
                <div>
                  <label className="ev-label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input
                      type="email"
                      className="ev-input pl-10"
                      placeholder="electrician@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input
                      type="password"
                      className="ev-input pl-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Continue to OTP <ArrowRight size={16} /></>}
                </button>
                <p className="text-center text-ev-subtle text-sm">
                  <Link href="/reset-password?role=electrician" className="text-ev-primary hover:text-ev-primary-light">
                    Forgot password?
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-ev-muted text-center">Password verified. Enter OTP sent to your phone.</p>
                <div>
                  <label className="ev-label">OTP</label>
                  <input
                    type="text"
                    className="ev-input text-center text-lg tracking-[0.35em] font-mono"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    required
                  />
                </div>
                <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Verify OTP <ArrowRight size={16} /></>}
                </button>
              </>
            )}
            <p className="text-center text-sm text-ev-muted">
              <Link href="/login" className="text-ev-primary hover:text-ev-primary-light">
                Other sign-in options
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
