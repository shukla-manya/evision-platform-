'use client';

import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Props = {
  children: React.ReactNode;
  /** Sidebar column (logo, nav, footer) — no outer `<aside>` wrapper. */
  sidebar: React.ReactNode;
  /** Mobile-only top bar label (shop name, product area, etc.). */
  mobileTopBarTitle: string;
};

/**
 * Tablet/desktop (md+): fixed 16rem sidebar + offset main.
 * Small phones: full-width main, slide-over drawer, sticky top bar with menu.
 */
export function ResponsiveSidebarShell({ children, sidebar, mobileTopBarTitle }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-ev-bg flex min-w-0">
      <header className="md:hidden fixed top-0 inset-x-0 z-20 flex h-14 min-h-14 items-center gap-3 border-b border-white/10 bg-ev-navbar/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <button
          type="button"
          className="rounded-lg p-2 text-white/90 -ml-1 hover:bg-white/10 shrink-0"
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar-drawer"
          aria-label="Open navigation menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{mobileTopBarTitle}</span>
      </header>

      {drawerOpen ? (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-ev-text/50 backdrop-blur-[1px]"
          aria-label="Close navigation menu"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar-drawer"
        className={[
          'ev-sidebar z-50 flex flex-col w-64 max-w-[min(18rem,calc(100vw-2.5rem))] border-r border-white/10',
          'fixed inset-y-0 left-0 transition-transform duration-200 ease-out',
          'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
          'md:translate-x-0 md:pb-0 md:pt-0',
          drawerOpen ? 'translate-x-0 shadow-ev-lg' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{sidebar}</div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pt-14 md:pl-64 md:pt-0">
        <div className="ev-shell-body flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
