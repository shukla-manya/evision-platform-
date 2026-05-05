'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole, getRole, isLoggedIn } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoggedIn()) return;
    const r = getRole();
    if (!r) return;
    router.replace(redirectByRole(r));
  }, [router]);

  useEffect(() => {
    if (searchParams.get('approved') === '1') {
      toast.success('You can sign in with the email on your shop account to continue.');
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error('Enter a valid email address');
      return;
    }
    if (!password) {
      toast.error('Enter your password');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login(em, password);
      const payload = parseJwt(data.access_token);
      if (!payload || typeof payload.role !== 'string') {
        toast.error('Invalid session');
        return;
      }
      const role = payload.role;
      saveToken(data.access_token, role);
      if (role === 'electrician_pending') {
        toast.success("Your account is still under review. You'll be notified once approved.");
      } else {
        toast.success('Signed in');
      }
      router.push(redirectByRole(role));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-ev-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">{publicBrandName}</span>
          </div>
          <p className="text-3xl leading-none mb-2" aria-hidden>👋</p>
          <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
          <p className="text-ev-muted text-sm mt-2 leading-relaxed max-w-sm mx-auto">
            Sign in with your email and password
          </p>
        </div>

        <div className="ev-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="ev-label">Email</label>
              <input
                type="email"
                className="ev-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="ev-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="ev-input pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ev-subtle hover:text-ev-muted"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="ev-btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            <div className="flex flex-col gap-2 items-stretch pt-1">
              <span className="text-center text-ev-subtle text-sm">New here?</span>
              <Link href="/register" className="ev-btn-secondary text-sm py-2.5 px-4 text-center">
                Create account
              </Link>
            </div>
            <p className="text-center text-ev-muted text-xs leading-relaxed">
              Works for customers, dealers and technicians
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-ev-primary" size={28} />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
