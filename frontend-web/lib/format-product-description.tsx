import type { ReactNode } from 'react';

export type DescLineKind = 'blank' | 'bullet' | 'text' | 'feature';

export type DescLine =
  | { kind: 'blank'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'feature'; title: string; body: string };

/** "Title – detail" / "Title — detail" (Amazon-style bullet lead). */
export function parseFeatureLeadBody(line: string): { title: string; body: string } | null {
  const t = line.trim();
  if (t.length < 6) return null;
  const mEn = t.match(/^(.{2,160}?)\s[\u2013\u2014]\s+(.+)$/u);
  if (mEn) {
    const title = mEn[1].trim();
    const body = mEn[2].trim();
    if (title.length >= 2 && body.length >= 2) return { title, body };
  }
  // Spaced ASCII hyphen (common when pasting from Word/retail sites); skip numeric ranges like "3 - 5".
  if (/^\d+\s-\s\d+/.test(t)) return null;
  const mHy = t.match(/^(.{2,160}?)\s-\s+(.+)$/);
  if (mHy) {
    const title = mHy[1].trim();
    const body = mHy[2].trim();
    if (title.length >= 2 && body.length >= 2) return { title, body };
  }
  return null;
}

/**
 * Turns catalogue copy into lines: blanks, bullets (`- `, `* `, `• `, `1. `),
 * Amazon-style feature lines (`Feature – details`), or paragraphs.
 */
export function parseProductDescriptionLines(raw: string | undefined | null): DescLine[] {
  if (!raw?.trim()) return [];
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const bulletRe = /^([-*•]\s+|\d{1,2}\.\s+)/;
  const out: DescLine[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push({ kind: 'blank', text: '' });
      continue;
    }
    if (bulletRe.test(trimmed)) {
      const inner = trimmed.replace(bulletRe, '').trim();
      const feat = parseFeatureLeadBody(inner);
      if (feat) {
        out.push({ kind: 'feature', title: feat.title, body: feat.body });
      } else {
        out.push({ kind: 'bullet', text: inner });
      }
      continue;
    }
    const feat = parseFeatureLeadBody(trimmed);
    if (feat) {
      out.push({ kind: 'feature', title: feat.title, body: feat.body });
    } else {
      out.push({ kind: 'text', text: trimmed });
    }
  }
  return out;
}

export function getFeaturePreviewLines(raw: string | undefined | null, max = 5): { title: string; body: string }[] {
  const lines = parseProductDescriptionLines(raw);
  const out: { title: string; body: string }[] = [];
  for (const row of lines) {
    if (row.kind !== 'feature') continue;
    out.push({ title: row.title, body: row.body });
    if (out.length >= max) break;
  }
  return out;
}

function AmazonFeatureList({ items, listKey }: { items: { title: string; body: string }[]; listKey: string }) {
  return (
    <ul className="m-0 list-none space-y-2.5 p-0 text-sm leading-snug text-ev-text sm:text-[15px] sm:leading-relaxed">
      {items.map((f, k) => (
        <li key={`${listKey}-${k}`} className="flex gap-2.5 pl-0.5">
          <span className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-ev-text" aria-hidden />
          <span>
            <strong className="font-semibold text-ev-text">{f.title}</strong>
            <span className="text-ev-text"> – {f.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Full description tab — Amazon-style feature bullets, then regular bullets / prose. */
export function ProductDescriptionRich({ text }: { text?: string | null }) {
  const lines = parseProductDescriptionLines(text);
  if (!lines.length) {
    return <p className="text-ev-muted text-sm">No description provided for this product.</p>;
  }

  const nodes: ReactNode[] = [];
  let aboutHeadingPlaced = false;
  let i = 0;
  while (i < lines.length) {
    const row = lines[i];
    if (row.kind === 'blank') {
      nodes.push(<div key={`b-${i}`} className="h-2 sm:h-2.5" aria-hidden />);
      i += 1;
      continue;
    }
    if (row.kind === 'feature') {
      if (!aboutHeadingPlaced) {
        nodes.push(
          <h2 key="about-heading" className="text-base font-semibold text-ev-text tracking-tight">
            About this item
          </h2>,
        );
        aboutHeadingPlaced = true;
      }
      const items: { title: string; body: string }[] = [];
      let j = i;
      while (j < lines.length && lines[j].kind === 'feature') {
        const f = lines[j] as Extract<DescLine, { kind: 'feature' }>;
        items.push({ title: f.title, body: f.body });
        j += 1;
      }
      nodes.push(<AmazonFeatureList key={`feat-ul-${i}`} items={items} listKey={`feat-ul-${i}`} />);
      i = j;
      continue;
    }
    if (row.kind === 'bullet') {
      const items: ReactNode[] = [];
      let j = i;
      while (j < lines.length && lines[j].kind === 'bullet') {
        items.push(
          <li key={j} className="leading-relaxed text-ev-text pl-0.5">
            {(lines[j] as Extract<DescLine, { kind: 'bullet' }>).text}
          </li>,
        );
        j += 1;
      }
      nodes.push(
        <ul
          key={`ul-${i}`}
          className="list-disc space-y-2 pl-5 text-sm marker:text-ev-text sm:text-[15px] sm:leading-relaxed"
        >
          {items}
        </ul>,
      );
      i = j;
      continue;
    }
    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-ev-text sm:text-[15px]">
        {row.text}
      </p>,
    );
    i += 1;
  }

  return <div className="space-y-3">{nodes}</div>;
}

/** Hero / cards: prefer feature bullets, then markdown bullets, then prose. */
export function shortProductDescriptionBlurb(raw: string | undefined, maxLen = 720): string {
  const lines = parseProductDescriptionLines(raw);
  const features = lines.filter((l): l is Extract<DescLine, { kind: 'feature' }> => l.kind === 'feature');
  if (features.length > 0) {
    const head = features
      .slice(0, 6)
      .map((f) => `${f.title} – ${f.body}`)
      .join('\n');
    return head.length > maxLen ? `${head.slice(0, maxLen - 1).trim()}…` : head;
  }
  const bullets = lines.filter((l) => l.kind === 'bullet').map((l) => (l as Extract<DescLine, { kind: 'bullet' }>).text);
  if (bullets.length > 0) {
    const head = bullets.slice(0, 6).join('\n');
    return head.length > maxLen ? `${head.slice(0, maxLen - 1).trim()}…` : head;
  }
  const prose = raw?.trim() || '';
  if (!prose) return '';
  const parts = prose.split(/\n\s*\n/);
  const head = parts.slice(0, 2).join('\n\n').trim();
  if (head.length > maxLen) return `${head.slice(0, maxLen - 20).trim()}…`;
  return head;
}
