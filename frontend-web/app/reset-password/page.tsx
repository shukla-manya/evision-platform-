'use client';

import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="ev-card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-ev-text">Forgot your password?</h1>
          <p className="text-ev-muted text-sm leading-relaxed">
            Contact support and we'll reset your account password for you.
          </p>
          <Link href="/contact" className="ev-btn-primary inline-flex items-center justify-center w-full">
            Contact support
          </Link>
          <Link href="/login" className="block text-center text-ev-subtle text-sm hover:text-ev-muted">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
