const COMPANY_NAMES = {
  esso: 'Esso',
  shell: 'Shell',
  spc: 'SPC',
  caltex: 'Caltex',
  sinopec: 'Sinopec',
};

const GRADE_LABELS = {
  '92': 'RON 92',
  '95': 'RON 95',
  '98': 'RON 98',
  premium: 'Premium',
  diesel: 'Diesel',
};

export function renderPumpTable(data, wrapper) {
  if (!data || !data.prices) {
    wrapper.innerHTML = '<div class="error-state">No price data available.</div>';
    return;
  }

  const { grades, companies, prices, summary } = data;
  const cheapest = summary?.cheapestByGrade || {};

  const table = document.createElement('table');
  table.className = 'price-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>Company</th>' +
    grades.map(g => `<th>${GRADE_LABELS[g] || g}</th>`).join('');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  for (const company of companies) {
    const tr = document.createElement('tr');
    tr.dataset.company = company;

    const nameCell = document.createElement('td');
    nameCell.innerHTML = `<span class="company-dot"></span>${COMPANY_NAMES[company] || company}`;
    tr.appendChild(nameCell);

    for (const grade of grades) {
      const td = document.createElement('td');
      td.className = 'price-cell';
      const pump = prices[grade]?.[company]?.pump;

      if (pump === null || pump === undefined) {
        td.classList.add('unavailable');
        td.textContent = '-';
      } else {
        td.textContent = `$${pump.toFixed(2)}`;
        if (cheapest[grade]?.pump?.company === company) {
          td.classList.add('cheapest');
        }
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrapper.innerHTML = '';
  wrapper.appendChild(table);
}

export function renderDiscountTable(data, wrapper) {
  if (!data || !data.prices) {
    wrapper.innerHTML = '<div class="error-state">No discount data available.</div>';
    return;
  }

  const { grades, companies, prices, summary } = data;
  const cheapest = summary?.cheapestByGrade || {};

  const table = document.createElement('table');
  table.className = 'price-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>Company</th>' +
    grades.map(g => `<th>${GRADE_LABELS[g] || g}</th>`).join('');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  for (const company of companies) {
    const tr = document.createElement('tr');
    tr.dataset.company = company;

    const nameCell = document.createElement('td');
    nameCell.innerHTML = `<span class="company-dot"></span>${COMPANY_NAMES[company] || company}`;
    tr.appendChild(nameCell);

    for (const grade of grades) {
      const td = document.createElement('td');
      td.className = 'price-cell';
      const entry = prices[grade]?.[company];
      const disc = entry?.discounted;

      if (disc === null || disc === undefined) {
        td.classList.add('unavailable');
        td.textContent = '-';
      } else {
        let html = `$${disc.toFixed(2)}`;
        if (entry.card) {
          html += `<span class="card-label">${escapeHtml(entry.card)}</span>`;
        }
        if (entry.discountPct) {
          html += `<span class="discount-pct">-${entry.discountPct}%</span>`;
        }
        td.innerHTML = html;
        if (cheapest[grade]?.discounted?.company === company) {
          td.classList.add('cheapest');
        }
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrapper.innerHTML = '';
  wrapper.appendChild(table);
}

export function renderSummary(data, container) {
  if (!data?.summary?.cheapestByGrade) {
    container.innerHTML = '';
    return;
  }

  const cheapest = data.summary.cheapestByGrade;
  let html = '';

  for (const grade of data.grades) {
    const info = cheapest[grade];
    if (!info?.pump) continue;

    const pumpPrice = info.pump.price.toFixed(2);
    const company = COMPANY_NAMES[info.pump.company] || info.pump.company;
    const discInfo = info.discounted;

    let cardLine = '';
    if (discInfo?.card) {
      cardLine = `<div class="cheapest-card">Best w/ card: $${discInfo.price.toFixed(2)} (${escapeHtml(discInfo.card)})</div>`;
    }

    html += `
      <div class="summary-card">
        <div class="grade-label">${GRADE_LABELS[grade] || grade}</div>
        <div class="cheapest-price">$${pumpPrice}</div>
        <div class="cheapest-company">${company}</div>
        ${cardLine}
      </div>`;
  }

  container.innerHTML = html;
}

export function filterTableByCompany(companies) {
  document.querySelectorAll('.price-table tr[data-company]').forEach(row => {
    if (companies.size === 0 || companies.has(row.dataset.company)) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
