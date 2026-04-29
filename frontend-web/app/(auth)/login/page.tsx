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

function formatPhoneForApi(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

/** Display line e.g. +91 98765 43210 (after OTP send — user already shared this number). */
function formatPhoneForDisplayE16410(d10: string) {
  const d = d10.replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return null;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

type Mode = 'phone' | 'code';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('phone');
  const [loading, setLoading] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otpCells, setOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const [otpFocusKey, setOtpFocusKey] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(OTP_ATTEMPTS);
  const [noAccountForPhone, setNoAccountForPhone] = useState(false);
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
      toast.success('You can sign in with your mobile number to continue.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== 'code' || resendSeconds <= 0) return;
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
              setMode('phone');
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

  const d10 = phoneDigits.replace(/\D/g, '').slice(-10);
  const sentToLine = d10.length === 10 ? formatPhoneForDisplayE16410(d10) : null;

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
          {mode === 'phone' && (
            <p className="text-ev-muted text-sm mt-2 leading-relaxed max-w-sm mx-auto">
              Enter your mobile number to sign in
            </p>
          )}
        </div>

        <div className="ev-card p-8">
          {mode === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="ev-label">Mobile number</label>
                <div className="flex rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden focus-within:ring-2 focus-within:ring-ev-primary/40 focus-within:border-ev-primary transition-all">
                  <span className="flex items-center px-4 text-ev-muted text-sm font-semibold border-r border-ev-border shrink-0 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    className="flex-1 min-w-0 bg-transparent px-4 py-3 text-ev-text placeholder-ev-subtle text-base outline-none tracking-wide"
                    placeholder="9876543210"
                    maxLength={10}
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    autoComplete="tel-national"
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="ev-btn-primary w-full flex items-center justify-center gap-2"
                disabled={loading || phoneDigits.replace(/\D/g, '').length !== 10}
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
            (noAccountForPhone ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-ev-border bg-ev-surface2 p-4 text-center space-y-3">
                  <p className="text-ev-text text-sm font-medium">No account found. Register first?</p>
                  <p className="text-ev-muted text-sm">Register, then sign in with the same number.</p>
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
                        setNoAccountForPhone(false);
                        setMode('phone');
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
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-semibold text-ev-text">Enter OTP</h2>
                  {sentToLine ? (
                    <p className="text-ev-muted text-sm">
                      Sent to <span className="font-mono text-ev-text tabular-nums">{sentToLine}</span>
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
                    setMode('phone');
                    setOtpCells(['', '', '', '', '', '']);
                    setResendSeconds(0);
                    setNoAccountForPhone(false);
                    setOtpAttemptsLeft(OTP_ATTEMPTS);
                  }}
                  className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
                >
                  Use a different number
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
