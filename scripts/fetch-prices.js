import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const COMPANIES = ['esso', 'shell', 'spc', 'caltex', 'sinopec'];
const URL = 'https://www.motorist.sg/petrol-prices';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn(`[fetch] Attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
      }
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

function parsePrice(text) {
  const clean = text.trim();
  if (!clean || clean === '-' || clean === 'N/A') return null;
  const num = parseFloat(clean.replace('$', ''));
  return isNaN(num) ? null : num;
}

function parseDiscountPct(titleHtml) {
  if (!titleHtml) return null;
  const match = titleHtml.match(/Discount\s*\((\d+\.?\d*)%\)/);
  return match ? parseFloat(match[1]) : null;
}

function parsePumpPriceTable($, table) {
  const prices = {};
  const rows = $(table).find('tr.text-center');

  rows.each((_, row) => {
    const cells = $(row).find('td');
    const gradeCell = $(cells[0]);
    if (!gradeCell.hasClass('text-left')) return;

    const grade = gradeCell.text().trim().toLowerCase();
    if (!grade) return;

    prices[grade] = {};
    COMPANIES.forEach((company, i) => {
      const cellText = $(cells[i + 1]).text().trim();
      prices[grade][company] = parsePrice(cellText);
    });
  });

  return prices;
}

function parseDiscountTable($, table) {
  const discounts = {};
  const rows = $(table).find('tr');

  // Row with class "bankname" cells has the card names
  let bankNames = [];
  rows.each((_, row) => {
    const bankCells = $(row).find('td.bankname');
    if (bankCells.length > 0) {
      bankCells.each((_, cell) => {
        bankNames.push($(cell).text().trim());
      });
    }
  });

  // Discount price rows
  const discountRows = $(table).find('tr.discountpetrolrow');
  discountRows.each((_, row) => {
    const cells = $(row).find('td');
    const gradeCell = $(cells[0]);
    const grade = gradeCell.text().trim().toLowerCase();
    if (!grade) return;

    discounts[grade] = {};
    COMPANIES.forEach((company, i) => {
      const cell = $(cells[i + 1]);
      const priceText = cell.text().trim();
      const tooltip = cell.find('.fuel-tooltip');
      const titleHtml = tooltip.attr('data-original-title') || tooltip.attr('title') || '';

      discounts[grade][company] = {
        price: parsePrice(priceText),
        card: bankNames[i] || null,
        discountPct: parseDiscountPct(titleHtml)
      };
    });
  });

  return discounts;
}

function computeSummary(pumpPrices, discountData) {
  const cheapestByGrade = {};

  for (const grade of Object.keys(pumpPrices)) {
    let cheapestPump = { company: null, price: Infinity };
    let cheapestDisc = { company: null, price: Infinity, card: null };

    for (const company of COMPANIES) {
      const pump = pumpPrices[grade][company];
      if (pump !== null && pump < cheapestPump.price) {
        cheapestPump = { company, price: pump };
      }

      const disc = discountData[grade]?.[company];
      if (disc?.price !== null && disc?.price !== undefined && disc.price < cheapestDisc.price) {
        cheapestDisc = { company, price: disc.price, card: disc.card };
      }
    }

    cheapestByGrade[grade] = {
      pump: cheapestPump.company ? { company: cheapestPump.company, price: cheapestPump.price } : null,
      discounted: cheapestDisc.company ? { company: cheapestDisc.company, price: cheapestDisc.price, card: cheapestDisc.card } : null,
    };
  }

  return { cheapestByGrade };
}

function mergeData(pumpPrices, discountData) {
  const prices = {};
  for (const grade of Object.keys(pumpPrices)) {
    prices[grade] = {};
    for (const company of COMPANIES) {
      const pump = pumpPrices[grade][company] ?? null;
      const disc = discountData[grade]?.[company] ?? {};
      prices[grade][company] = {
        pump,
        discounted: disc.price ?? null,
        card: disc.card ?? null,
        discountPct: disc.discountPct ?? null,
      };
    }
  }
  return prices;
}

async function main() {
  console.log('[fetch-prices] Fetching from motorist.sg...');
  const html = await fetchWithRetry(URL);
  const $ = cheerio.load(html);

  const tables = $('table');
  if (tables.length < 2) {
    console.error('[fetch-prices] Expected at least 2 tables, found', tables.length);
    process.exit(1);
  }

  const pumpTable = tables.eq(0);
  const discountTable = tables.eq(1);

  console.log('[fetch-prices] Parsing pump prices...');
  const pumpPrices = parsePumpPriceTable($, pumpTable);

  console.log('[fetch-prices] Parsing discounted prices...');
  const discountData = parseDiscountTable($, discountTable);

  // Validate: at least 3 companies should have grade 95 prices
  const grade95Count = COMPANIES.filter(c => pumpPrices['95']?.[c] !== null).length;
  if (grade95Count < 3) {
    console.error(`[fetch-prices] Validation failed: only ${grade95Count} companies have grade 95 prices`);
    process.exit(1);
  }

  const grades = Object.keys(pumpPrices);
  const prices = mergeData(pumpPrices, discountData);
  const summary = computeSummary(pumpPrices, discountData);

  const today = new Date().toISOString().split('T')[0];
  const data = {
    date: today,
    generatedAt: new Date().toISOString(),
    source: 'motorist.sg',
    companies: COMPANIES,
    grades,
    prices,
    summary,
  };

  // Log summary
  console.log(`[fetch-prices] Date: ${today}`);
  console.log(`[fetch-prices] Grades found: ${grades.join(', ')}`);
  for (const grade of grades) {
    const entries = COMPANIES.map(c => {
      const p = prices[grade][c];
      return `${c}: ${p.pump !== null ? '$' + p.pump.toFixed(2) : '-'}`;
    }).join(', ');
    console.log(`  ${grade}: ${entries}`);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const outFile = path.join(DATA_DIR, `${today}.json`);
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[fetch-prices] Saved to ${outFile}`);
}

main().catch(err => {
  console.error('[fetch-prices] Fatal error:', err.message);
  process.exit(1);
});
