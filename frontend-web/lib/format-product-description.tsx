import type { ReactNode } from 'react';

export type DescLineKind = 'blank' | 'bullet' | 'text';

export type DescLine = { kind: DescLineKind; text: string };

/**
 * Turns pasted catalogue copy into structured lines: blank lines, bullets (`- `, `* `, `• `, `1. `), or paragraphs.
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
      out.push({ kind: 'bullet', text: trimmed.replace(bulletRe, '').trim() });
    } else {
      out.push({ kind: 'text', text: trimmed });
    }
  }
  return out;
}

/** Full description tab — bullets as a proper list, paragraphs spaced, blanks as rhythm. */
export function ProductDescriptionRich({ text }: { text?: string | null }) {
  const lines = parseProductDescriptionLines(text);
  if (!lines.length) {
    return <p className="text-ev-muted text-sm">No description provided for this product.</p>;
  }

  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const row = lines[i];
    if (row.kind === 'blank') {
      nodes.push(<div key={`b-${i}`} className="h-2 sm:h-2.5" aria-hidden />);
      i += 1;
      continue;
    }
    if (row.kind === 'bullet') {
      const items: ReactNode[] = [];
      let j = i;
      while (j < lines.length && lines[j].kind === 'bullet') {
        items.push(
          <li key={j} className="leading-relaxed text-ev-text pl-0.5">
            {lines[j].text}
          </li>,
        );
        j += 1;
      }
      nodes.push(
        <ul
          key={`ul-${i}`}
          className="list-disc space-y-2.5 pl-5 text-sm marker:text-ev-primary sm:text-[15px] sm:leading-relaxed"
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

  return <div className="space-y-2">{nodes}</div>;
}

/** Hero blurb: prefer first bullet points; otherwise first paragraph of prose. */
export function shortProductDescriptionBlurb(raw: string | undefined, maxLen = 720): string {
  const lines = parseProductDescriptionLines(raw);
  const bullets = lines.filter((l) => l.kind === 'bullet').map((l) => l.text);
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
