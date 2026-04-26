'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { OtpCells } from '@/components/auth/OtpCells';

const OTP_ATTEMPTS = 5;

function formatPhoneForApi(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

const ELEC_ROLES = new Set(['electrician', 'electrician_pending', 'electrician_rejected']);

function ElectricianLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'phone' | 'code'>('phone');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otpCells, setOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const [otpFocusKey, setOtpFocusKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(OTP_ATTEMPTS);
  const [noAccount, setNoAccount] = useState(false);

  useEffect(() => {
    if (searchParams.get('approved') === '1') {
      toast.success('You can sign in with your mobile number to continue.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== 'code' || resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [mode, resendSeconds]);

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const phone = formatPhoneForApi(phoneDigits);
    if (phone.length < 12) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setNoAccount(false);
    try {
      await authApi.sendOtp(phone);
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

  async function verifyAndSignIn(e: React.FormEvent) {
    e.preventDefault();
    const phone = formatPhoneForApi(phoneDigits);
    const otp = otpCells.join('');
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(phone, otp);
      if (!data.is_registered) {
        setNoAccount(true);
        setOtpCells(['', '', '', '', '', '']);
        setOtpFocusKey((k) => k + 1);
        return;
      }
      const payload = parseJwt(data.access_token);
      const role = String(payload?.role || '');
      if (!ELEC_ROLES.has(role)) {
        toast.error('This number is not linked to a technician account.');
        setOtpCells(['', '', '', '', '', '']);
        setOtpFocusKey((k) => k + 1);
        return;
      }
      saveToken(data.access_token, role);
      toast.success('Signed in');
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

  const phoneMasked =
    phoneDigits.replace(/\D/g, '').length === 10
      ? `+91 ${phoneDigits.replace(/\D/g, '').slice(0, 2)}******${phoneDigits.replace(/\D/g, '').slice(-2)}`
      : '+91 XXXXXXXXXX';

  const phoneLast10 = phoneDigits.replace(/\D/g, '').slice(-10);

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">{publicBrandName}</span>
          </Link>
          <h1 className="text-2xl font-bold text-ev-text">Welcome back</h1>
          <p className="text-ev-muted text-sm mt-1 leading-relaxed">Enter your registered mobile number to sign in</p>
        </div>
        <div className="ev-card p-8">
          {mode === 'phone' ? (
            <form onSubmit={sendOtp} className="space-y-5">
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
              <button
                type="submit"
                className="ev-btn-primary w-full flex items-center justify-center gap-2"
                disabled={loading || phoneLast10.length !== 10}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="text-center text-ev-subtle text-sm">
                New technician?{' '}
                <Link href="/register?role=electrician" className="text-ev-primary font-medium hover:underline">
                  Register
                </Link>
              </p>
            </form>
          ) : noAccount ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-ev-border bg-ev-surface2 p-4 text-center space-y-3">
                <p className="text-ev-text text-sm font-medium">No account found.</p>
                <p className="text-ev-muted text-sm">Would you like to register as a technician?</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Link href="/register?role=electrician" className="ev-btn-primary text-sm py-2.5 px-4 text-center">
                    Register as a technician
                  </Link>
                  <button
                    type="button"
                    className="ev-btn-secondary text-sm py-2.5 px-4"
                    onClick={() => {
                      setNoAccount(false);
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
            <form onSubmit={verifyAndSignIn} className="space-y-6">
              <p className="text-ev-muted text-sm text-center leading-relaxed">
                6-digit code sent to {phoneMasked}
              </p>
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
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    <span>Verify and sign in</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="text-center text-ev-subtle text-sm leading-relaxed">
                {resendSeconds > 0 ? (
                  <span>Resend OTP in {resendSeconds}s</span>
                ) : (
                  <button
                    type="button"
                    className="text-ev-primary font-medium disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void sendOtp()}
                  >
                    Resend OTP
                  </button>
                )}
              </p>
              <button
                type="button"
                className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
                onClick={() => {
                  setMode('phone');
                  setOtpCells(['', '', '', '', '', '']);
                  setResendSeconds(0);
                  setNoAccount(false);
                  setOtpAttemptsLeft(OTP_ATTEMPTS);
                }}
              >
                ← Change number
              </button>
            </form>
          )}
          <p className="text-center text-sm text-ev-muted mt-6">
            <Link href="/login" className="text-ev-primary hover:text-ev-primary-light">
              Customer / dealer sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ElectricianLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ev-bg flex items-center justify-center">
          <Loader2 className="animate-spin text-ev-primary" size={28} />
        </div>
      }
    >
      <ElectricianLoginInner />
    </Suspense>
  );
}
