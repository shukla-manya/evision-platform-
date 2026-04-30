'use client';

import { useCallback, useState } from 'react';
import { aboutBrandSummary } from '@/lib/about-company-content';
import { publicCopyrightNotice } from '@/lib/public-contact';
import { publicContactApi, type ContactMessageResponse } from '@/lib/api';

function apiErrorMessage(err: unknown, fallback: string): string {
  const d = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const m = d?.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m)) return m.join(', ');
  return fallback;
}

export function ContactPageContent() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subscribeEmail, setSubscribeEmail] = useState('');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<ContactMessageResponse | null>(null);

  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccessEmail, setSubSuccessEmail] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    setFormError(null);
    setFormSuccess(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    const msg = message.trim();
    if (!fn || !ln || !em || !msg) {
      setFormError('Please fill in all fields.');
      return;
    }
    try {
      setFormSubmitting(true);
      const { data } = await publicContactApi.submitMessage({
        first_name: fn,
        last_name: ln,
        email: em,
        message: msg,
      });
      setFormSuccess(data);
      setFirstName('');
      setLastName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not send your message. Please try again.'));
    } finally {
      setFormSubmitting(false);
    }
  }, [firstName, lastName, email, message]);

  const subscribe = useCallback(async () => {
    setSubError(null);
    setSubSuccessEmail(null);
    const em = subscribeEmail.trim();
    if (!em) {
      setSubError('Enter your email to subscribe.');
      return;
    }
    try {
      setSubSubmitting(true);
      const { data } = await publicContactApi.subscribeNewsletter({ email: em });
      setSubSuccessEmail(data.email);
      setSubscribeEmail('');
    } catch (err) {
      setSubError(apiErrorMessage(err, 'Could not subscribe right now. Please try again.'));
    } finally {
      setSubSubmitting(false);
    }
  }, [subscribeEmail]);

  const resetFormFlow = useCallback(() => {
    setFormSuccess(null);
    setFormError(null);
  }, []);

  return (
    <>
      <a href="#site-navigation" className="ev-skip-link--nav">
        Skip to navigation
      </a>
      <a href="#main-content" className="ev-skip-link">
        Skip to main content
      </a>

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-2">Get in Touch</h1>
        <p className="text-ev-muted max-w-2xl mb-4">
          We are here for orders, accounts, dealers, technicians, and partnerships. Submit the form below — we email our
          team and send you a confirmation with everything you entered.
        </p>
        <p className="text-ev-subtle text-sm max-w-2xl mb-10">
          Phone numbers, marketing and support email, and our office address are in the{' '}
          <a href="#site-footer-contact" className="text-ev-primary font-medium hover:underline">
            site footer
          </a>{' '}
          on every page (scroll to the bottom or use that link).
        </p>

        <div className="max-w-2xl mb-14 space-y-8">
            {formSuccess ? (
              <div className="ev-card p-6 sm:p-8 border-2 border-ev-primary/30 bg-ev-primary/5">
                <p className="text-xl font-bold text-ev-text">Thank you, {formSuccess.greeting_name}!</p>
                <p className="text-ev-muted mt-3 leading-relaxed">
                  Your message was delivered to our team. We also sent a confirmation email to{' '}
                  <strong className="text-ev-text">{formSuccess.email}</strong> with a copy of what you submitted.
                </p>
                <div className="mt-6 rounded-xl border border-ev-border bg-white/80 p-4 text-sm">
                  <p className="font-semibold text-ev-text mb-3">Here is what we have on file:</p>
                  <dl className="space-y-2 text-ev-text">
                    <div className="flex gap-2">
                      <dt className="text-ev-muted w-28 shrink-0">First name</dt>
                      <dd>{formSuccess.first_name}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-ev-muted w-28 shrink-0">Last name</dt>
                      <dd>{formSuccess.last_name}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-ev-muted w-28 shrink-0">Email</dt>
                      <dd className="break-all">{formSuccess.email}</dd>
                    </div>
                    <div className="flex flex-col gap-1 pt-2">
                      <dt className="text-ev-muted">Your message</dt>
                      <dd className="whitespace-pre-wrap text-ev-text leading-relaxed">{formSuccess.message}</dd>
                    </div>
                  </dl>
                </div>
                <button type="button" className="ev-btn-secondary mt-6 text-sm" onClick={resetFormFlow}>
                  Send another message
                </button>
              </div>
            ) : (
              <div className="ev-card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-ev-text mb-6">Get in Touch</h2>
                {formError ? (
                  <p className="text-sm text-red-600 mb-4 rounded-lg bg-red-50 px-3 py-2 border border-red-100">{formError}</p>
                ) : null}
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
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={formSubmitting}
                  className="ev-btn-primary w-full sm:w-auto px-8 py-3 disabled:opacity-60"
                >
                  {formSubmitting ? 'Sending…' : 'Send Message'}
                </button>
                <p className="text-ev-muted text-xs mt-3">Delivered through our server; check your inbox for the confirmation.</p>
              </div>
            )}

            <div className="ev-card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ev-text mb-4">Subscribe us</h2>
              {subSuccessEmail ? (
                <p className="text-sm text-ev-text leading-relaxed">
                  Thank you! We received your subscription request for <strong>{subSuccessEmail}</strong>. You should get a
                  short confirmation email shortly.
                </p>
              ) : (
                <>
                  {subError ? (
                    <p className="text-sm text-red-600 mb-3 rounded-lg bg-red-50 px-3 py-2 border border-red-100">{subError}</p>
                  ) : null}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      placeholder="Your email"
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      className="flex-1 rounded-xl border border-ev-border bg-white px-3 py-2.5 text-sm text-ev-text outline-none focus:border-ev-primary focus:ring-1 focus:ring-ev-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => void subscribe()}
                      disabled={subSubmitting}
                      className="ev-btn-secondary px-6 py-2.5 whitespace-nowrap disabled:opacity-60"
                    >
                      {subSubmitting ? 'Sending…' : 'Subscribe'}
                    </button>
                  </div>
                  <p className="text-ev-muted text-xs mt-2">We notify marketing and email you a confirmation.</p>
                </>
              )}
            </div>
        </div>

        <div className="border-t border-ev-border pt-12 space-y-6">
          <p className="text-ev-muted text-sm leading-relaxed max-w-4xl">{aboutBrandSummary}</p>
          <p className="text-ev-muted text-xs pt-4 border-t border-ev-border">{publicCopyrightNotice}</p>
        </div>
      </main>
    </>
  );
}
