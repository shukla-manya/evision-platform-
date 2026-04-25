'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, User, Mail, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt } from '@/lib/auth';
import { TechnicianApplicationForm } from '@/components/register/TechnicianApplicationForm';
import { publicBrandName } from '@/lib/public-brand';

type Segment = 'shopper' | 'technician';
type ShopperRole = 'customer' | 'dealer';

function formatPhoneE164(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleQuery = searchParams.get('role');
  const [segment, setSegment] = useState<Segment>(() => (roleQuery === 'electrician' ? 'technician' : 'shopper'));
  const [shopperRole, setShopperRole] = useState<ShopperRole>(() =>
    roleQuery === 'dealer' ? 'dealer' : 'customer',
  );
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [shopperOtpSent, setShopperOtpSent] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const sendShopperOtp = useCallback(async () => {
    const phone = formatPhoneE164(phoneDigits);
    if (phone.length < 12) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setOtpSending(true);
    try {
      await authApi.sendOtp(phone);
      toast.success('OTP sent to your phone');
      setShopperOtpSent(true);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setOtpSending(false);
    }
  }, [phoneDigits]);

  async function submitShopper(e: React.FormEvent) {
    e.preventDefault();
    if (shopperRole === 'dealer' && !gstNo.trim()) {
      toast.error('GST number is required for dealer accounts');
      return;
    }
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (name.length < 2) {
      toast.error('Please enter your first and last name');
      return;
    }
    if (!/^\d{6}$/.test(pincode.replace(/\D/g, ''))) {
      toast.error('Enter a valid 6-digit pincode');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const phone = formatPhoneE164(phoneDigits);
      const fullAddress = [address.trim(), `Pincode: ${pincode.replace(/\D/g, '').slice(0, 6)}`].filter(Boolean).join('\n');
      const { data } = await authApi.register({
        name,
        phone,
        email: email.trim(),
        role: shopperRole,
        otp,
        gst_no: shopperRole === 'dealer' ? gstNo.trim() : undefined,
        address: fullAddress || undefined,
        password,
      });
      const payload = parseJwt(data.access_token);
      if (!payload || typeof payload.role !== 'string') {
        toast.error('Invalid session');
        return;
      }
      saveToken(data.access_token, payload.role);
      toast.success('Your account is ready. Start shopping!');
      router.push('/');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  const phoneMasked =
    phoneDigits.replace(/\D/g, '').length === 10
      ? `+91 ${phoneDigits.replace(/\D/g, '').slice(0, 2)}******${phoneDigits.replace(/\D/g, '').slice(-2)}`
      : '+91 XXXXXXXXXX';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">{publicBrandName}</span>
          </Link>
        </div>

        <div className="ev-card p-1 flex gap-1 mb-6">
          <button
            type="button"
            onClick={() => setSegment('shopper')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
              segment === 'shopper' ? 'bg-ev-primary text-white shadow-ev-glow' : 'text-ev-muted hover:text-ev-text'
            }`}
          >
            Customer / Dealer
          </button>
          <button
            type="button"
            onClick={() => setSegment('technician')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
              segment === 'technician' ? 'bg-ev-primary text-white shadow-ev-glow' : 'text-ev-muted hover:text-ev-text'
            }`}
          >
            Technician
          </button>
        </div>

        {segment === 'shopper' ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-ev-text">Create your account</h1>
              <p className="text-ev-muted text-sm mt-1">
                Join {publicBrandName} — shop cameras, lenses and accessories from top stores
              </p>
            </div>

            <div className="ev-card p-1 flex gap-1 mb-6">
              {(['customer', 'dealer'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setShopperRole(key)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium capitalize transition-all ${
                    shopperRole === key ? 'bg-ev-indigo text-white' : 'text-ev-muted hover:text-ev-text'
                  }`}
                >
                  {key === 'customer' ? 'Customer' : 'Dealer'}
                </button>
              ))}
            </div>

            <div className="ev-card p-8">
              <form onSubmit={submitShopper} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ev-label">First name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                      <input
                        type="text"
                        className="ev-input pl-10"
                        placeholder="Priya"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="ev-label">Last name</label>
                    <input
                      type="text"
                      className="ev-input"
                      placeholder="Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="ev-label">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input
                      type="email"
                      className="ev-input pl-10"
                      placeholder="priya@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="ev-label">Mobile number</label>
                  <div className="flex rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden focus-within:ring-2 focus-within:ring-ev-primary/40 focus-within:border-ev-primary transition-all">
                    <span className="flex items-center px-4 text-ev-muted text-sm font-semibold border-r border-ev-border shrink-0">+91</span>
                    <input
                      type="tel"
                      className="flex-1 min-w-0 bg-transparent px-4 py-3 text-ev-text placeholder-ev-subtle text-base outline-none"
                      placeholder="9876543210"
                      maxLength={10}
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="ev-label">Password</label>
                  <input
                    type="password"
                    className="ev-input"
                    placeholder="At least 8 characters"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="ev-label">Delivery address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-3 text-ev-subtle" />
                    <textarea
                      className="ev-input pl-10 min-h-[88px] resize-y"
                      placeholder="Flat 4B, MG Road, Pune"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="ev-label">Pincode</label>
                  <input
                    type="text"
                    className="ev-input font-mono text-sm"
                    placeholder="411001"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>

                {shopperRole === 'dealer' && (
                  <div>
                    <label className="ev-label">GST number</label>
                    <input
                      type="text"
                      className="ev-input font-mono text-sm"
                      placeholder="07AABCU9603R1ZP"
                      value={gstNo}
                      onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                      required
                    />
                    <p className="text-ev-subtle text-xs mt-1.5">Required for GST invoices and dealer pricing</p>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => void sendShopperOtp()}
                    className="ev-btn-secondary w-full flex items-center justify-center gap-2 mb-3"
                    disabled={otpSending}
                  >
                    {otpSending ? 'Sending…' : 'Send OTP to verify mobile'}
                    <ArrowRight size={16} />
                  </button>
                  {shopperOtpSent ? (
                    <p className="text-ev-muted text-sm mb-3 leading-relaxed">
                      We sent a 6-digit code to {phoneMasked}. Enter it below to verify your number.
                    </p>
                  ) : null}
                  <label className="ev-label">OTP</label>
                  <input
                    type="text"
                    className="ev-input text-center text-lg tracking-[0.35em] font-mono"
                    placeholder="• • • • • •"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      <span>Create account</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-ev-subtle text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-ev-primary hover:text-ev-primary-light font-medium">
                  Sign in
                </Link>
                <br />
                <span className="text-ev-muted">
                  Are you a dealer?{' '}
                  <Link href="/register?role=dealer" className="text-ev-primary font-medium hover:underline">
                    Register here
                  </Link>
                </span>
              </p>
            </div>
          </>
        ) : (
          <TechnicianApplicationForm />
        )}
      </div>
    </div>
  );
}
