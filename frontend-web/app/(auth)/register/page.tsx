'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Camera, User, Mail, MapPin, ArrowRight, Loader2, Navigation, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveToken, parseJwt, redirectByRole } from '@/lib/auth';
import { TechnicianApplicationForm } from '@/components/register/TechnicianApplicationForm';
import { publicBrandName } from '@/lib/public-brand';
import {
  getBrowserGeolocation,
  isBrowserGeolocationContextBlocked,
  resolveRegistrationCoordinates,
  reverseGeocodeIndia,
} from '@/lib/registration-geo';
import { suggestPincodeForIndianCity } from '@/lib/india-postal-lookup';
import { REGISTER_SELF_SERVE_TABS } from '@/lib/user-roles';

type AccountTab = 'customer' | 'dealer' | 'technician';

/** Side panel art for split register layout (desktop left / mobile top). */
const REGISTER_PANEL_IMAGE =
  'https://www-cms.pipedriveassets.com/cdn-cgi/image/quality=70,format=auto/https://www-cms.pipedriveassets.com/Delight-the-Customer.jpg';

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
      if (isBrowserGeolocationContextBlocked()) {
        toast.error(
          'This page must be served over HTTPS (except on localhost) for the browser to allow location. Use HTTPS or type your address manually.',
        );
        return;
      }
      const pos = await getBrowserGeolocation();
      if (!pos) {
        toast.error(
          'Could not read your location. Allow location for this site in the browser settings, then try again — or type your address manually.',
        );
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

  const phoneLast10 = phoneDigits.replace(/\D/g, '').slice(-10);
  const canSendShopperOtp = useMemo(() => {
    if (accountTab !== 'customer' && accountTab !== 'dealer') return false;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (name.length < 2) return false;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return false;
    if (phoneLast10.length !== 10) return false;
    if (accountTab === 'customer') {
      if (!address.trim() || !city.trim() || !/^\d{6}$/.test(pincode.replace(/\D/g, ''))) return false;
    } else {
      if (!gstNo.trim() || !businessName.trim() || !businessAddress.trim() || !businessCity.trim()) return false;
      if (!/^\d{6}$/.test(businessPincode.replace(/\D/g, ''))) return false;
    }
    return true;
  }, [
    firstName,
    lastName,
    email,
    phoneLast10,
    accountTab,
    address,
    city,
    pincode,
    gstNo,
    businessName,
    businessAddress,
    businessCity,
    businessPincode,
  ]);

  const sendShopperOtp = useCallback(async () => {
    if (!validateDetailsBeforeOtp()) return;
    setOtpSending(true);
    try {
      await authApi.sendOtp(email.trim().toLowerCase(), { purpose: 'signup' });
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
  }, [email, validateDetailsBeforeOtp]);

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
      router.push(redirectByRole(String(payload.role)));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = getApiErrorMessage(err, 'Registration failed');
        if (status === 409) {
          toast.error(msg);
          setRegisterStep('details');
          setRegisterOtpCells(['', '', '', '', '', '']);
          setResendSeconds(0);
          return;
        }
        if (status === 400) {
          toast.error(msg);
          return;
        }
        if (status === 401) {
          const lower = msg.toLowerCase();
          if (
            lower.includes('otp') ||
            lower.includes('invalid') ||
            lower.includes('expired') ||
            lower.includes('not found')
          ) {
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
                toast.error(
                  `Incorrect code. Please check and try again. ${next} attempt${next === 1 ? '' : 's'} remaining.`,
                );
              });
              return next;
            });
            return;
          }
          toast.error(msg);
          return;
        }
        toast.error(msg);
        return;
      }
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const emailMasked = (() => {
    const em = email.trim().toLowerCase();
    const [u, d] = em.split('@');
    if (!d) return em || 'your email';
    if (u.length <= 2) return `${u[0] ?? '*'}***@${d}`;
    return `${u.slice(0, 2)}***@${d}`;
  })();

  return (
    <div className="relative min-h-[100dvh] w-full ev-page-gutter pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:py-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-ev-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex w-full shrink-0 flex-col justify-center lg:w-[44%] lg:min-w-0 lg:max-w-xl">
          <div className="relative aspect-[5/3] w-full overflow-hidden sm:aspect-[2/1] lg:aspect-[4/3] lg:max-h-[min(420px,48vh)] lg:rounded-xl lg:border lg:border-ev-border/90 lg:shadow-md">
            <img
              src={REGISTER_PANEL_IMAGE}
              alt="Colleagues welcoming customers in a modern professional workspace"
              className="absolute inset-0 h-full w-full object-cover object-[center_24%]"
              loading="eager"
              fetchPriority="high"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-ev-bg/80 via-transparent to-transparent lg:hidden"
              aria-hidden
            />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ev-border bg-ev-surface px-5 py-6 shadow-[0_28px_90px_-32px_rgba(15,23,42,0.18)] sm:px-8 sm:py-8 lg:overflow-y-auto lg:px-10 lg:py-10">
            <div className="mb-6 text-center lg:text-left">
              <Link href="/" className="mb-4 inline-flex items-center justify-center gap-2.5 lg:justify-start">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-ev-glow">
                  <Camera size={22} className="text-white" />
                </div>
                <span className="text-xl font-bold text-ev-text">{publicBrandName}</span>
              </Link>
              <h1 className="text-2xl font-bold text-ev-text sm:text-3xl">Create your account</h1>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ev-muted lg:mx-0">
                Choose your account type to get started
              </p>
            </div>

            <div className="ev-card mb-6 grid grid-cols-3 gap-0.5 p-1 sm:flex sm:flex-row sm:gap-1">
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
                  className={`flex min-h-[48px] items-center justify-center rounded-lg px-1.5 text-center text-xs font-medium transition-all sm:flex-1 sm:rounded-xl sm:px-3 sm:text-sm ${
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
              <div className="mb-6 text-center lg:text-left">
                <p className="mx-auto max-w-md text-sm leading-relaxed text-ev-muted lg:mx-0">
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
              <div className="mb-6 space-y-2 text-center lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-ev-subtle">Step 2 of 2</p>
                <h2 className="text-2xl font-bold text-ev-text">Verify your email</h2>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-ev-muted lg:mx-0">
                  We sent a 6-digit code to {emailMasked}. It expires in 10 minutes.
                </p>
              </div>
            )}

            {registerStep === 'details' ? (
                  <div className="ev-card p-4 sm:p-6 lg:p-8">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void sendShopperOtp();
                      }}
                      className="space-y-5 [&_input.ev-input]:text-base [&_input.ev-input]:sm:text-sm [&_textarea.ev-input]:text-base [&_textarea.ev-input]:sm:text-sm"
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
                        <p className="text-ev-subtle text-xs mt-1.5 leading-relaxed">
                          Sign-up verification code is sent to your email above, not by SMS to this number.
                        </p>
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
                        className="ev-btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 text-base"
                        disabled={otpSending || !canSendShopperOtp}
                      >
                        {otpSending ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            Send OTP to {emailMasked}
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
                  <div className="ev-card p-4 sm:p-6 lg:p-8">
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
                        className="ev-btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 text-base"
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
    </div>
  );
}
