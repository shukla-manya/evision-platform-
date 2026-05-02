export type DescLineKind = 'blank' | 'bullet' | 'text';

export type DescLine = { kind: DescLineKind; text: string };

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

export function shortProductDescriptionBlurb(raw: string | undefined, maxLen = 600): string {
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
