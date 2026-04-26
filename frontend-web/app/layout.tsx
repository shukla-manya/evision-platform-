import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'e vision — Camera & Gear Marketplace',
  description: 'e vision — A warm, trustworthy marketplace for cameras and gear.',
  /** Favicon: MS mark in `app/icon.svg` (Next.js adds `<link rel="icon">` automatically). */
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          containerStyle={{
            top: 'max(0.75rem, env(safe-area-inset-top))',
            right: 'max(0.75rem, env(safe-area-inset-right))',
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1a1a2e',
              border: '1px solid #d8d2ca',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: 'min(420px, calc(100vw - 2rem))',
            },
            success: { iconTheme: { primary: '#2ecc71', secondary: '#ffffff' } },
            error: { iconTheme: { primary: '#e74c3c', secondary: '#ffffff' } },
          }}
        />
      </body>
    </html>
  );
}
