// Client-side feedback helper that posts to SheetDB (keeps behaviour compatible with existing integration).
// Reads SheetDB endpoint from <meta name="sheetdb-endpoint"> OR from #result[data-sheetdb-endpoint].
// Sends JSON array of rows (SheetDB common format).
// Usage: window.iPersonalityFeedback.sendFeedback(payload)

(function () {
  function getSheetDbEndpoint() {
    const meta = document.querySelector('meta[name="sheetdb-endpoint"]');
    if (meta && meta.content) return meta.content.trim();
    const resultEl = document.getElementById('result');
    if (resultEl && resultEl.dataset && resultEl.dataset.sheetdbEndpoint) return resultEl.dataset.sheetdbEndpoint.trim();
    return '';
  }

  async function postJson(url, body) {
    // SheetDB commonly accepts an array of objects. Adapt if your sheet expects {"data": {...}}.
    const payload = Array.isArray(body) ? body : [body];
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res;
  }

  async function sendFeedback(payload, opts = {}) {
    const statusEl = document.getElementById('feedback-status');
    const endpoint = opts.endpoint || getSheetDbEndpoint();

    if (!endpoint) {
      if (statusEl) {
        statusEl.textContent = 'Feedback endpoint not configured.';
        statusEl.style.color = 'crimson';
      }
      return { ok: false, error: 'no-endpoint' };
    }

    // Basic validation
    if (!payload || !payload.type || (payload.accurate !== 'yes' && payload.accurate !== 'no')) {
      if (statusEl) {
        statusEl.textContent = 'Feedback missing required fields.';
        statusEl.style.color = 'crimson';
      }
      return { ok: false, error: 'validation' };
    }

    if (statusEl) {
      statusEl.textContent = 'Sending...';
      statusEl.style.color = '';
    }

    try {
      const resp = await postJson(endpoint, payload);
      if (!resp.ok) {
        const text = await resp.text().catch(()=>null);
        if (statusEl) {
          statusEl.textContent = 'Failed to send feedback.';
          statusEl.style.color = 'crimson';
        }
        return { ok: false, status: resp.status, text };
      }
      if (statusEl) {
        statusEl.textContent = 'Thanks — feedback sent!';
        statusEl.style.color = 'green';
      }
      return { ok: true };
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = 'Network error while sending feedback.';
        statusEl.style.color = 'crimson';
      }
      return { ok: false, error: err.message || String(err) };
    }
  }

  // expose helper
  window.iPersonalityFeedback = { sendFeedback };
})();
