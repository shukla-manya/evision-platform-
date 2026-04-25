'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken } from '@/lib/auth';

export default function SuperSignInPage() {
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
        const { data } = await authApi.superadminLogin(email, password);
        setLoginToken(data.login_token);
        toast.success('OTP sent to your registered phone');
      } else {
        const { data } = await authApi.superadminLoginVerify(loginToken, otp);
        saveToken(data.access_token, 'superadmin');
        toast.success('Signed in');
        router.push('/super/dashboard');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-ev-accent/5 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">LensCart</span>
          </div>
          <h1 className="text-2xl font-bold text-ev-text">Platform administration</h1>
          <p className="text-ev-muted text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Restricted access. Authorised personnel only.
          </p>
        </div>
        <div className="ev-card p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            {!loginToken ? (
              <>
                <div>
                  <label className="ev-label">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input
                      type="email"
                      className="ev-input pl-10"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
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
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="ev-btn-primary w-full flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign in securely'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ev-muted text-center">Enter the OTP sent to your registered phone.</p>
                <div>
                  <label className="ev-label">One-time code</label>
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
                <button
                  type="submit"
                  className="ev-btn-primary w-full flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify and sign in'}
                </button>
                <button
                  type="button"
                  className="text-sm text-ev-subtle hover:text-ev-muted w-full"
                  onClick={() => {
                    setLoginToken('');
                    setOtp('');
                  }}
                >
                  ← Change email or password
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
