'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole } from '@/lib/auth';

type Mode = 'otp-phone' | 'otp-code' | 'admin';

function formatPhoneForApi(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

function OtpCells({
  cells,
  onCellsChange,
  disabled,
}: {
  cells: string[];
  onCellsChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = useCallback(
    (index: number, digit: string) => {
      const d = digit.replace(/\D/g, '').slice(-1);
      const next = [...cells];
      next[index] = d;
      onCellsChange(next);
    },
    [cells, onCellsChange],
  );

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="One-time password">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          className="w-10 h-12 sm:w-11 sm:h-14 text-center text-lg font-semibold rounded-xl border border-ev-border bg-ev-surface2 text-ev-text
                     focus:outline-none focus:ring-2 focus:ring-ev-primary/40 focus:border-ev-primary transition-shadow"
          value={cells[i] ?? ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            if (raw.length > 1) {
              const filled = raw.slice(0, 6).split('');
              const next = Array.from({ length: 6 }, (_, j) => filled[j] ?? '');
              onCellsChange(next);
              refs.current[Math.min(5, filled.length)]?.focus();
              return;
            }
            setAt(i, raw);
            if (raw && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (cells[i]) {
                setAt(i, '');
              } else if (i > 0) {
                refs.current[i - 1]?.focus();
                setAt(i - 1, '');
              }
            }
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('otp-phone');
  const [loading, setLoading] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otpCells, setOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const [otpMountId, setOtpMountId] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [adminOtp, setAdminOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminLoginToken, setAdminLoginToken] = useState('');

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
    try {
      await authApi.sendOtp(formatted);
      toast.success('OTP sent to your phone');
      setOtpCells(['', '', '', '', '', '']);
      setOtpMountId((n) => n + 1);
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
      if (!adminLoginToken) {
        const { data } = await authApi.adminLogin(email, password);
        setAdminLoginToken(data.login_token);
        toast.success('OTP sent to your registered phone');
      } else {
        const { data } = await authApi.adminLoginVerify(adminLoginToken, adminOtp);
        saveToken(data.access_token, 'admin');
        toast.success('Logged in!');
        router.push(redirectByRole('admin'));
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
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-ev-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">LensCart</span>
          </Link>

          {isOtpFlow ? (
            <>
              <p className="text-ev-muted text-sm font-medium tracking-wide mb-2">Customer / Dealer / Electrician — sign in</p>
              <p className="text-4xl mb-3" aria-hidden>
                👋
              </p>
              <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
              {mode === 'otp-phone' && (
                <p className="text-ev-muted text-sm mt-2">Enter your mobile number to get OTP</p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
              <p className="text-ev-muted text-sm mt-1">Shop admin sign in</p>
            </>
          )}
        </div>

        <div className="ev-card p-1 flex gap-1 mb-6">
          {[
            { key: 'otp-phone' as const, label: 'Customer / Dealer / Electrician' },
            { key: 'admin' as const, label: 'Shop Admin' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                setOtpCells(['', '', '', '', '', '']);
                setResendSeconds(0);
                setAdminOtp('');
                setAdminLoginToken('');
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
                <label className="ev-label">Mobile number</label>
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
            </form>
          )}

          {mode === 'otp-code' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="ev-label text-center block">Enter OTP (sent to your phone)</label>
                <OtpCells key={otpMountId} cells={otpCells} onCellsChange={setOtpCells} disabled={loading} />
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
                  <span>Resend OTP in {resendSeconds} sec</span>
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
                <span className="text-ev-border"> · </span>
                <span>
                  New user?{' '}
                  <Link href="/register" className="text-ev-primary hover:text-ev-primary-light font-medium">
                    Register
                  </Link>
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('otp-phone');
                  setOtpCells(['', '', '', '', '', '']);
                  setResendSeconds(0);
                }}
                className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
              >
                ← Change number
              </button>
            </form>
          )}

          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              {!adminLoginToken ? (
                <>
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
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Continue to OTP'}
                  </button>
                  <p className="text-center text-ev-subtle text-sm">
                    <Link href="/reset-password?role=admin" className="text-ev-primary hover:text-ev-primary-light">
                      Forgot password?
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <div className="text-center mb-2">
                    <p className="text-ev-muted text-sm">Password verified. Enter OTP sent to your phone.</p>
                  </div>
                  <div>
                    <label className="ev-label">Enter 6-digit OTP</label>
                    <input
                      type="text"
                      className="ev-input text-center text-xl tracking-[0.4em] font-mono"
                      placeholder="• • • • • •"
                      maxLength={6}
                      value={adminOtp}
                      onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : `Verify OTP & Sign in`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminLoginToken('');
                      setAdminOtp('');
                    }}
                    className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
                  >
                    ← Change credentials
                  </button>
                </>
              )}
              {mode === 'admin' && !adminLoginToken && (
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

        <p className="text-center text-ev-muted text-xs mt-6">
          Other sign-in:{' '}
          <Link href="/admin/login" className="text-ev-primary hover:underline">
            Shop admin (dedicated page)
          </Link>
          {' · '}
          <Link href="/electrician/login" className="text-ev-primary hover:underline">
            Electrician
          </Link>
        </p>
      </div>
    </div>
  );
}
