// Chart initializer for radar chart using vibrant purple + electric blue palette.
// Exposes window.renderTraitChart() which uses window.resultData.

(function () {
  let chartInstance = null;

  function palette() {
    return {
      bg: 'rgba(106,13,173,0.12)',    // soft purple fill
      border: 'rgba(0,191,255,0.95)', // electric blue border for emphasis
      point: 'rgba(106,13,173,0.95)'
    };
  }

  function buildData(resultData) {
    // trait_scores expected normalized {Mind, Energy, Nature, Tactics} values 0..1
    const labels = ['Mind', 'Energy', 'Nature', 'Tactics'];
    const data = labels.map(l => (resultData.trait_scores && typeof resultData.trait_scores[l] !== 'undefined') ? resultData.trait_scores[l] : 0);
    return { labels, data };
  }

  function createRadar(ctx, labels, dataValues, colors, title) {
    const cfg = {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: title || 'Traits',
          data: dataValues,
          fill: true,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          pointBackgroundColor: colors.point,
          pointBorderColor: '#fff',
          pointRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: 1,
            grid: { color: 'rgba(255,255,255,0.04)' },
            angleLines: { color: 'rgba(255,255,255,0.03)' },
            ticks: { backdropColor: 'transparent', color: 'rgba(255,255,255,0.6)', stepSize: 0.5 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    };
    return new Chart(ctx, cfg);
  }

  window.renderTraitChart = function () {
    if (typeof window.resultData === 'undefined') {
      console.warn('renderTraitChart: window.resultData missing');
      return;
    }
    const canvas = document.getElementById('traitChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // destroy old instance
    if (chartInstance) {
      try { chartInstance.destroy(); } catch (e) {}
      chartInstance = null;
    }

    const p = palette();
    const payload = buildData(window.resultData);
    chartInstance = createRadar(ctx, payload.labels, payload.data, p, window.resultData.code || 'Type');
  };

  // also try to auto-render if resultData is already present
  if (window.resultData) {
    window.renderTraitChart();
  }
})();
