export async function renderPromos(container) {
  try {
    const res = await fetch('data/promos.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.promotions || data.promotions.length === 0) {
      container.innerHTML = '<div class="loading-skeleton">No promotions available.</div>';
      return;
    }

    let html = '';
    for (const promo of data.promotions) {
      const companyTags = (promo.companies || [])
        .map(c => `<span class="promo-company-tag ${escapeAttr(c)}">${capitalize(c)}</span>`)
        .join('');

      html += `
        <div class="promo-card">
          <div class="promo-bank">${escapeHtml(promo.bank)}</div>
          <div class="promo-card-name">${escapeHtml(promo.card)}</div>
          <div class="promo-discount">${escapeHtml(promo.discount)}</div>
          <div class="promo-companies">${companyTags}</div>
          <div class="promo-conditions">${escapeHtml(promo.conditions)}</div>
          ${promo.url ? `<a class="promo-link" href="${escapeAttr(promo.url)}" target="_blank" rel="noopener">Learn more &rarr;</a>` : ''}
        </div>`;
    }

    container.innerHTML = html;
  } catch {
    container.innerHTML = '<div class="error-state">Failed to load promotions.</div>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/[&"'<>]/g, c => ({
    '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;'
  })[c]);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
