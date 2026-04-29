'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Headphones, Mail, MapPin, Truck } from 'lucide-react';
import { contactPageQuickLinks } from '@/lib/contact-quick-links';
import {
  publicBrandTagline,
  publicCopyrightNotice,
  publicInfoEmail,
  publicMarketingEmail,
  publicRegisteredAddress,
  publicSalesPhone,
  publicSupportEmail,
  publicSupportPhone,
} from '@/lib/public-contact';
import { publicBrandName } from '@/lib/public-brand';

function telHref(display: string) {
  const d = display.replace(/\D/g, '');
  if (d.length >= 10) return `tel:+${d.replace(/^\+?/, '')}`;
  return `tel:${display}`;
}

function buildMailto(to: string, subject: string, body: string) {
  const q = new URLSearchParams();
  q.set('subject', subject);
  q.set('body', body);
  return `mailto:${to}?${q.toString()}`;
}

export function ContactPageContent() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subscribeEmail, setSubscribeEmail] = useState('');

  const sendMessage = useCallback(() => {
    const body = [
      `Name: ${firstName.trim()} ${lastName.trim()}`.trim(),
      `Email: ${email.trim()}`,
      '',
      message.trim(),
    ].join('\n');
    const href = buildMailto(publicSupportEmail, `Website contact — ${publicBrandName}`, body);
    window.location.href = href;
  }, [firstName, lastName, email, message]);

  const subscribe = useCallback(() => {
    const em = subscribeEmail.trim();
    if (!em) return;
    const href = buildMailto(
      publicMarketingEmail,
      `Subscribe — ${publicBrandName}`,
      `Please add this email to the newsletter list:\n${em}`,
    );
    window.location.href = href;
  }, [subscribeEmail]);

  return (
    <>
      <div className="sr-only">
        <a href="#site-navigation" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ev-text focus:shadow-lg">
          Skip to navigation
        </a>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-16 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ev-text focus:shadow-lg">
          Skip to main content
        </a>
      </div>

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-2">Get in Touch</h1>
        <p className="text-ev-muted max-w-2xl mb-10">
          We are here for orders, accounts, dealers, technicians, and partnerships. Prefer the form below — it opens your
          email app with your message addressed to our support team.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 mb-14">
          <div className="space-y-6">
            <div className="ev-card p-5 sm:p-6 flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-ev-primary/15 flex items-center justify-center">
                <Headphones className="text-ev-primary w-5 h-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-ev-text">24/7 Support</p>
                <a href={telHref(publicSupportPhone)} className="text-ev-primary hover:text-ev-primary-light font-medium">
                  {publicSupportPhone}
                </a>
              </div>
            </div>

            <div className="ev-card p-5 sm:p-6 flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-ev-primary/15 flex items-center justify-center">
                <Truck className="text-ev-primary w-5 h-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-ev-text">Free Shipping</p>
                <p className="text-ev-muted text-sm">All over India</p>
              </div>
            </div>

            <div className="ev-card p-5 sm:p-6 flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-ev-primary/15 flex items-center justify-center">
                <Mail className="text-ev-primary w-5 h-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-ev-text mb-1">Email Us</p>
                <a
                  href={`mailto:${publicInfoEmail}`}
                  className="block text-ev-primary hover:text-ev-primary-light text-sm font-medium break-all"
                >
                  {publicInfoEmail}
                </a>
                <a
                  href={`mailto:${publicSupportEmail}`}
                  className="block text-ev-primary hover:text-ev-primary-light text-sm font-medium break-all mt-1"
                >
                  {publicSupportEmail}
                </a>
              </div>
            </div>

            <div className="ev-card p-5 sm:p-6 flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-ev-primary/15 flex items-center justify-center">
                <Headphones className="text-ev-primary w-5 h-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-ev-text mb-2">Contact Number</p>
                <a href={telHref(publicSalesPhone)} className="block text-ev-primary hover:text-ev-primary-light font-medium">
                  {publicSalesPhone}
                </a>
                <a href={telHref(publicSupportPhone)} className="block text-ev-primary hover:text-ev-primary-light font-medium mt-1">
                  {publicSupportPhone}
                </a>
              </div>
            </div>

            <div className="ev-card p-5 sm:p-6 flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-ev-primary/15 flex items-center justify-center">
                <MapPin className="text-ev-primary w-5 h-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-ev-text mb-2">Address</p>
                <p className="text-ev-muted text-sm leading-relaxed">{publicRegisteredAddress}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="ev-card p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ev-text mb-6">Get in Touch</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="contact-first" className="block text-sm font-medium text-ev-text mb-1.5">
                    First name
                  </label>
                  <input
                    id="contact-first"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-ev-border bg-white px-3 py-2.5 text-sm text-ev-text outline-none focus:border-ev-primary focus:ring-1 focus:ring-ev-primary/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-last" className="block text-sm font-medium text-ev-text mb-1.5">
                    Last name
                  </label>
                  <input
                    id="contact-last"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-ev-border bg-white px-3 py-2.5 text-sm text-ev-text outline-none focus:border-ev-primary focus:ring-1 focus:ring-ev-primary/30"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="contact-email" className="block text-sm font-medium text-ev-text mb-1.5">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-ev-border bg-white px-3 py-2.5 text-sm text-ev-text outline-none focus:border-ev-primary focus:ring-1 focus:ring-ev-primary/30"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="contact-message" className="block text-sm font-medium text-ev-text mb-1.5">
                  Your Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  placeholder="Your Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-ev-border bg-white px-3 py-2.5 text-sm text-ev-text outline-none focus:border-ev-primary focus:ring-1 focus:ring-ev-primary/30 resize-y min-h-[120px]"
                />
              </div>
              <button type="button" onClick={sendMessage} className="ev-btn-primary w-full sm:w-auto px-8 py-3">
                Send Message
              </button>
              <p className="text-ev-muted text-xs mt-3">Opens your email app with the message pre-filled to {publicSupportEmail}.</p>
            </div>

            <div className="ev-card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ev-text mb-4">Subscribe us</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Your email"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-ev-border bg-white px-3 py-2.5 text-sm text-ev-text outline-none focus:border-ev-primary focus:ring-1 focus:ring-ev-primary/30"
                />
                <button type="button" onClick={subscribe} className="ev-btn-secondary px-6 py-2.5 whitespace-nowrap">
                  Subscribe
                </button>
              </div>
              <p className="text-ev-muted text-xs mt-2">Sends a request to {publicMarketingEmail}.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-ev-border pt-12 space-y-10">
          <p className="text-ev-muted text-sm leading-relaxed max-w-4xl">{publicBrandTagline}</p>

          <div>
            <h2 className="text-lg font-bold text-ev-text mb-4">Quick Links</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
              {contactPageQuickLinks.map(({ href, label }) => (
                <li key={`${href}-${label}`}>
                  <Link href={href} className="text-ev-primary hover:text-ev-primary-light font-medium">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-ev-text mb-3">Contact Information</h2>
            <ul className="text-ev-muted text-sm space-y-2">
              <li>
                <a href={telHref(publicSalesPhone)} className="text-ev-primary hover:text-ev-primary-light">
                  {publicSalesPhone}
                </a>
              </li>
              <li>
                <a href={telHref(publicSupportPhone)} className="text-ev-primary hover:text-ev-primary-light">
                  {publicSupportPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicMarketingEmail}`} className="text-ev-primary hover:text-ev-primary-light">
                  {publicMarketingEmail}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicSupportEmail}`} className="text-ev-primary hover:text-ev-primary-light">
                  {publicSupportEmail}
                </a>
              </li>
              <li className="pt-1 max-w-xl leading-relaxed">{publicRegisteredAddress}</li>
            </ul>
          </div>

          <p className="text-ev-muted text-xs pt-4 border-t border-ev-border">{publicCopyrightNotice}</p>
        </div>
      </main>
    </>
  );
}
