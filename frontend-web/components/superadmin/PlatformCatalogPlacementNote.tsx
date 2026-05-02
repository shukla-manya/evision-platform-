'use client';

import Link from 'next/link';
import { publicBrandName } from '@/lib/public-brand';

/** Explains platform catalogue vs category vs homepage for superadmin product forms. */
export function PlatformCatalogPlacementNote() {
  return (
    <div className="min-w-0 rounded-xl border border-ev-border bg-ev-surface2/60 p-3 text-sm leading-relaxed text-ev-muted sm:p-4 break-words">
      <p className="mb-2 font-semibold text-ev-text">Where this product appears</p>
      <ul className="list-disc space-y-1.5 pl-4 marker:text-ev-muted">
        <li>
          <span className="font-medium text-ev-text">Main shop catalogue</span> — Listed for customers and dealers in
          the <span className="font-medium text-ev-text">{publicBrandName}</span> storefront (website and app): shop
          browse, search, product page, and cart, when the product is <span className="font-medium text-ev-text">active</span>.
        </li>
        <li>
          <span className="font-medium text-ev-text">Category</span> — Pick the <em>one</em> shop section this SKU
          belongs in (e.g. Footwear, Running shoes). That controls which category browse path and filters it appears
          under — it is not chosen automatically from the product name.
        </li>
        <li>
          <span className="font-medium text-ev-text">Brand (optional)</span> — A separate label on the product (e.g.{' '}
          <span className="font-mono text-ev-text">Puma</span> or <span className="font-mono text-ev-text">Nike</span>).
          Shoppers can filter by brand on the shop. Brand does <span className="font-medium text-ev-text">not</span>{' '}
          replace category: e.g. category “Footwear” + brand “Puma” lists the item under Footwear and lets Puma
          filter find it.
        </li>
        <li>
          <span className="font-medium text-ev-text">Homepage showcase</span> — Optional extra spots on the marketing
          home page when you set that section below.
        </li>
      </ul>
      <p className="mt-3 text-xs">
        <Link href="/shop" className="font-medium text-ev-primary hover:underline">
          Open public shop
        </Link>
      </p>
    </div>
  );
}
