/** HTML document that auto-submits a POST form to PayU hosted checkout. */
export function buildPayuAutoSubmitHtml(action: string, fields: Record<string, string>): string {
  const escAttr = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${escAttr(k)}" value="${escAttr(v)}" />`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><form id="pf" method="POST" action="${escAttr(action)}">${inputs}</form><script>document.getElementById("pf").submit();</script></body></html>`;
}
