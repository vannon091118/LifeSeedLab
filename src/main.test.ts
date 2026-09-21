import { describe, it, expect } from 'vitest';
import { escapeHtml } from './main';

describe('main.tsx security sanitization (SEC001)', () => {
  it('escaped HTML-Sonderzeichen korrekt vor Injizierung', () => {
    const malicious = '<script>alert("XSS")</script> & \'test"';
    const safe = escapeHtml(malicious);
    expect(safe).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &#39;test&quot;');
  });

  it('belässt normale Strings unverändert', () => {
    expect(escapeHtml('Normaler Fehlertext')).toBe('Normaler Fehlertext');
  });
});
