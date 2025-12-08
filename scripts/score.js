// Score and result rendering helpers.
// Provides renderTypeByCode(code) to display a static personality result page directly.
// Also preserves renderResultFromScore(score) to be used after quiz scoring.

async function fetchPersonalities() {
  const r = await fetch('/data/personalities.json', { cache: 'no-store' });
  return r.json();
}

function normalizeTraitScores(ts) {
  const out = { Mind: 0, Energy: 0, Nature: 0, Tactics: 0 };
  if (!ts) return out;
  for (const k of Object.keys(out)) {
    let v = ts[k];
    if (typeof v === 'boolean') v = v ? 1 : 0;
    v = Number(v || 0);
    if (Number.isNaN(v)) v = 0;
    out[k] = Math.max(0, Math.min(1, v));
  }
  return out;
}

function pickTypeFromScores(score, types) {
  const normalizedScore = normalizeTraitScores(score);

  // exact match
  for (const t of types) {
    const ts = normalizeTraitScores(t.trait_scores);
    if (ts.Mind === normalizedScore.Mind &&
        ts.Energy === normalizedScore.Energy &&
        ts.Nature === normalizedScore.Nature &&
        ts.Tactics === normalizedScore.Tactics) {
      return Object.assign({}, t, { trait_scores: ts });
    }
  }

  // fallback: minimal Hamming distance
  let best = null;
  let bestDist = Infinity;
  for (const t of types) {
    const ts = normalizeTraitScores(t.trait_scores);
    let dist = 0;
    for (const d of ['Mind','Energy','Nature','Tactics']) {
      if (Math.abs(ts[d] - normalizedScore[d]) > 0.5) dist++;
    }
    if (dist < bestDist) {
      bestDist = dist;
      best = Object.assign({}, t, { trait_scores: ts });
    } else if (dist === bestDist) {
      if (best && t.code && best.code && t.code < best.code) best = Object.assign({}, t, { trait_scores: ts });
    }
  }
  return best;
}

async function renderResult(chosen) {
  if (!chosen) return;
  chosen.trait_scores = normalizeTraitScores(chosen.trait_scores || {});
  window.resultData = chosen;

  document.getElementById('type-code').textContent = chosen.code || '';
  document.getElementById('type-name').textContent = (chosen.name || '').split(' - ')[1] || '';
  document.getElementById('short-description').textContent = chosen.short_description || '';
  document.getElementById('trait-mind').textContent = chosen.traits?.Mind || '';
  document.getElementById('trait-energy').textContent = chosen.traits?.Energy || '';
  document.getElementById('trait-nature').textContent = chosen.traits?.Nature || '';
  document.getElementById('trait-tactics').textContent = chosen.traits?.Tactics || '';
  const careersEl = document.getElementById('careers');
  careersEl.innerHTML = (chosen.careers || []).map(c => `<li>${c}</li>`).join('');
  document.getElementById('relationships').textContent = chosen.relationships || '';

  // wire feedback form
  const fb = document.getElementById('feedback-form');
  if (fb) {
    fb.addEventListener('submit', async function (e) {
      e.preventDefault();
      const accurate = fb.elements['accurate'] && fb.elements['accurate'].value;
      const notes = document.getElementById('notes').value;
      const payload = {
        type: chosen.code,
        accurate,
        notes,
        timestamp: new Date().toISOString(),
        trait_scores: chosen.trait_scores
      };

      // prefer client-side helper
      if (window.iPersonalityFeedback && typeof window.iPersonalityFeedback.sendFeedback === 'function') {
        await window.iPersonalityFeedback.sendFeedback(payload);
        return;
      }

      // fallback: attempt to post directly using meta tag
      const meta = document.querySelector('meta[name="sheetdb-endpoint"]');
      const endpoint = (meta && meta.content) ? meta.content : '';
      const statusEl = document.getElementById('feedback-status');
      if (endpoint) {
        try {
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([payload])
          });
          if (resp.ok) {
            if (statusEl) { statusEl.textContent = 'Thanks — feedback sent!'; statusEl.style.color = 'green'; }
            return;
          } else {
            if (statusEl) { statusEl.textContent = 'Failed to send feedback.'; statusEl.style.color = 'crimson'; }
          }
        } catch (err) {
          console.error('Fallback feedback error', err);
        }
      }
      if (statusEl) { statusEl.textContent = 'Could not send feedback automatically. Please try again later.'; statusEl.style.color = 'crimson'; }
    }, { once: false });
  }

  // render chart
  if (window.renderTraitChart) window.renderTraitChart();
}

// Public: render a personality page by code (e.g., "ENFP", "INTJ")
window.renderTypeByCode = async function (code) {
  const data = await fetchPersonalities();
  const types = data.types || [];
  const target = (types || []).find(t => (t.code || '').toUpperCase() === (code || '').toUpperCase());
  if (target) {
    await renderResult(target);
    return target;
  } else {
    // If not found, fallback to pick nearest by code pattern or default ENFP
    console.warn('Type code not found:', code);
    const defaultType = (types || []).find(t => t.code === 'ENFP') || (types || [])[0];
    if (defaultType) await renderResult(defaultType);
    return defaultType;
  }
};

// Public: render after quiz scoring
window.renderResultFromScore = async function (score) {
  const data = await fetchPersonalities();
  const chosen = pickTypeFromScores(score, data.types || []);
  if (!chosen) {
    console.error('No personality type matched the score.', score);
    return;
  }
  await renderResult(chosen);
};
