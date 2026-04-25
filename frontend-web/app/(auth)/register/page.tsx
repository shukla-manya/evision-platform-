'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, User, Mail, MapPin, ArrowRight, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, registerElectricianFormData } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole } from '@/lib/auth';

type Segment = 'shopper' | 'technician';
type ShopperRole = 'customer' | 'dealer';

const SKILL_OPTIONS = ['AC repair', 'Wiring', 'Inverter', 'Switchboard'] as const;

function formatPhoneE164(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

async function geocodeIndia(city: string, pincode: string): Promise<{ lat: number; lng: number }> {
  const q = `${pincode.trim()} ${city.trim()} India`;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers: { Accept: 'application/json', 'Accept-Language': 'en' } },
  );
  if (!res.ok) throw new Error('Location lookup failed');
  const data = (await res.json()) as { lat?: string; lon?: string }[];
  const hit = data?.[0];
  if (!hit?.lat || !hit?.lon) throw new Error('Could not find that city and pincode on the map');
  return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
}

export default function RegisterPage() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('shopper');
  const [shopperRole, setShopperRole] = useState<ShopperRole>('customer');
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [otp, setOtp] = useState('');

  const [techName, setTechName] = useState('');
  const [techExperience, setTechExperience] = useState('');
  const [techPhoneDigits, setTechPhoneDigits] = useState('');
  const [techCity, setTechCity] = useState('');
  const [techPin, setTechPin] = useState('');
  const [techSkills, setTechSkills] = useState<Set<string>>(new Set());
  const [techEmail, setTechEmail] = useState('');
  const [techPassword, setTechPassword] = useState('');
  const [techOtp, setTechOtp] = useState('');
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('role');
    if (q === 'electrician') setSegment('technician');
    if (q === 'dealer') {
      setSegment('shopper');
      setShopperRole('dealer');
    }
    if (q === 'customer') {
      setSegment('shopper');
      setShopperRole('customer');
    }
  }, []);

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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setOtpSending(false);
    }
  }, [phoneDigits]);

  const sendTechOtp = useCallback(async () => {
    const phone = formatPhoneE164(techPhoneDigits);
    if (phone.length < 12) {
      toast.error('Enter a valid 10-digit mobile number');
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
  }, [techPhoneDigits]);

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
    setLoading(true);
    try {
      const phone = formatPhoneE164(phoneDigits);
      const { data } = await authApi.register({
        name,
        phone,
        email: email.trim(),
        role: shopperRole,
        otp,
        gst_no: shopperRole === 'dealer' ? gstNo.trim() : undefined,
        address: address.trim() || undefined,
      });
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

  async function submitTechnician(e: React.FormEvent) {
    e.preventDefault();
    if (!techName.trim()) {
      toast.error('Enter your full name');
      return;
    }
    if (!techEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(techEmail)) {
      toast.error('Enter a valid email');
      return;
    }
    if (techPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/^\d{6}$/.test(techPin.trim())) {
      toast.error('Enter a valid 6-digit pincode');
      return;
    }
    if (techSkills.size === 0) {
      toast.error('Select at least one skill');
      return;
    }
    if (!aadharFile || !photoFile) {
      toast.error('Upload Aadhar and your photo');
      return;
    }
    if (techOtp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const phone = formatPhoneE164(techPhoneDigits);
      await authApi.verifyOtp(phone, techOtp);
      const { lat, lng } = await geocodeIndia(techCity, techPin);
      const skillsCsv = Array.from(techSkills).join(',');
      const exp = techExperience.trim();
      const addressLine = [exp ? `Experience: ${exp} yrs` : null, `${techCity.trim()}, ${techPin.trim()}, India`]
        .filter(Boolean)
        .join(' · ');

      const fd = new FormData();
      fd.append('name', techName.trim());
      fd.append('phone', phone);
      fd.append('email', techEmail.trim().toLowerCase());
      fd.append('password', techPassword);
      fd.append('address', addressLine);
      fd.append('lat', String(lat));
      fd.append('lng', String(lng));
      fd.append('skills', skillsCsv);
      fd.append('aadhar', aadharFile);
      fd.append('photo', photoFile);

      await registerElectricianFormData(fd);
      toast.success('Application submitted. You can sign in after approval.');
      router.push('/electrician/login');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  function toggleSkill(label: string) {
    setTechSkills((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">LensCart</span>
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
              <p className="text-ev-primary text-xs font-semibold uppercase tracking-widest mb-1">Customer / Dealer registration</p>
              <h1 className="text-2xl font-bold text-ev-text">Create your account</h1>
              <p className="text-ev-muted text-sm mt-1">Join LensCart — buy cameras, lenses and gear</p>
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
                    className="text-sm font-semibold text-ev-primary hover:text-ev-primary-light inline-flex items-center gap-1 disabled:opacity-50 mb-4"
                    disabled={otpSending}
                  >
                    {otpSending ? 'Sending…' : 'Send OTP to verify phone'}
                    <ArrowRight size={16} />
                  </button>
                  <label className="ev-label">Enter OTP (sent to your phone)</label>
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
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <p className="text-ev-primary text-xs font-semibold uppercase tracking-widest mb-1">Electrician registration</p>
              <h1 className="text-2xl font-bold text-ev-text">Join as a technician</h1>
              <p className="text-ev-muted text-sm mt-1">Serve customers near you — get approved in 24 hrs</p>
            </div>

            <div className="ev-card p-8">
              <form onSubmit={submitTechnician} className="space-y-5">
                <div>
                  <label className="ev-label">Full name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input
                      type="text"
                      className="ev-input pl-10"
                      placeholder="Ramesh Kumar"
                      value={techName}
                      onChange={(e) => setTechName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="ev-label">Experience (yrs)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    className="ev-input"
                    placeholder="5"
                    value={techExperience}
                    onChange={(e) => setTechExperience(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  />
                </div>

                <div>
                  <label className="ev-label">Mobile number</label>
                  <div className="flex rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden focus-within:ring-2 focus-within:ring-ev-primary/40 focus-within:border-ev-primary transition-all">
                    <span className="flex items-center px-4 text-ev-muted text-sm font-semibold border-r border-ev-border shrink-0">+91</span>
                    <input
                      type="tel"
                      className="flex-1 min-w-0 bg-transparent px-4 py-3 text-ev-text placeholder-ev-subtle text-base outline-none"
                      placeholder="9823456789"
                      maxLength={10}
                      value={techPhoneDigits}
                      onChange={(e) => setTechPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ev-label">City</label>
                    <input
                      type="text"
                      className="ev-input"
                      placeholder="Pune"
                      value={techCity}
                      onChange={(e) => setTechCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="ev-label">Pincode</label>
                    <input
                      type="text"
                      className="ev-input"
                      placeholder="411001"
                      maxLength={6}
                      value={techPin}
                      onChange={(e) => setTechPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="ev-label">Skills (select all that apply)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SKILL_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          techSkills.has(s)
                            ? 'bg-ev-primary text-white border-ev-primary'
                            : 'bg-ev-surface2 text-ev-text border-ev-border hover:border-ev-primary/40'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="ev-label">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                    <input
                      type="email"
                      className="ev-input pl-10"
                      placeholder="ramesh@example.com"
                      value={techEmail}
                      onChange={(e) => setTechEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-ev-subtle text-xs mt-1.5">Used to sign in after approval</p>
                </div>

                <div>
                  <label className="ev-label">Create password</label>
                  <input
                    type="password"
                    className="ev-input"
                    placeholder="At least 8 characters"
                    minLength={8}
                    value={techPassword}
                    onChange={(e) => setTechPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <span className="ev-label">Upload Aadhar card (photo)</span>
                  <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ev-border bg-ev-surface2 px-4 py-8 cursor-pointer hover:border-ev-primary/50 transition-colors relative">
                    <Upload size={22} className="text-ev-muted" />
                    <span className="text-sm text-ev-muted text-center px-2">
                      {aadharFile ? aadharFile.name : 'Tap to upload · JPG or PDF'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setAadharFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div>
                  <span className="ev-label">Upload your photo (selfie)</span>
                  <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ev-border bg-ev-surface2 px-4 py-8 cursor-pointer hover:border-ev-primary/50 transition-colors relative">
                    <Upload size={22} className="text-ev-muted" />
                    <span className="text-sm text-ev-muted text-center px-2">
                      {photoFile ? photoFile.name : 'Tap to take photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => void sendTechOtp()}
                    className="text-sm font-semibold text-ev-primary hover:text-ev-primary-light inline-flex items-center gap-1 disabled:opacity-50 mb-4"
                    disabled={otpSending}
                  >
                    {otpSending ? 'Sending…' : 'Send OTP to verify phone'}
                    <ArrowRight size={16} />
                  </button>
                  <label className="ev-label">Enter OTP (sent to your phone)</label>
                  <input
                    type="text"
                    className="ev-input text-center text-lg tracking-[0.35em] font-mono"
                    placeholder="• • • • • •"
                    maxLength={6}
                    value={techOtp}
                    onChange={(e) => setTechOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <p className="text-ev-muted text-sm leading-relaxed">
                  Your profile will be reviewed by our team within 24 hours of registration.
                </p>

                <button type="submit" className="ev-btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      <span>Submit application</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-ev-subtle text-sm mt-6">
                Already have an account?{' '}
                <Link href="/electrician/login" className="text-ev-primary hover:text-ev-primary-light font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
