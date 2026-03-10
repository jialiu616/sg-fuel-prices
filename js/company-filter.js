const COMPANY_NAMES = {
  esso: 'Esso',
  shell: 'Shell',
  spc: 'SPC',
  caltex: 'Caltex',
  sinopec: 'Sinopec',
};

export function initCompanyFilters(container, companies, onChange) {
  const activeCompanies = new Set();

  function render() {
    container.innerHTML = '';

    // "All" pill
    const allPill = document.createElement('button');
    allPill.className = 'filter-pill' + (activeCompanies.size === 0 ? ' active' : '');
    allPill.dataset.company = 'all';
    allPill.textContent = 'All';
    allPill.addEventListener('click', () => {
      activeCompanies.clear();
      render();
      onChange(activeCompanies);
    });
    container.appendChild(allPill);

    // Company pills
    for (const company of companies) {
      const pill = document.createElement('button');
      pill.className = 'filter-pill' + (activeCompanies.has(company) ? ' active' : '');
      pill.dataset.company = company;
      pill.textContent = COMPANY_NAMES[company] || company;
      pill.addEventListener('click', () => {
        if (activeCompanies.has(company)) {
          activeCompanies.delete(company);
        } else {
          activeCompanies.add(company);
        }
        render();
        onChange(activeCompanies);
      });
      container.appendChild(pill);
    }
  }

  render();
}
