'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole, getRole, isLoggedIn } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { OtpCells } from '@/components/auth/OtpCells';

const OTP_ATTEMPTS = 5;

function maskEmail(em: string): string {
  const s = em.trim().toLowerCase();
  const [u, d] = s.split('@');
  if (!d) return s;
  if (u.length <= 2) return `${u[0] ?? '*'}***@${d}`;
  return `${u.slice(0, 2)}***@${d}`;
}

type Mode = 'email' | 'code';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCells, setOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const [otpFocusKey, setOtpFocusKey] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(OTP_ATTEMPTS);
  const [noAccountForEmail, setNoAccountForEmail] = useState(false);
  const approvedToast = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoggedIn()) return;
    const r = getRole();
    if (!r) return;
    router.replace(redirectByRole(r));
  }, [router]);

  useEffect(() => {
    if (approvedToast.current) return;
    if (searchParams.get('approved') === '1') {
      approvedToast.current = true;
      toast.success('You can sign in with the email on your shop account to continue.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== 'code' || resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [mode, resendSeconds]);

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error('Enter a valid email address');
      return;
    }
    setLoading(true);
    setNoAccountForEmail(false);
    try {
      await authApi.sendOtp(em);
      setOtpCells(['', '', '', '', '', '']);
      setOtpFocusKey((k) => k + 1);
      setOtpAttemptsLeft(OTP_ATTEMPTS);
      setMode('code');
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
      const em = email.trim().toLowerCase();
      const { data } = await authApi.verifyOtp(em, otp);
      if (!data.is_registered) {
        setNoAccountForEmail(true);
        setOtpCells(['', '', '', '', '', '']);
        setOtpFocusKey((k) => k + 1);
        return;
      }
      const payload = parseJwt(data.access_token);
      if (!payload || typeof payload.role !== 'string') {
        toast.error('Invalid session');
        return;
      }
      const role = payload.role;
      saveToken(data.access_token, role);
      if (role === 'electrician_pending') {
        toast.success(
          "Your account is still under review. You'll be notified once approved.",
        );
      } else {
        toast.success('Signed in');
      }
      router.push(redirectByRole(role));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setOtpAttemptsLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            queueMicrotask(() => {
              toast.error('Too many incorrect codes. Request a new OTP.');
              setMode('email');
              setOtpCells(['', '', '', '', '', '']);
              setResendSeconds(0);
            });
            return OTP_ATTEMPTS;
          }
          queueMicrotask(() => {
            toast.error(`Incorrect code. ${next} attempt${next === 1 ? '' : 's'} remaining.`);
          });
          return next;
        });
      } else {
        toast.error(getApiErrorMessage(err, 'Could not sign in'));
      }
    } finally {
      setLoading(false);
    }
  }

  const sentToLine = email.trim() ? maskEmail(email) : null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-ev-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">{publicBrandName}</span>
          </Link>

          <p className="text-3xl leading-none mb-2" aria-hidden>
            👋
          </p>
          <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
          {mode === 'email' && (
            <p className="text-ev-muted text-sm mt-2 leading-relaxed max-w-sm mx-auto">
              Enter your email — we will send a one-time code to sign in
            </p>
          )}
        </div>

        <div className="ev-card p-8">
          {mode === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
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
              <button
                type="submit"
                className="ev-btn-primary w-full flex items-center justify-center gap-2"
                disabled={loading || !email.trim()}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (
                  <>
                    <span>Send OTP</span>
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
          )}

          {mode === 'code' &&
            (noAccountForEmail ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-ev-border bg-ev-surface2 p-4 text-center space-y-3">
                  <p className="text-ev-text text-sm font-medium">No account found for this email</p>
                  <p className="text-ev-muted text-sm">Create an account, then sign in with the same email.</p>
                  <div className="flex flex-col gap-2">
                    <Link href="/register" className="ev-btn-primary text-sm py-2.5 px-4 text-center">
                      Register
                    </Link>
                    <Link
                      href="/register?role=electrician"
                      className="ev-btn-secondary text-sm py-2.5 px-4 text-center"
                    >
                      Register as a technician
                    </Link>
                    <button
                      type="button"
                      className="text-ev-subtle text-sm hover:text-ev-muted"
                      onClick={() => {
                        setNoAccountForEmail(false);
                        setMode('email');
                        setOtpCells(['', '', '', '', '', '']);
                        setResendSeconds(0);
                      }}
                    >
                      Try a different email
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-semibold text-ev-text">Enter OTP</h2>
                  {sentToLine ? (
                    <p className="text-ev-muted text-sm">
                      Sent to <span className="font-mono text-ev-text">{sentToLine}</span>
                    </p>
                  ) : null}
                </div>
                <OtpCells
                  key={otpFocusKey}
                  autoFocusKey={otpFocusKey}
                  cells={otpCells}
                  onCellsChange={setOtpCells}
                  disabled={loading}
                />
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
                    <span>Resend OTP in {resendSeconds}s</span>
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
                <button
                  type="button"
                  onClick={() => {
                    setMode('email');
                    setOtpCells(['', '', '', '', '', '']);
                    setResendSeconds(0);
                    setNoAccountForEmail(false);
                    setOtpAttemptsLeft(OTP_ATTEMPTS);
                  }}
                  className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
                >
                  Use a different email
                </button>
              </form>
            ))}
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
