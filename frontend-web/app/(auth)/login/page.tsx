'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { OtpCells } from '@/components/auth/OtpCells';

const OTP_ATTEMPTS = 5;

type Mode = 'otp-phone' | 'otp-code' | 'admin';

function formatPhoneForApi(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('otp-phone');
  const [loading, setLoading] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otpCells, setOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const [otpFocusKey, setOtpFocusKey] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(OTP_ATTEMPTS);
  const [noAccountForPhone, setNoAccountForPhone] = useState(false);

  const isOtpFlow = mode === 'otp-phone' || mode === 'otp-code';

  useEffect(() => {
    if (mode !== 'otp-code' || resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [mode, resendSeconds]);

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const formatted = formatPhoneForApi(phoneDigits);
    if (formatted.length < 12) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setNoAccountForPhone(false);
    try {
      await authApi.sendOtp(formatted);
      setOtpCells(['', '', '', '', '', '']);
      setOtpFocusKey((k) => k + 1);
      setOtpAttemptsLeft(OTP_ATTEMPTS);
      setMode('otp-code');
      setResendSeconds(30);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const otp = otpCells.join('');
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = formatPhoneForApi(phoneDigits);
      const { data } = await authApi.verifyOtp(formattedPhone, otp);
      if (!data.is_registered) {
        setNoAccountForPhone(true);
        setOtpCells(['', '', '', '', '', '']);
        setOtpFocusKey((k) => k + 1);
        return;
      }
      const payload = parseJwt(data.access_token);
      if (!payload || typeof payload.role !== 'string') {
        toast.error('Invalid session');
        return;
      }
      saveToken(data.access_token, payload.role);
      toast.success('Signed in');
      router.push(redirectByRole(payload.role));
    } catch {
      setOtpAttemptsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          queueMicrotask(() => {
            toast.error('Too many incorrect codes. Tap Resend OTP for a new code.');
            setMode('otp-phone');
            setOtpCells(['', '', '', '', '', '']);
            setResendSeconds(0);
          });
          return OTP_ATTEMPTS;
        }
        queueMicrotask(() => {
          toast.error(`Incorrect code. Please check and try again. ${next} attempt${next === 1 ? '' : 's'} remaining.`);
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.adminLogin(email, password);
      saveToken(data.access_token, 'admin');
      toast.success('Logged in!');
      router.push(redirectByRole('admin'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  const phoneMasked =
    phoneDigits.replace(/\D/g, '').length === 10
      ? `+91 ${phoneDigits.replace(/\D/g, '').slice(0, 2)}******${phoneDigits.replace(/\D/g, '').slice(-2)}`
      : '+91 XXXXXXXXXX';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-ev-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">{publicBrandName}</span>
          </Link>

          {isOtpFlow ? (
            <>
              <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
              {mode === 'otp-phone' && (
                <p className="text-ev-muted text-sm mt-2 leading-relaxed">
                  Enter your mobile number and we&apos;ll send you a quick OTP to sign in
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
              <p className="text-ev-muted text-sm mt-1">
                Shop admin — email and password (set password from approval email first)
              </p>
            </>
          )}
        </div>

        <div className="ev-card p-1 flex gap-1 mb-6">
          {[
            { key: 'otp-phone' as const, label: 'Mobile sign-in' },
            { key: 'admin' as const, label: 'Shop Admin' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                setOtpCells(['', '', '', '', '', '']);
                setResendSeconds(0);
                setNoAccountForPhone(false);
                setOtpAttemptsLeft(OTP_ATTEMPTS);
              }}
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

        <div className="ev-card p-8">
          {mode === 'otp-phone' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="ev-label">Mobile number (+91)</label>
                <div className="flex rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden focus-within:ring-2 focus-within:ring-ev-primary/40 focus-within:border-ev-primary transition-all">
                  <span className="flex items-center px-4 text-ev-muted text-sm font-semibold border-r border-ev-border shrink-0 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    className="flex-1 min-w-0 bg-transparent px-4 py-3 text-ev-text placeholder-ev-subtle text-base outline-none"
                    placeholder="9876543210"
                    maxLength={10}
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    autoComplete="tel-national"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="text-center text-ev-subtle text-sm">
                New here?{' '}
                <Link href="/register" className="text-ev-primary font-medium hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          )}

          {mode === 'otp-code' &&
            (noAccountForPhone ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-ev-border bg-ev-surface2 p-4 text-center space-y-3">
                  <p className="text-ev-text text-sm font-medium">No account found with this number.</p>
                  <p className="text-ev-muted text-sm">Would you like to register?</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link href="/register" className="ev-btn-primary text-sm py-2.5 px-4 text-center">
                      Create an account
                    </Link>
                    <button
                      type="button"
                      className="ev-btn-secondary text-sm py-2.5 px-4"
                      onClick={() => {
                        setNoAccountForPhone(false);
                        setMode('otp-phone');
                        setOtpCells(['', '', '', '', '', '']);
                        setResendSeconds(0);
                      }}
                    >
                      Try a different number
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <p className="text-ev-muted text-sm text-center leading-relaxed">
                  Enter the 6-digit code sent to {phoneMasked}
                </p>
                <div>
                  <OtpCells
                    key={otpFocusKey}
                    autoFocusKey={otpFocusKey}
                    cells={otpCells}
                    onCellsChange={setOtpCells}
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  className="ev-btn-primary w-full flex items-center justify-center gap-2"
                  disabled={loading || otpCells.join('').length !== 6}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      <span>Verify and sign in</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <p className="text-center text-ev-subtle text-sm leading-relaxed">
                  {resendSeconds > 0 ? (
                    <span>Didn&apos;t get it? Resend OTP in {resendSeconds} seconds</span>
                  ) : (
                    <button
                      type="button"
                      className="text-ev-primary hover:text-ev-primary-light font-medium disabled:opacity-50"
                      disabled={loading}
                      onClick={() => void handleSendOtp()}
                    >
                      Resend OTP
                    </button>
                  )}
                </p>
                <p className="text-center text-ev-subtle text-sm">
                  New here?{' '}
                  <Link href="/register" className="text-ev-primary hover:text-ev-primary-light font-medium">
                    Create an account
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('otp-phone');
                    setOtpCells(['', '', '', '', '', '']);
                    setResendSeconds(0);
                    setNoAccountForPhone(false);
                    setOtpAttemptsLeft(OTP_ATTEMPTS);
                  }}
                  className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
                >
                  ← Change number
                </button>
              </form>
            ))}

          {mode === 'admin' && (
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
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
              </button>
              <p className="text-center text-ev-subtle text-sm">
                <Link href="/reset-password?role=admin" className="text-ev-primary hover:text-ev-primary-light">
                  Forgot password?
                </Link>
              </p>
              <p className="text-center text-ev-subtle text-sm">
                No account?{' '}
                <Link href="/admin/register" className="text-ev-primary hover:text-ev-primary-light">
                  Register your shop
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-ev-muted text-xs mt-6">
          Technician login:{' '}
          <Link href="/electrician/login" className="text-ev-primary hover:underline">
            Electrician portal
          </Link>
        </p>
      </div>
    </div>
  );
}
