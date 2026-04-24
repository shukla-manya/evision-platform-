import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'E Vision — Multi-Shop Platform',
  description: 'E Vision Pvt. Ltd. — Multi-Shop E-Commerce & Electrician Service Platform, Faridabad',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0d1626',
              color: '#e2e8f0',
              border: '1px solid #1e3a5f',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0d1626' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0d1626' } },
          }}
        />
      </body>
    </html>
  );
}
