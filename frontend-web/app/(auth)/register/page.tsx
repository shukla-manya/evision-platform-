'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Camera, User, Mail, MapPin, ArrowRight, Loader2, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt } from '@/lib/auth';
import { TechnicianApplicationForm } from '@/components/register/TechnicianApplicationForm';
import { publicBrandName } from '@/lib/public-brand';
import { OtpCells } from '@/components/auth/OtpCells';
import { getBrowserGeolocation, resolveRegistrationCoordinates, reverseGeocodeIndia } from '@/lib/registration-geo';
import { suggestPincodeForIndianCity } from '@/lib/india-postal-lookup';
import { REGISTER_SELF_SERVE_TABS } from '@/lib/user-roles';

type AccountTab = 'customer' | 'dealer' | 'technician';
type RegisterStep = 'details' | 'otp';

const OTP_ATTEMPTS = 5;

function formatPhoneE164(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return `+91${d}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleQuery = searchParams.get('role');
  const [accountTab, setAccountTab] = useState<AccountTab>(() => {
    if (roleQuery === 'dealer') return 'dealer';
    if (roleQuery === 'electrician' || roleQuery === 'technician') return 'technician';
    return 'customer';
  });
  const [loading, setLoading] = useState(false);
  const [geoAddrLoading, setGeoAddrLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('details');
  const [registerOtpKey, setRegisterOtpKey] = useState(0);
  const [registerOtpCells, setRegisterOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(OTP_ATTEMPTS);
  const [resendSeconds, setResendSeconds] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessPincode, setBusinessPincode] = useState('');

  const customerPinSuggestSeq = useRef(0);
  useEffect(() => {
    if (accountTab !== 'customer') return;
    const c = city.trim();
    if (c.length < 3) return;
    const timer = window.setTimeout(() => {
      const seq = ++customerPinSuggestSeq.current;
      void suggestPincodeForIndianCity(c).then((pin) => {
        if (seq !== customerPinSuggestSeq.current || !pin) return;
        setPincode(pin);
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [city, accountTab]);

  const dealerPinSuggestSeq = useRef(0);
  useEffect(() => {
    if (accountTab !== 'dealer') return;
    const c = businessCity.trim();
    if (c.length < 3) return;
    const timer = window.setTimeout(() => {
      const seq = ++dealerPinSuggestSeq.current;
      void suggestPincodeForIndianCity(c).then((pin) => {
        if (seq !== dealerPinSuggestSeq.current || !pin) return;
        setBusinessPincode(pin);
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [businessCity, accountTab]);

  async function fillAddressFromGeo(kind: 'customer' | 'dealer') {
    setGeoAddrLoading(true);
    try {
      const pos = await getBrowserGeolocation();
      if (!pos) {
        toast.error('Could not read your location. Allow access or type your address manually.');
        return;
      }
      const parsed = await reverseGeocodeIndia(pos.lat, pos.lng);
      if (!parsed) {
        toast.error('Could not resolve address from your location. Please type it manually.');
        return;
      }
      if (kind === 'customer') {
        if (parsed.address) setAddress(parsed.address);
        if (parsed.city) setCity(parsed.city);
        if (parsed.pincode) setPincode(parsed.pincode);
      } else {
        if (parsed.address) setBusinessAddress(parsed.address);
        if (parsed.city) setBusinessCity(parsed.city);
        if (parsed.pincode) setBusinessPincode(parsed.pincode);
      }
      toast.success(
        parsed.pincode
          ? 'Address filled from your location. Review and edit if needed.'
          : 'Street and city filled. Confirm pincode if needed.',
      );
    } finally {
      setGeoAddrLoading(false);
    }
  }

  const validateDetailsBeforeOtp = useCallback((): boolean => {
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (name.length < 2) {
      toast.error('Please enter your first and last name');
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address');
      return false;
    }
    const phone = formatPhoneE164(phoneDigits);
    if (phone.length < 12) {
      toast.error('Enter a valid 10-digit mobile number');
      return false;
    }
    if (accountTab === 'customer') {
      if (!address.trim()) {
        toast.error('Enter your delivery address');
        return false;
      }
      if (!city.trim()) {
        toast.error('Enter your city');
        return false;
      }
      if (!/^\d{6}$/.test(pincode.replace(/\D/g, ''))) {
        toast.error('Enter a valid 6-digit pincode');
        return false;
      }
    } else {
      if (!gstNo.trim()) {
        toast.error('GST number is required for dealer accounts');
        return false;
      }
      if (!businessName.trim()) {
        toast.error('Business name is required');
        return false;
      }
      if (!businessAddress.trim()) {
        toast.error('Business address is required');
        return false;
      }
      if (!businessCity.trim()) {
        toast.error('Enter your business city');
        return false;
      }
      if (!/^\d{6}$/.test(businessPincode.replace(/\D/g, ''))) {
        toast.error('Enter a valid 6-digit business pincode');
        return false;
      }
    }
    return true;
  }, [
    firstName,
    lastName,
    email,
    phoneDigits,
    address,
    city,
    pincode,
    accountTab,
    gstNo,
    businessName,
    businessAddress,
    businessCity,
    businessPincode,
  ]);

  const sendShopperOtp = useCallback(async () => {
    if (!validateDetailsBeforeOtp()) return;
    const phone = formatPhoneE164(phoneDigits);
    setOtpSending(true);
    try {
      await authApi.sendOtp(phone, { purpose: 'signup', email: email.trim().toLowerCase() });
      setRegisterOtpCells(['', '', '', '', '', '']);
      setRegisterOtpKey((k) => k + 1);
      setOtpAttemptsLeft(OTP_ATTEMPTS);
      setRegisterStep('otp');
      setResendSeconds(30);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setOtpSending(false);
    }
  }, [phoneDigits, email, validateDetailsBeforeOtp]);

  useEffect(() => {
    if (registerStep !== 'otp' || resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [registerStep, resendSeconds]);

  async function submitShopper(e: React.FormEvent) {
    e.preventDefault();
    const otp = registerOtpCells.join('');
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    setLoading(true);
    try {
      const phone = formatPhoneE164(phoneDigits);
      const fullAddress =
        accountTab === 'dealer'
          ? [businessAddress.trim(), businessCity.trim(), `Pincode: ${businessPincode.replace(/\D/g, '').slice(0, 6)}`]
              .filter(Boolean)
              .join('\n')
          : [address.trim(), city.trim(), `Pincode: ${pincode.replace(/\D/g, '').slice(0, 6)}`]
              .filter(Boolean)
              .join('\n');
      const geoCity = accountTab === 'dealer' ? businessCity : city;
      const geoPin =
        accountTab === 'dealer' ? businessPincode.replace(/\D/g, '').slice(0, 6) : pincode.replace(/\D/g, '').slice(0, 6);
      const geo = await resolveRegistrationCoordinates(geoCity, geoPin);
      const { data } = await authApi.register({
        name,
        phone,
        email: email.trim().toLowerCase(),
        role: accountTab,
        otp,
        gst_no: accountTab === 'dealer' ? gstNo.trim() : undefined,
        business_name: accountTab === 'dealer' ? businessName.trim() : undefined,
        business_address: accountTab === 'dealer' ? businessAddress.trim() : undefined,
        business_city: accountTab === 'dealer' ? businessCity.trim() : undefined,
        business_pincode: accountTab === 'dealer' ? businessPincode.replace(/\D/g, '').slice(0, 6) : undefined,
        address: fullAddress || undefined,
        ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
      });
      const payload = parseJwt(data.access_token);
      if (!payload || typeof payload.role !== 'string') {
        toast.error('Invalid session');
        return;
      }
      saveToken(data.access_token, payload.role);
      if (accountTab === 'dealer') {
        toast.success(
          "Welcome! Your dealer account is active. Dealer pricing will be unlocked once your GST number is verified (usually within 24 hours). Until then, you can browse at regular prices.",
        );
        router.push('/dealer/dashboard');
        return;
      }
      toast.success(`Welcome to ${publicBrandName}, ${firstName.trim() || 'there'}!`);
      router.push('/');
    } catch {
      setOtpAttemptsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          queueMicrotask(() => {
            toast.error('Too many incorrect codes. Go back and request a new OTP.');
            setRegisterStep('details');
            setRegisterOtpCells(['', '', '', '', '', '']);
            setResendSeconds(0);
          });
          return OTP_ATTEMPTS;
        }
        queueMicrotask(() => {
          toast.error(`Incorrect code. Please check and try again. ${next} attempt${next === 1 ? '' : 's'} remaining.`);
        });
        return next;
      });
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
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-ev-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-xl">{publicBrandName}</span>
          </Link>
          <h1 className="text-2xl font-bold text-ev-text">Create your account</h1>
          <p className="text-ev-muted text-sm mt-1 max-w-md mx-auto leading-relaxed">
            Choose your account type to get started
          </p>
        </div>

        <div className="ev-card p-1 flex flex-col sm:flex-row gap-1 mb-6">
          {REGISTER_SELF_SERVE_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setAccountTab(key);
                setRegisterStep('details');
                setRegisterOtpCells(['', '', '', '', '', '']);
                setResendSeconds(0);
                setOtpAttemptsLeft(OTP_ATTEMPTS);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                accountTab === key ? 'bg-ev-primary text-white shadow-ev-glow' : 'text-ev-muted hover:text-ev-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {accountTab === 'technician' ? (
          <TechnicianApplicationForm embedded />
        ) : (
          <>
            {registerStep === 'details' ? (
              <div className="text-center mb-6">
                <p className="text-ev-muted text-sm max-w-md mx-auto leading-relaxed">
                  {accountTab === 'dealer' ? (
                    <>
                      Get wholesale pricing, bulk order support and GST invoices. Your GST number will be verified
                      within 24 hours.
                    </>
                  ) : (
                    <>Shop cameras, lenses and accessories from top stores</>
                  )}
                </p>
              </div>
            ) : (
              <div className="text-center mb-6 space-y-2">
                <p className="text-ev-subtle text-xs font-semibold uppercase tracking-wider">Step 2 of 2</p>
                <h2 className="text-2xl font-bold text-ev-text">Verify your number</h2>
                <p className="text-ev-muted text-sm max-w-md mx-auto leading-relaxed">
                  We sent a 6-digit code to {phoneMasked}. It expires in 10 minutes.
                </p>
              </div>
            )}

            {registerStep === 'details' ? (
                  <div className="ev-card p-8">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void sendShopperOtp();
                      }}
                      className="space-y-5"
                    >
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

                      {accountTab === 'dealer' ? (
                        <div>
                          <label className="ev-label">Business name</label>
                          <input
                            type="text"
                            className="ev-input"
                            placeholder="Registered business / trade name"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            required
                          />
                        </div>
                      ) : null}

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
                        <label className="ev-label">Mobile number (+91)</label>
                        <div className="flex rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden focus-within:ring-2 focus-within:ring-ev-primary/40 focus-within:border-ev-primary transition-all">
                          <span className="flex items-center px-4 text-ev-muted text-sm font-semibold border-r border-ev-border shrink-0">
                            +91
                          </span>
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

                      {accountTab === 'customer' ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <label className="ev-label mb-0">Delivery address</label>
                              <button
                                type="button"
                                className="ev-btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 shrink-0"
                                disabled={geoAddrLoading}
                                onClick={() => void fillAddressFromGeo('customer')}
                              >
                                {geoAddrLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                                Use current location
                              </button>
                            </div>
                            <p className="text-ev-subtle text-xs -mt-1">
                              GPS can pre-fill street, city, and pincode, or type everything manually.
                            </p>
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
                            <label className="ev-label">City</label>
                            <input
                              type="text"
                              className="ev-input"
                              placeholder="Pune"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
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
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              required
                            />
                            <p className="text-ev-subtle text-xs mt-1.5">Filled from city when available — change if needed.</p>
                          </div>
                        </>
                      ) : (
                        <>
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
                            <p className="text-ev-subtle text-xs mt-1.5">
                              We&apos;ll verify this within 24 hours; until then you can browse at regular prices.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <label className="ev-label mb-0">Business address</label>
                              <button
                                type="button"
                                className="ev-btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 shrink-0"
                                disabled={geoAddrLoading}
                                onClick={() => void fillAddressFromGeo('dealer')}
                              >
                                {geoAddrLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                                Use current location
                              </button>
                            </div>
                            <p className="text-ev-subtle text-xs -mt-1">
                              GPS can pre-fill street, city, and pincode, or type everything manually.
                            </p>
                            <div className="relative">
                              <MapPin size={16} className="absolute left-4 top-3 text-ev-subtle" />
                              <textarea
                                className="ev-input pl-10 min-h-[88px] resize-y"
                                placeholder="Registered office / billing address"
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="ev-label">City</label>
                            <input
                              type="text"
                              className="ev-input"
                              placeholder="Noida"
                              value={businessCity}
                              onChange={(e) => setBusinessCity(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="ev-label">Pincode</label>
                            <input
                              type="text"
                              className="ev-input font-mono text-sm"
                              placeholder="201301"
                              maxLength={6}
                              value={businessPincode}
                              onChange={(e) => setBusinessPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              required
                            />
                          </div>
                        </>
                      )}

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
                        ) : accountTab === 'dealer' ? (
                          <>
                            Send OTP to verify mobile
                            <ArrowRight size={16} />
                          </>
                        ) : (
                          <>
                            Send OTP to +91 {phoneLast10.length === 10 ? phoneLast10 : '__________'}
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
                ) : (
                  <div className="ev-card p-8">
                    <form onSubmit={submitShopper} className="space-y-6">
                      <OtpCells
                        key={registerOtpKey}
                        autoFocusKey={registerOtpKey}
                        cells={registerOtpCells}
                        onCellsChange={setRegisterOtpCells}
                        disabled={loading}
                      />
                      <button
                        type="submit"
                        className="ev-btn-primary w-full flex items-center justify-center gap-2"
                        disabled={loading || registerOtpCells.join('').length !== 6}
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : (
                          <>
                            <span>Verify and create account</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                      <p className="text-center text-ev-subtle text-sm leading-relaxed">
                        {resendSeconds > 0 ? (
                          <span>Didn&apos;t get it? Resend OTP in {resendSeconds} seconds</span>
                        ) : (
                          <button
                            type="button"
                            className="text-ev-primary hover:text-ev-primary-light font-medium disabled:opacity-50"
                            disabled={loading || otpSending}
                            onClick={() => void sendShopperOtp()}
                          >
                            Resend OTP
                          </button>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRegisterStep('details');
                          setRegisterOtpCells(['', '', '', '', '', '']);
                          setResendSeconds(0);
                          setOtpAttemptsLeft(OTP_ATTEMPTS);
                        }}
                        className="w-full text-center text-ev-subtle text-sm hover:text-ev-muted"
                      >
                        ← Edit details
                      </button>
                    </form>

                    <p className="text-center text-ev-subtle text-sm mt-6">
                      Already have an account?{' '}
                      <Link href="/login" className="text-ev-primary hover:text-ev-primary-light font-medium">
                        Sign in
                      </Link>
                    </p>
                  </div>
                )}
          </>
        )}
      </div>
    </div>
  );
}
