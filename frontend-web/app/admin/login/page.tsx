'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.adminLogin(email, password);
      saveToken(data.access_token, 'admin');
      toast.success('Welcome back');
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">E Vision</span>
          </Link>
          <h1 className="text-2xl font-bold text-ev-text">Shop admin sign in</h1>
          <p className="text-ev-muted text-sm mt-1">Manage products, orders, and invoices for your shop</p>
        </div>
        <div className="ev-card p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="ev-label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                <input
                  type="email"
                  className="ev-input pl-10"
                  placeholder="you@shop.com"
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
            <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
            <p className="text-center text-ev-subtle text-sm">
              <Link href="/admin/register" className="text-ev-primary hover:text-ev-primary-light">
                Register your shop
              </Link>
              {' · '}
              <Link href="/login" className="text-ev-muted hover:text-ev-text">
                Other sign-in options
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
