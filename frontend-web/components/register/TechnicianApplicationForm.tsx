'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Mail, MapPin, Navigation, Upload, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { PasswordInputWithToggle } from '@/components/auth/PasswordInputWithToggle';
import { registerElectricianFormData } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  getBrowserGeolocation,
  isBrowserGeolocationContextBlocked,
  resolveRegistrationCoordinates,
  reverseGeocodeIndia,
} from '@/lib/registration-geo';
import { suggestPincodeForIndianCity } from '@/lib/india-postal-lookup';

const SKILL_OPTIONS = [
  'AC repair',
  'Wiring',
  'Inverter',
  'Switchboard',
  'Camera installation',
  'Other',
] as const;

function formatPhoneE164(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

type TechnicianApplicationFormProps = {
  embedded?: boolean;
};

export function TechnicianApplicationForm({ embedded = false }: TechnicianApplicationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [geoTechLoading, setGeoTechLoading] = useState(false);

  const [techName, setTechName] = useState('');
  const [techExperience, setTechExperience] = useState('');
  const [techPhoneDigits, setTechPhoneDigits] = useState('');
  const [techCity, setTechCity] = useState('');
  const [techPin, setTechPin] = useState('');
  const [techEmail, setTechEmail] = useState('');
  const [techPassword, setTechPassword] = useState('');
  const [techSkills, setTechSkills] = useState<Set<string>>(new Set());
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const cachedGpsRef = useRef<{ lat: number; lng: number } | null>(null);
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
      if (isBrowserGeolocationContextBlocked()) {
        toast.error('This page must be served over HTTPS for location to work. Enter city and pincode manually.');
        return;
      }
      const pos = await getBrowserGeolocation();
      if (!pos) { toast.error('Could not read your location. Allow location access or enter manually.'); return; }
      cachedGpsRef.current = pos;
      const parsed = await reverseGeocodeIndia(pos.lat, pos.lng);
      if (!parsed) { toast.error('Could not resolve location. Enter city and pincode manually.'); return; }
      if (parsed.city) setTechCity(parsed.city);
      if (parsed.pincode) setTechPin(parsed.pincode);
      toast.success(parsed.pincode ? 'City and pincode filled. Review if needed.' : 'City filled. Add pincode if needed.');
    } finally {
      setGeoTechLoading(false);
    }
  }

  const phoneLast10 = techPhoneDigits.replace(/\D/g, '').slice(-10);

  const validate = useCallback((): boolean => {
    if (!techName.trim()) { toast.error('Enter your full name'); return false; }
    if (phoneLast10.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return false; }
    const em = techEmail.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast.error('Enter a valid email address'); return false; }
    if (!techCity.trim()) { toast.error('Enter your city'); return false; }
    if (!/^\d{6}$/.test(techPin.trim())) { toast.error('Enter a valid 6-digit pincode'); return false; }
    if (techSkills.size === 0) { toast.error('Select at least one skill'); return false; }
    if (!techExperience.trim() || !/^\d{1,2}$/.test(techExperience.trim())) { toast.error('Enter years of experience (0–60)'); return false; }
    const y = Number(techExperience.trim());
    if (y < 0 || y > 60) { toast.error('Years of experience must be between 0 and 60'); return false; }
    if (techPassword.length < 8) { toast.error('Password must be at least 8 characters'); return false; }
    return true;
  }, [techName, phoneLast10, techEmail, techCity, techPin, techSkills, techExperience, techPassword]);

  const canSubmit =
    techName.trim() !== '' &&
    phoneLast10.length === 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(techEmail.trim()) &&
    techCity.trim() !== '' &&
    /^\d{6}$/.test(techPin.trim()) &&
    techSkills.size > 0 &&
    /^\d{1,2}$/.test(techExperience.trim()) &&
    techPassword.length >= 8;

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
    if (!validate()) return;
    setLoading(true);
    try {
      const phone = formatPhoneE164(techPhoneDigits);
      const coords = cachedGpsRef.current ?? await resolveRegistrationCoordinates(techCity.trim(), techPin.trim());
      const skillsCsv = Array.from(techSkills).join(',');
      const exp = techExperience.trim();
      const addressLine = [exp ? `Experience: ${exp} yrs` : null, `${techCity.trim()}, ${techPin.trim()}, India`].filter(Boolean).join(' · ');

      const fd = new FormData();
      fd.append('name', techName.trim());
      fd.append('phone', phone);
      fd.append('email', techEmail.trim().toLowerCase());
      fd.append('password', techPassword);
      fd.append('address', addressLine);
      if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        fd.append('lat', String(coords.lat));
        fd.append('lng', String(coords.lng));
      }
      fd.append('skills', skillsCsv);
      if (aadharFile) fd.append('aadhar', aadharFile);
      if (photoFile) fd.append('photo', photoFile);

      await registerElectricianFormData(fd);
      toast.success("Application submitted! Our team will review your application within 24 hours. You'll be notified once approved.");
      router.push('/login');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(getApiErrorMessage(err, 'This email or phone is already registered. Sign in or use different details.'));
      } else if (status === 400) {
        toast.error(getApiErrorMessage(err, 'Check your details and documents, then try again.'));
      } else {
        toast.error(getApiErrorMessage(err, 'Submission failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  }

  const inner = (
    <>
      <div className="ev-card p-4 sm:p-6 lg:p-8">
        <form
          onSubmit={submitTechnician}
          className="space-y-6 [&_input.ev-input]:text-base [&_input.ev-input]:sm:text-sm [&_textarea.ev-input]:text-base [&_textarea.ev-input]:sm:text-sm"
        >
          <div>
            <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider mb-3">Personal</p>
            <div className="space-y-5">
              <div>
                <label className="ev-label">Full name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                  <input type="text" className="ev-input pl-10" placeholder="Ramesh Kumar" value={techName} onChange={(e) => setTechName(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="ev-label">Mobile number (+91)</label>
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

              <div>
                <label className="ev-label">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" />
                  <input type="email" className="ev-input pl-10" placeholder="ramesh@example.com" value={techEmail} onChange={(e) => setTechEmail(e.target.value)} required />
                </div>
                <p className="text-ev-subtle text-xs mt-1.5">Used for approval updates and to sign in</p>
              </div>

              <div>
                <label className="ev-label">Password</label>
                <PasswordInputWithToggle
                  withLeadingLock={false}
                  value={techPassword}
                  onChange={(e) => setTechPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                />
                <p className="text-ev-subtle text-xs mt-1.5">You'll use this to sign in once approved</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider mb-3">Location</p>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-ev-muted text-sm m-0">Where you take jobs</p>
              <button type="button" className="ev-btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 shrink-0" disabled={geoTechLoading} onClick={() => void fillTechAreaFromGeo()}>
                {geoTechLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                Use current location
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="ev-label">City</label>
                <input type="text" className="ev-input" placeholder="Pune" value={techCity} onChange={(e) => setTechCity(e.target.value)} required />
              </div>
              <div>
                <label className="ev-label">Pincode</label>
                <input type="text" className="ev-input font-mono text-sm" placeholder="411001" maxLength={6} value={techPin} onChange={(e) => setTechPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
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
                <input type="text" inputMode="numeric" className="ev-input font-mono text-sm" placeholder="5" maxLength={2} value={techExperience} onChange={(e) => setTechExperience(e.target.value.replace(/\D/g, '').slice(0, 2))} required />
              </div>
            </div>
          </div>

          <div>
            <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider mb-3">Documents (optional)</p>
            <div className="space-y-5">
              <div>
                <span className="ev-label">Aadhar card photo (optional)</span>
                <p className="text-ev-subtle text-xs mt-0.5 mb-2">JPG or PDF</p>
                <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ev-border bg-ev-surface2 px-4 py-8 cursor-pointer hover:border-ev-primary/50 transition-colors relative">
                  <Upload size={22} className="text-ev-muted" />
                  <span className="text-sm text-ev-muted text-center px-2">{aadharFile ? aadharFile.name : 'Tap to upload'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setAadharFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <span className="ev-label">Your photo / selfie (optional)</span>
                <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ev-border bg-ev-surface2 px-4 py-8 cursor-pointer hover:border-ev-primary/50 transition-colors relative">
                  <Upload size={22} className="text-ev-muted" />
                  <span className="text-sm text-ev-muted text-center px-2">{photoFile ? photoFile.name : 'Tap to upload a clear photo'}</span>
                  <input type="file" accept="image/*" capture="user" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="ev-btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 text-base"
            disabled={loading || !canSubmit}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (<><span>Submit application</span><ArrowRight size={16} /></>)}
          </button>
        </form>

        <p className="text-center text-ev-subtle text-sm mt-6">
          Already approved?{' '}
          <Link href="/login" className="text-ev-primary hover:text-ev-primary-light font-medium">Sign in</Link>
        </p>
      </div>
    </>
  );

  if (embedded) {
    return <div className="mx-auto w-full min-w-0 max-w-xl animate-slide-up">{inner}</div>;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl animate-slide-up">
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
