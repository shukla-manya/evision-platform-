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
  if (/^\d+\s-\s\d+/.test(t)) return null;
  const mHy = t.match(/^(.{2,160}?)\s-\s+(.+)$/);
  if (mHy) {
    const title = mHy[1].trim();
    const body = mHy[2].trim();
    if (title.length >= 2 && body.length >= 2) return { title, body };
  }
  return null;
}

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

export function getFeaturePreviewLines(
  raw: string | undefined | null,
  max = 5,
): { title: string; body: string }[] {
  const lines = parseProductDescriptionLines(raw);
  const out: { title: string; body: string }[] = [];
  for (const row of lines) {
    if (row.kind !== 'feature') continue;
    out.push({ title: row.title, body: row.body });
    if (out.length >= max) break;
  }
  return out;
}

export function shortProductDescriptionBlurb(raw: string | undefined, maxLen = 600): string {
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
