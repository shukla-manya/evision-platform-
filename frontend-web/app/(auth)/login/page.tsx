'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Phone, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole } from '@/lib/auth';

type Mode = 'otp-phone' | 'otp-code' | 'admin' | 'superadmin';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('otp-phone');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.sendOtp(phone.startsWith('+') ? phone : `+91${phone}`);
      toast.success('OTP sent to your phone');
      setMode('otp-code');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const { data } = await authApi.verifyOtp(formattedPhone, otp);
      if (!data.is_registered) {
        saveToken(data.access_token, 'unregistered');
        router.push('/register');
        return;
      }
      const payload = parseJwt(data.access_token);
      if (!payload || typeof payload.role !== 'string') {
        toast.error('Invalid session');
        return;
      }
      saveToken(data.access_token, payload.role);
      toast.success('Welcome back!');
      router.push(redirectByRole(payload.role));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await (mode === 'superadmin'
        ? authApi.superadminLogin(email, password)
        : authApi.adminLogin(email, password));
      const role = mode === 'superadmin' ? 'superadmin' : 'admin';
      saveToken(data.access_token, role);
      toast.success('Logged in!');
      router.push(redirectByRole(role));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-ev-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">E Vision</span>
          </Link>
          <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
          <p className="text-ev-muted text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Tab switcher */}
        <div className="ev-card p-1 flex gap-1 mb-6">
          {[
            { key: 'otp-phone', label: 'Customer / Dealer' },
            { key: 'admin', label: 'Shop Admin' },
            { key: 'superadmin', label: 'Superadmin' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setMode(key as Mode); setOtp(''); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-150 ${
                mode === key || (key === 'otp-phone' && mode === 'otp-code')
                  ? 'bg-ev-primary text-white shadow-ev-glow'
                  : 'text-ev-muted hover:text-ev-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Forms */}
        <div className="ev-card p-8">
          {/* OTP — Phone */}
          {mode === 'otp-phone' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="ev-label">Mobile Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                  <input
                    type="tel"
                    className="ev-input pl-10"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Send OTP</span><ArrowRight size={16} /></>}
              </button>
              <p className="text-center text-ev-subtle text-sm">
                New here?{' '}
                <Link href="/register" className="text-ev-primary hover:text-ev-primary-light">
                  Create account
                </Link>
              </p>
            </form>
          )}

          {/* OTP — Code */}
          {mode === 'otp-code' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-ev-muted text-sm">OTP sent to <strong className="text-ev-text">{phone}</strong></p>
              </div>
              <div>
                <label className="ev-label">Enter 6-digit OTP</label>
                <input
                  type="text"
                  className="ev-input text-center text-xl tracking-[0.4em] font-mono"
                  placeholder="• • • • • •"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setMode('otp-phone')}
                className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
              >
                ← Change number
              </button>
            </form>
          )}

          {/* Admin / Superadmin — Email+Password */}
          {(mode === 'admin' || mode === 'superadmin') && (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="ev-label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                  <input
                    type="email"
                    className="ev-input pl-10"
                    placeholder="admin@yourshop.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : `Sign in as ${mode === 'superadmin' ? 'Superadmin' : 'Admin'}`}
              </button>
              {mode === 'admin' && (
                <p className="text-center text-ev-subtle text-sm">
                  No account?{' '}
                  <Link href="/admin/register" className="text-ev-primary hover:text-ev-primary-light">
                    Register your shop
                  </Link>
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
