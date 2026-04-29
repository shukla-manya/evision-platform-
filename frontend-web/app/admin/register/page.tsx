'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Store,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  MapPinned,
  Hash,
  Loader2,
  CheckCircle,
  ImagePlus,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { suggestPincodeForIndianCity } from '@/lib/india-postal-lookup';
import { getBrowserGeolocation, reverseGeocodeIndia } from '@/lib/registration-geo';

export default function AdminRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    shop_name: '',
    owner_name: '',
    email: '',
    phone: '',
    gst_no: '',
    address: '',
    city: '',
    pincode: '',
  });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const shopPinSuggestSeq = useRef(0);
  useEffect(() => {
    const c = form.city.trim();
    if (c.length < 3) return;
    const timer = window.setTimeout(() => {
      const seq = ++shopPinSuggestSeq.current;
      void suggestPincodeForIndianCity(c).then((pin) => {
        if (seq !== shopPinSuggestSeq.current || !pin) return;
        setForm((f) => ({ ...f, pincode: pin }));
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [form.city]);

  async function fillShopAddressFromLocation() {
    setGeoLoading(true);
    try {
      const pos = await getBrowserGeolocation();
      if (!pos) {
        toast.error('Could not read your location. Allow location access or enter the address manually.');
        return;
      }
      const parsed = await reverseGeocodeIndia(pos.lat, pos.lng);
      if (!parsed) {
        toast.error('Could not resolve address from your location. Please type it manually.');
        return;
      }
      setForm((f) => ({
        ...f,
        address: parsed.address || f.address,
        city: parsed.city || f.city,
        pincode: parsed.pincode || f.pincode,
      }));
      if (parsed.pincode) {
        toast.success('Address filled from your location. Check and edit if needed.');
      } else {
        toast.success('Street and city filled. Add pincode if missing, or edit fields as needed.');
      }
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }
    setLoading(true);
    try {
      const raw = form.phone.trim();
      const phone = raw.startsWith('+')
        ? raw.replace(/\s/g, '')
        : `+91${raw.replace(/\D/g, '').replace(/^91/, '').slice(-10)}`;
      if (!/^\+[1-9]\d{9,14}$/.test(phone)) {
        toast.error('Enter a valid phone number (e.g. +91 98765 43210)');
        setLoading(false);
        return;
      }
      const fd = new FormData();
      fd.append('shop_name', form.shop_name.trim());
      fd.append('owner_name', form.owner_name.trim());
      fd.append('email', form.email.trim());
      fd.append('phone', phone);
      fd.append('gst_no', form.gst_no.trim());
      fd.append('address', form.address.trim());
      fd.append('city', form.city.trim());
      fd.append('pincode', form.pincode.trim());
      if (logoFile) fd.append('logo', logoFile);
      await adminApi.register(fd);
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
            <h2 className="text-2xl font-bold text-ev-text mb-3">Thank you</h2>
            <p className="text-ev-muted text-sm leading-relaxed mb-6">
              Your shop registration has been submitted. When a platform administrator approves your shop, you will get
              an email with a secure link to create your password. After that, sign in with your email and password.
            </p>
            <div className="bg-ev-surface2 border border-ev-border rounded-xl p-4 text-left text-sm space-y-2 mb-6">
              <p className="text-ev-muted">
                <span className="text-ev-text font-medium">Shop:</span> {form.shop_name}
              </p>
              <p className="text-ev-muted">
                <span className="text-ev-text font-medium">Email:</span> {form.email}
              </p>
              <p className="text-ev-muted">
                <span className="text-ev-text font-medium">Review:</span>{' '}
                <span className="text-ev-warning">Within 24 hours</span>
              </p>
            </div>
            <p className="text-ev-subtle text-xs mb-4">You cannot sign in until you receive the approval email.</p>
            <Link href="/" className="ev-btn-secondary inline-block text-sm">
              Back to home
            </Link>
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
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">E vision</span>
          </Link>
          <h1 className="text-3xl font-bold text-ev-text mb-2">Register your shop on E vision</h1>
          <p className="text-ev-muted text-sm max-w-lg mx-auto leading-relaxed">
            Fill in your shop details. Our team will review and approve your account within 24 hours.
          </p>
        </div>

        <div className="ev-card p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-ev-text font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Store size={14} className="text-ev-primary" /> Shop details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="ev-label">Shop name</label>
                  <div className="relative">
                    <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="Sharma Electric Store" value={form.shop_name} onChange={set('shop_name')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Owner full name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="Raj Sharma" value={form.owner_name} onChange={set('owner_name')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">GST number</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="07AABCU9603R1ZP" value={form.gst_no} onChange={set('gst_no')} required />
                  </div>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="ev-label mb-0">Shop address</label>
                    <button
                      type="button"
                      className="ev-btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 shrink-0"
                      disabled={geoLoading}
                      onClick={() => void fillShopAddressFromLocation()}
                    >
                      {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                      Use current location
                    </button>
                  </div>
                  <p className="text-ev-subtle text-xs -mt-1">
                    Use GPS to pre-fill street, city, and pincode when possible, or type everything manually.
                  </p>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-3.5 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="Plot / street / area" value={form.address} onChange={set('address')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">City</label>
                  <div className="relative">
                    <MapPinned size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="text" className="ev-input pl-10" placeholder="Faridabad" value={form.city} onChange={set('city')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Pincode</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input
                      type="text"
                      className="ev-input pl-10"
                      placeholder="121007"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pincode}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))
                      }
                      required
                    />
                  </div>
                  <p className="text-ev-subtle text-xs mt-1">Pincode fills from city when available (India Post data) — change if needed.</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="ev-label">Shop logo (upload)</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ev-border bg-ev-surface2 cursor-pointer hover:border-ev-primary/40 text-sm text-ev-text">
                      <ImagePlus size={18} className="text-ev-primary" />
                      <span>{logoFile ? logoFile.name : 'Choose image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {logoFile ? (
                      <button type="button" className="text-xs text-ev-muted hover:text-ev-text" onClick={() => setLogoFile(null)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <p className="text-ev-subtle text-xs mt-1">Optional. JPG / PNG / Webp, max 5 MB.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-ev-border" />

            <div>
              <h3 className="text-ev-text font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Mail size={14} className="text-ev-primary" /> Contact
              </h3>
              <p className="text-ev-subtle text-xs mb-4 -mt-2">
                No password here. After approval, you&apos;ll get an email to create your password, then you sign in with
                email + password.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ev-label">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="email" className="ev-input pl-10" placeholder="raj@sharmaelectric.com" value={form.email} onChange={set('email')} required />
                  </div>
                </div>
                <div>
                  <label className="ev-label">Phone number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input type="tel" className="ev-input pl-10" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} required />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2 py-3.5" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit for approval'}
            </button>
          </form>

          <p className="text-center text-ev-subtle text-sm mt-6">
            Manage the public catalogue?{' '}
            <Link href="/super/signin" className="text-ev-primary hover:text-ev-primary-light font-medium">
              Superadmin sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
