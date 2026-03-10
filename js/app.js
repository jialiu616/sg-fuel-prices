import { DateNavigator } from './date-navigator.js';
import { renderPumpTable, renderDiscountTable, renderSummary, filterTableByCompany } from './price-table.js';
import { initCompanyFilters } from './company-filter.js';
import { renderPriceChart } from './price-chart.js';
import { renderPromos } from './promo-renderer.js';

let currentData = null;
let dateNav = null;

async function loadDateData(date) {
  const pumpWrapper = document.getElementById('pumpTableWrapper');
  const discountWrapper = document.getElementById('discountTableWrapper');
  const summaryContainer = document.getElementById('summaryCards');
  const chartContainer = document.getElementById('chartContainer');

  pumpWrapper.innerHTML = '<div class="loading-skeleton">Loading prices...</div>';
  discountWrapper.innerHTML = '<div class="loading-skeleton">Loading prices...</div>';

  try {
    const res = await fetch(`data/${date}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentData = await res.json();

    // Update header
    document.getElementById('lastUpdated').textContent =
      `Last updated: ${formatDate(currentData.date)}`;

    // Render components
    renderSummary(currentData, summaryContainer);
    renderPumpTable(currentData, pumpWrapper);
    renderDiscountTable(currentData, discountWrapper);

    // Render chart with available dates
    const availDates = dateNav?.availableDates || [];
    renderPriceChart(date, availDates, chartContainer);

  } catch (err) {
    pumpWrapper.innerHTML = `<div class="error-state">Failed to load price data for ${date}.</div>`;
    discountWrapper.innerHTML = '';
    summaryContainer.innerHTML = '';
    chartContainer.innerHTML = '<div class="error-state">No chart data available.</div>';
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function init() {
  // Initialize date navigator
  dateNav = new DateNavigator({
    pickerEl: document.getElementById('datePicker'),
    prevBtn: document.getElementById('prevDate'),
    nextBtn: document.getElementById('nextDate'),
    todayBtn: document.getElementById('todayBtn'),
    calendarEl: document.getElementById('miniCalendar'),
    onChange: loadDateData,
  });

  await dateNav.init();

  // Initialize company filters
  const defaultCompanies = ['esso', 'shell', 'spc', 'caltex', 'sinopec'];
  initCompanyFilters(
    document.getElementById('companyFilters'),
    defaultCompanies,
    filterTableByCompany
  );

  // Load promotions
  renderPromos(document.getElementById('promoGrid'));
}

init();
