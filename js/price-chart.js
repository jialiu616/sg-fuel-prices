const GRADE_LABELS = {
  '92': 'RON 92',
  '95': 'RON 95',
  '98': 'RON 98',
  premium: 'Premium',
  diesel: 'Diesel',
};

const GRADE_COLORS = {
  '92': '#6366f1',
  '95': '#0ea5e9',
  '98': '#f59e0b',
  premium: '#ec4899',
  diesel: '#10b981',
};

export async function renderPriceChart(currentDate, availableDates, container) {
  // Load last 30 days of data for trend lines
  const dates = availableDates.filter(d => d <= currentDate).slice(0, 30).reverse();

  if (dates.length < 2) {
    container.innerHTML = '<div class="loading-skeleton">Not enough historical data for trends yet.</div>';
    return;
  }

  const datasets = {};
  for (const date of dates) {
    try {
      const res = await fetch(`data/${date}.json`);
      if (!res.ok) continue;
      const data = await res.json();

      for (const grade of data.grades) {
        if (!datasets[grade]) datasets[grade] = [];
        // Use cheapest pump price for this grade
        let minPrice = Infinity;
        for (const company of data.companies) {
          const p = data.prices[grade]?.[company]?.pump;
          if (p !== null && p !== undefined && p < minPrice) minPrice = p;
        }
        datasets[grade].push({
          date,
          price: minPrice === Infinity ? null : minPrice,
        });
      }
    } catch {
      // Skip failed fetches
    }
  }

  let html = '<div class="chart-grid">';

  for (const [grade, points] of Object.entries(datasets)) {
    const validPoints = points.filter(p => p.price !== null);
    if (validPoints.length < 2) continue;

    const prices = validPoints.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 0.01;

    // Build SVG sparkline
    const w = 200;
    const h = 50;
    const padding = 4;

    const pathPoints = validPoints.map((p, i) => {
      const x = padding + (i / (validPoints.length - 1)) * (w - 2 * padding);
      const y = h - padding - ((p.price - minP) / range) * (h - 2 * padding);
      return `${x},${y}`;
    });

    const color = GRADE_COLORS[grade] || '#6366f1';
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const trendColor = lastPrice > prevPrice ? 'var(--price-up)' : lastPrice < prevPrice ? 'var(--price-down)' : color;

    html += `
      <div class="chart-card">
        <div class="chart-label">${GRADE_LABELS[grade] || grade}</div>
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <polyline
            points="${pathPoints.join(' ')}"
            fill="none"
            stroke="${color}"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="${pathPoints[pathPoints.length - 1].split(',')[0]}" cy="${pathPoints[pathPoints.length - 1].split(',')[1]}" r="3" fill="${trendColor}" />
        </svg>
        <div class="chart-range">
          <span>$${minP.toFixed(2)}</span>
          <span style="color:${trendColor}; font-weight:600;">$${lastPrice.toFixed(2)}</span>
          <span>$${maxP.toFixed(2)}</span>
        </div>
      </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}
