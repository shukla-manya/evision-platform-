import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { PublicTrustStrip } from '@/components/public/PublicTrustStrip';
import { PublicMarketingBand } from '@/components/public/PublicMarketingBand';
import { publicBrandName } from '@/lib/public-brand';
import { formatBlogDateLong, formatBlogDateShort, getBlogPostsSorted } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: `Blog — ${publicBrandName}`,
  description:
    'CCTV guides: 4G cameras without WiFi, IP surveillance basics, bullet vs dome placement, and why IP is the modern default for Indian homes and businesses.',
};

export default function BlogPage() {
  const posts = getBlogPostsSorted();

  return (
    <PublicShell>
      <a href="#site-navigation" className="ev-skip-link--nav">
        Skip to navigation
      </a>
      <a href="#blog-main" className="ev-skip-link">
        Skip to main content
      </a>
      <PublicTrustStrip />
      <main id="blog-main" className="min-w-0">
        <div className="ev-container py-6 sm:py-10">
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-ev-muted" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ev-primary">
              Home
            </Link>
            <ChevronRight size={14} className="text-ev-subtle shrink-0" aria-hidden />
            <span className="font-medium text-ev-text">Blog</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ev-text sm:text-3xl">Blog</h1>
              <p className="mt-2 max-w-2xl text-sm text-ev-muted sm:text-base">
                Practical guides on IP and 4G CCTV, camera form factors, and resilient design for Indian sites—from villas to
                warehouses.
              </p>

              <ul className="mt-10 space-y-10">
                {posts.map((post) => (
                  <li key={post.slug} className="border-b border-ev-border pb-10 last:border-0 last:pb-0">
                    <article className="flex gap-4 sm:gap-5">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ev-border bg-ev-surface2 text-sm font-bold text-ev-primary"
                        aria-hidden
                      >
                        {post.author.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ev-muted sm:text-sm">
                          <span className="font-medium text-ev-text">{post.author.name}</span>
                          <span aria-hidden>·</span>
                          <span>{post.commentCount} Comments</span>
                          <span aria-hidden>·</span>
                          <span className="rounded-md bg-ev-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ev-muted">
                            {post.category}
                          </span>
                          <span aria-hidden>·</span>
                          <time dateTime={post.publishedAt}>{formatBlogDateShort(post.publishedAt)}</time>
                        </div>
                        <h2 className="mt-2 text-lg font-bold text-ev-text sm:text-xl">
                          <Link href={`/blog/${post.slug}`} className="hover:text-ev-primary transition-colors">
                            {post.title}
                          </Link>
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-ev-muted line-clamp-3 sm:line-clamp-4">{post.excerpt}</p>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="mt-3 inline-flex text-sm font-semibold text-ev-primary hover:underline"
                        >
                          Continue reading
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="space-y-8 lg:pt-2">
              <div className="rounded-xl border border-ev-border bg-ev-surface p-4 sm:p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ev-text">Categories</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link href="/blog" className="text-ev-primary font-medium">
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-ev-border bg-ev-surface p-4 sm:p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ev-text">Recent Posts</h2>
                <ul className="mt-3 space-y-4 text-sm">
                  {posts.map((p) => (
                    <li key={p.slug} className="border-b border-ev-border/80 pb-3 last:border-0 last:pb-0">
                      <Link href={`/blog/${p.slug}`} className="font-semibold text-ev-text hover:text-ev-primary leading-snug">
                        {p.title}
                      </Link>
                      <p className="mt-1 text-xs text-ev-muted">
                        <time dateTime={p.publishedAt}>{formatBlogDateLong(p.publishedAt)}</time>
                        <span className="mx-1.5">·</span>
                        No Comments
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="overflow-hidden rounded-xl border border-ev-border bg-gradient-to-br from-ev-surface2 to-ev-surface">
                <div className="bg-ev-primary px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                  On sale
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-lg font-bold text-ev-text">4G Watch Pro</p>
                  <p className="mt-1 text-xs text-ev-muted">Outdoor 4G series — check live stock and dealer pricing in the shop.</p>
                  <Link href="/shop?search=4G+Watch" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-ev-primary py-2.5 text-sm font-semibold text-white hover:opacity-95">
                    To shop
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
        <PublicMarketingBand headingId="blog-marketing-band" />
      </main>
    </PublicShell>
  );
}
