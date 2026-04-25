'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, User, Mail, Phone, Building2, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [role, setRole] = useState<'customer' | 'dealer' | 'electrician'>('customer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', gst_no: '', address: '', otp: '' });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSendOtp() {
    const phone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
    if (!phone || phone.length < 11) {
      toast.error('Enter a valid mobile number first');
      return;
    }
    setOtpSending(true);
    try {
      await authApi.sendOtp(phone);
      toast.success('OTP sent to your phone');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setOtpSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (role === 'dealer' && !form.gst_no) {
      toast.error('GST number is required for dealer accounts');
      return;
    }
    setLoading(true);
    try {
      const phone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
      const { data } = await authApi.register({ ...form, phone, role, otp: form.otp });
      const payload = parseJwt(data.access_token);
      if (!payload || typeof payload.role !== 'string') {
        toast.error('Invalid session');
        return;
      }
      saveToken(data.access_token, payload.role);
      toast.success('Account created!');
      router.push(redirectByRole(payload.role));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">E Vision</span>
          </Link>
          <h1 className="text-2xl font-bold text-ev-text">Create your account</h1>
          <p className="text-ev-muted text-sm mt-1">Join thousands of customers & dealers</p>
        </div>

        {/* Role toggle */}
        <div className="ev-card p-1 flex gap-1 mb-6">
          {[
            { key: 'customer', label: 'Customer', desc: 'Personal orders' },
            { key: 'dealer', label: 'Dealer', desc: 'Bulk + GST' },
            { key: 'electrician', label: 'Electrician', desc: 'Service purchase' },
          ].map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => setRole(key as 'customer' | 'dealer' | 'electrician')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150 ${
                role === key ? 'bg-ev-primary text-white shadow-ev-glow' : 'text-ev-muted hover:text-ev-text'
              }`}
            >
              {label}
              <span className={`block text-xs font-normal mt-0.5 ${role === key ? 'text-blue-100' : 'text-ev-subtle'}`}>
                {desc}
              </span>
            </button>
          ))}
        </div>

        <div className="ev-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="ev-label">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                <input type="text" className="ev-input pl-10" placeholder="Rahul Kumar" value={form.name} onChange={set('name')} required />
              </div>
            </div>

            <div>
              <label className="ev-label">Mobile Number</label>
              <div className="relative mb-2">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                <input type="tel" className="ev-input pl-10" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} required />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                className="text-sm text-ev-primary hover:text-ev-primary-light"
                disabled={otpSending}
              >
                {otpSending ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>

            <div>
              <label className="ev-label">Enter OTP</label>
              <input
                type="text"
                className="ev-input text-center text-lg tracking-[0.35em] font-mono"
                placeholder="• • • • • •"
                maxLength={6}
                value={form.otp}
                onChange={e => setForm(f => ({ ...f, otp: e.target.value.replace(/\D/g, '') }))}
                required
              />
            </div>

            <div>
              <label className="ev-label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                <input type="email" className="ev-input pl-10" placeholder="rahul@example.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            {role === 'dealer' && (
              <div>
                <label className="ev-label">GST Number <span className="text-ev-error">*</span></label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                  <input type="text" className="ev-input pl-10" placeholder="07AABCU9603R1ZP" value={form.gst_no} onChange={set('gst_no')} required={role === 'dealer'} />
                </div>
                <p className="text-ev-subtle text-xs mt-1.5">Required for GST invoices and dealer pricing</p>
              </div>
            )}

            <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-ev-subtle text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-ev-primary hover:text-ev-primary-light">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
