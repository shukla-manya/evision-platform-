'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Mail, MapPin, Navigation, Upload, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, registerElectricianFormData } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { geocodeIndia, getBrowserGeolocation, reverseGeocodeIndia } from '@/lib/registration-geo';
import { suggestPincodeForIndianCity } from '@/lib/india-postal-lookup';
import { OtpCells } from '@/components/auth/OtpCells';

const SKILL_OPTIONS = [
  'AC repair',
  'Wiring',
  'Inverter',
  'Switchboard',
  'Camera installation',
  'Other',
] as const;

type Step = 'details' | 'otp';

function formatPhoneE164(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

type TechnicianApplicationFormProps = {
  /** When true, only the form card is shown (used on `/register` with a shared page title). */
  embedded?: boolean;
};

export function TechnicianApplicationForm({ embedded = false }: TechnicianApplicationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [geoTechLoading, setGeoTechLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [otpKey, setOtpKey] = useState(0);
  const [otpCells, setOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState(0);

  const [techName, setTechName] = useState('');
  const [techExperience, setTechExperience] = useState('');
  const [techPhoneDigits, setTechPhoneDigits] = useState('');
  const [techCity, setTechCity] = useState('');
  const [techPin, setTechPin] = useState('');
  const techPinSuggestSeq = useRef(0);
  useEffect(() => {
    const c = techCity.trim();
    if (c.length < 3) return;
    const timer = window.setTimeout(() => {
      const seq = ++techPinSuggestSeq.current;
      void suggestPincodeForIndianCity(c).then((pin) => {
        if (seq !== techPinSuggestSeq.current || !pin) return;
        setTechPin(pin);
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [techCity]);

  async function fillTechAreaFromGeo() {
    setGeoTechLoading(true);
    try {
      const pos = await getBrowserGeolocation();
      if (!pos) {
        toast.error('Could not read your location. Allow access or enter city and pincode manually.');
        return;
      }
      const parsed = await reverseGeocodeIndia(pos.lat, pos.lng);
      if (!parsed) {
        toast.error('Could not resolve location. Enter city and pincode manually.');
        return;
      }
      if (parsed.city) setTechCity(parsed.city);
      if (parsed.pincode) setTechPin(parsed.pincode);
      toast.success(
        parsed.pincode
          ? 'City and pincode filled from your location. Review if needed.'
          : 'City filled. Add or confirm pincode if needed.',
      );
    } finally {
      setGeoTechLoading(false);
    }
  }

  const [techSkills, setTechSkills] = useState<Set<string>>(new Set());
  const [techEmail, setTechEmail] = useState('');
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const phoneLast10 = techPhoneDigits.replace(/\D/g, '').slice(-10);
  const phoneMasked =
    phoneLast10.length === 10
      ? `+91 ${phoneLast10.slice(0, 2)}******${phoneLast10.slice(-2)}`
      : '+91 XXXXXXXXXX';

  const validateDetails = useCallback((): boolean => {
    if (!techName.trim()) {
      toast.error('Enter your full name');
      return false;
    }
    if (phoneLast10.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return false;
    }
    if (!techEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(techEmail)) {
      toast.error('Enter a valid email address');
      return false;
    }
    if (!techCity.trim()) {
      toast.error('Enter your city');
      return false;
    }
    if (!/^\d{6}$/.test(techPin.trim())) {
      toast.error('Enter a valid 6-digit pincode');
      return false;
    }
    if (techSkills.size === 0) {
      toast.error('Select at least one skill');
      return false;
    }
    if (techExperience.trim() === '' || !/^\d{1,2}$/.test(techExperience.trim())) {
      toast.error('Enter years of experience (0–60)');
      return false;
    }
    const y = Number(techExperience.trim());
    if (y < 0 || y > 60) {
      toast.error('Years of experience must be between 0 and 60');
      return false;
    }
    if (!aadharFile || !photoFile) {
      toast.error('Upload your Aadhar document and your photo');
      return false;
    }
    return true;
  }, [
    techName,
    phoneLast10.length,
    techEmail,
    techCity,
    techPin,
    techSkills.size,
    techExperience,
    aadharFile,
    photoFile,
  ]);

  const sendTechOtp = useCallback(async () => {
    if (!validateDetails()) return;
    const phone = formatPhoneE164(techPhoneDigits);
    setOtpSending(true);
    try {
      await authApi.sendOtp(phone);
      setOtpCells(['', '', '', '', '', '']);
      setOtpKey((k) => k + 1);
      setStep('otp');
      setResendSeconds(30);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setOtpSending(false);
    }
  }, [techPhoneDigits, validateDetails]);

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [step, resendSeconds]);

  function toggleSkill(label: string) {
    setTechSkills((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function submitTechnician(e: React.FormEvent) {
    e.preventDefault();
    const otp = otpCells.join('');
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    if (!validateDetails()) return;

    setLoading(true);
    try {
      const phone = formatPhoneE164(techPhoneDigits);
      await authApi.verifyOtp(phone, otp);
      const gps = await getBrowserGeolocation();
      const { lat, lng } = gps ?? (await geocodeIndia(techCity, techPin));
      const skillsCsv = Array.from(techSkills).join(',');
      const exp = techExperience.trim();
      const addressLine = [exp ? `Experience: ${exp} yrs` : null, `${techCity.trim()}, ${techPin.trim()}, India`]
        .filter(Boolean)
        .join(' · ');

      const fd = new FormData();
      fd.append('name', techName.trim());
      fd.append('phone', phone);
      fd.append('email', techEmail.trim().toLowerCase());
      fd.append('address', addressLine);
      fd.append('lat', String(lat));
      fd.append('lng', String(lng));
      fd.append('skills', skillsCsv);
      fd.append('aadhar', aadharFile!);
      fd.append('photo', photoFile!);

      await registerElectricianFormData(fd);
      toast.success(
        "Application submitted! Our team will review your Aadhar and profile within 24 hours. You'll receive an email and app notification once approved.",
      );
      router.push('/login');
    } catch {
      toast.error('Incorrect code or submission failed. Check the OTP and try again, or request a new code.');
    } finally {
      setLoading(false);
    }
  }

  const inner = (
    <>
      <div className="ev-card p-8">
        {step === 'details' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendTechOtp();
            }}
            className="space-y-6"
          >
            <div>
              <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider mb-3">Personal</p>
              <div className="space-y-5">
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
                  <label className="ev-label">Mobile number (+91)</label>
                  <div className="flex rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden focus-within:ring-2 focus-within:ring-ev-primary/40 focus-within:border-ev-primary transition-all">
                    <span className="flex items-center px-4 text-ev-muted text-sm font-semibold border-r border-ev-border shrink-0">
                      +91
                    </span>
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
                  <p className="text-ev-subtle text-xs mt-1.5">Used for approval updates and notifications</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider mb-3">Location</p>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <p className="text-ev-muted text-sm m-0">Where you take jobs</p>
                <button
                  type="button"
                  className="ev-btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 shrink-0"
                  disabled={geoTechLoading}
                  onClick={() => void fillTechAreaFromGeo()}
                >
                  {geoTechLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  Use current location
                </button>
              </div>
              <p className="text-ev-subtle text-xs mb-3 -mt-1">
                GPS fills city and pincode when possible, or type them manually.
              </p>
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
                    className="ev-input font-mono text-sm"
                    placeholder="411001"
                    maxLength={6}
                    value={techPin}
                    onChange={(e) => setTechPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                  <p className="text-ev-subtle text-xs mt-1.5">Filled from city when available — change if needed.</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider mb-3">Professional</p>
              <div className="space-y-5">
                <div>
                  <label className="ev-label">Skills</label>
                  <p className="text-ev-subtle text-xs mb-2">Select all that apply</p>
                  <div className="flex flex-wrap gap-2">
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
                  <label className="ev-label">Years of experience</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="ev-input font-mono text-sm"
                    placeholder="5"
                    maxLength={2}
                    value={techExperience}
                    onChange={(e) => setTechExperience(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider mb-3">Documents</p>
              <div className="space-y-5">
                <div>
                  <span className="ev-label">Aadhar card photo</span>
                  <p className="text-ev-subtle text-xs mt-0.5 mb-2">JPG or PDF</p>
                  <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ev-border bg-ev-surface2 px-4 py-8 cursor-pointer hover:border-ev-primary/50 transition-colors relative">
                    <Upload size={22} className="text-ev-muted" />
                    <span className="text-sm text-ev-muted text-center px-2">
                      {aadharFile ? aadharFile.name : 'Tap to upload'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setAadharFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div>
                  <span className="ev-label">Your photo / selfie</span>
                  <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ev-border bg-ev-surface2 px-4 py-8 cursor-pointer hover:border-ev-primary/50 transition-colors relative">
                    <Upload size={22} className="text-ev-muted" />
                    <span className="text-sm text-ev-muted text-center px-2">
                      {photoFile ? photoFile.name : 'Tap to upload a clear photo'}
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
              </div>
            </div>

            <button
              type="submit"
              className="ev-btn-primary w-full flex items-center justify-center gap-2"
              disabled={otpSending || phoneLast10.length !== 10}
            >
              {otpSending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send OTP to verify mobile
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={submitTechnician} className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-ev-muted text-sm leading-relaxed">
                6-digit code sent to {phoneMasked}. Verify and submit your application.
              </p>
            </div>
            <OtpCells
              key={otpKey}
              autoFocusKey={otpKey}
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
                  <span>Verify and submit application</span>
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
                  disabled={loading || otpSending}
                  onClick={() => void sendTechOtp()}
                >
                  Resend OTP
                </button>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('details');
                setOtpCells(['', '', '', '', '', '']);
                setResendSeconds(0);
              }}
              className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
            >
              ← Edit application
            </button>
          </form>
        )}

        <p className="text-center text-ev-subtle text-sm mt-6">
          Already approved?{' '}
          <Link href="/login" className="text-ev-primary hover:text-ev-primary-light font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );

  if (embedded) {
    return <div className="w-full max-w-lg mx-auto animate-slide-up">{inner}</div>;
  }

  return (
    <div className="w-full max-w-lg mx-auto animate-slide-up">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-ev-text">Join our technician network</h1>
        <p className="text-ev-muted text-sm mt-1 max-w-md mx-auto leading-relaxed">
          Get job requests from verified customers near you. Our team reviews and approves your account within 24 hours.
        </p>
      </div>
      {inner}
    </div>
  );
}
