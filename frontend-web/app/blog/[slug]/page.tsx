import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { PublicTrustStrip } from '@/components/public/PublicTrustStrip';
import { publicBrandName } from '@/lib/public-brand';
import { formatBlogDateShort, getAllBlogSlugs, getBlogPostBySlug } from '@/lib/blog-posts';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return { title: `Not found — ${publicBrandName}` };
  return {
    title: `${post.title} — ${publicBrandName}`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <PublicShell>
      <a href="#site-navigation" className="ev-skip-link--nav">
        Skip to navigation
      </a>
      <a href="#blog-article" className="ev-skip-link">
        Skip to main content
      </a>
      <PublicTrustStrip />
      <article id="blog-article" className="min-w-0">
        <div className="ev-container max-w-3xl py-6 sm:py-10">
          <header className="border-b border-ev-border pb-8">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ev-border bg-ev-surface2 text-sm font-bold text-ev-primary"
                aria-hidden
              >
                {post.author.initials}
              </div>
              <div className="text-sm text-ev-muted">
                <span className="font-medium text-ev-text">{post.author.name}</span>
                <span className="mx-1.5">·</span>
                <time dateTime={post.publishedAt}>{formatBlogDateShort(post.publishedAt)}</time>
                <span className="mx-1.5">·</span>
                <span>{post.commentCount} Comments</span>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ev-text sm:text-4xl">{post.title}</h1>
            <p className="mt-4 text-base leading-relaxed text-ev-muted">{post.excerpt}</p>
          </header>

          <div className="mt-8 max-w-none">
            {post.body.map((para, i) => (
              <p key={i} className="mb-4 text-base leading-relaxed text-ev-muted last:mb-0">
                {para}
              </p>
            ))}
          </div>

          <div className="mt-10">
            <Link href="/blog" className="ev-btn-secondary inline-flex items-center gap-2 text-sm py-2.5 px-5">
              <ArrowLeft size={16} aria-hidden />
              Back to blog
            </Link>
          </div>
        </div>
      </article>
    </PublicShell>
  );
}
