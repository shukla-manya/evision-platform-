'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, Store, User, Mail, Phone, Building2, MapPin, Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';

export default function AdminRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    shop_name: '', owner_name: '', email: '', phone: '',
    password: '', confirm_password: '', gst_no: '', address: '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const phone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
      await adminApi.register({ ...form, phone, confirm_password: undefined });
      setDone(true);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center animate-slide-up">
          <div className="ev-card p-10">
            <div className="w-16 h-16 bg-ev-success/10 border-2 border-ev-success rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-ev-success" />
            </div>
            <h2 className="text-2xl font-bold text-ev-text mb-3">Application Submitted!</h2>
            <p className="text-ev-muted text-sm leading-relaxed mb-6">
              Your shop registration for <strong className="text-ev-text">{form.shop_name}</strong> has been received.
              Our superadmin will review your application within 24 hours and email you the decision.
            </p>
            <div className="bg-ev-surface2 border border-ev-border rounded-xl p-4 text-left text-sm space-y-2 mb-6">
              <p className="text-ev-muted"><span className="text-ev-text font-medium">Shop:</span> {form.shop_name}</p>
              <p className="text-ev-muted"><span className="text-ev-text font-medium">Email:</span> {form.email}</p>
              <p className="text-ev-muted"><span className="text-ev-text font-medium">Status:</span> <span className="text-ev-warning">Pending Approval</span></p>
            </div>
            <Link href="/" className="ev-btn-secondary inline-block">← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-bg py-12 px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-96 bg-ev-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-10 animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">E Vision</span>
          </Link>
          <h1 className="text-3xl font-bold text-ev-text mb-2">Register Your Shop</h1>
          <p className="text-ev-muted">Join as one of our 4 partner shops. Superadmin approval required.</p>
        </div>

        <div className="ev-card p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop Info */}
            <div>
              <h3 className="text-ev-text font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Store size={14} className="text-ev-primary" /> Shop Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="ev-label">Shop Name</label>
                  <div className="relative">
                    <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="Sharma Electric Store" value={form.shop_name} onChange={set('shop_name')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Owner Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="Raj Sharma" value={form.owner_name} onChange={set('owner_name')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">GST Number</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="07AABCU9603R1ZP" value={form.gst_no} onChange={set('gst_no')} required />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="ev-label">Shop Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-3.5 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="Sector 15, Faridabad, Haryana 121007" value={form.address} onChange={set('address')} required />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-ev-border" />

            {/* Contact + Auth */}
            <div>
              <h3 className="text-ev-text font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={14} className="text-ev-primary" /> Contact & Login
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ev-label">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="email" className="ev-input pl-10" placeholder="raj@sharmaelectric.com" value={form.email} onChange={set('email')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="tel" className="ev-input pl-10" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="password" className="ev-input pl-10" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="password" className="ev-input pl-10" placeholder="Repeat password" value={form.confirm_password} onChange={set('confirm_password')} required />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-ev-surface2 border border-ev-border rounded-xl p-4 text-sm text-ev-muted">
              <p className="font-medium text-ev-text mb-1">What happens next?</p>
              <p>
                Your registration will be reviewed by our superadmin. You will receive an email within 24 hours with
                the decision. Once approved, you can log in and start listing products.
              </p>
            </div>

            <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2 py-3.5" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Submit Registration</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-ev-subtle text-sm mt-6">
            Already approved?{' '}
            <Link href="/login" className="text-ev-primary hover:text-ev-primary-light">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
