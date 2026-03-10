export class DateNavigator {
  constructor({ pickerEl, prevBtn, nextBtn, todayBtn, calendarEl, onChange }) {
    this.pickerEl = pickerEl;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.todayBtn = todayBtn;
    this.calendarEl = calendarEl;
    this.onChange = onChange;
    this.availableDates = [];
    this.currentDate = null;
    this.calMonth = null; // { year, month } currently displayed in calendar

    this.prevBtn.addEventListener('click', () => this.navigate(-1));
    this.nextBtn.addEventListener('click', () => this.navigate(1));
    this.todayBtn.addEventListener('click', () => this.goToLatest());
    this.pickerEl.addEventListener('change', () => {
      const val = this.pickerEl.value;
      if (val) this.setDate(val);
    });

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const hashDate = this.getHashDate();
      if (hashDate && hashDate !== this.currentDate) {
        this.setDate(hashDate);
      }
    });
  }

  async init() {
    try {
      const res = await fetch('data/index.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const index = await res.json();
      this.availableDates = index.dates || [];
    } catch {
      this.availableDates = [];
    }

    if (this.availableDates.length > 0) {
      this.pickerEl.min = this.availableDates[this.availableDates.length - 1];
      this.pickerEl.max = this.availableDates[0];
    }

    // Determine initial date
    const hashDate = this.getHashDate();
    const startDate = (hashDate && this.availableDates.includes(hashDate))
      ? hashDate
      : this.availableDates[0] || null;

    if (startDate) {
      this.setDate(startDate);
    }
  }

  getHashDate() {
    const hash = window.location.hash;
    const match = hash.match(/date=(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  setDate(date) {
    // Snap to nearest available date
    const target = this.findNearest(date);
    if (!target) return;

    this.currentDate = target;
    this.pickerEl.value = target;
    window.location.hash = `date=${target}`;

    // Update navigation buttons
    const idx = this.availableDates.indexOf(target);
    this.prevBtn.disabled = idx >= this.availableDates.length - 1;
    this.nextBtn.disabled = idx <= 0;

    // Update calendar view month
    const [y, m] = target.split('-').map(Number);
    this.calMonth = { year: y, month: m };
    this.renderCalendar();

    this.onChange(target);
  }

  navigate(dir) {
    const idx = this.availableDates.indexOf(this.currentDate);
    const newIdx = idx - dir; // dates are newest-first
    if (newIdx >= 0 && newIdx < this.availableDates.length) {
      this.setDate(this.availableDates[newIdx]);
    }
  }

  goToLatest() {
    if (this.availableDates.length > 0) {
      this.setDate(this.availableDates[0]);
    }
  }

  findNearest(date) {
    if (this.availableDates.includes(date)) return date;
    // Find closest available date
    let best = null;
    let bestDiff = Infinity;
    const target = new Date(date).getTime();
    for (const d of this.availableDates) {
      const diff = Math.abs(new Date(d).getTime() - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = d;
      }
    }
    return best;
  }

  renderCalendar() {
    if (!this.calendarEl || !this.calMonth) return;

    const { year, month } = this.calMonth;
    const today = new Date().toISOString().split('T')[0];
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const availSet = new Set(this.availableDates);

    let html = `
      <div class="cal-header">
        <button class="cal-prev">&larr;</button>
        <span class="cal-title">${monthName}</span>
        <button class="cal-next">&rarr;</button>
      </div>
      <div class="cal-grid">
        <span class="cal-dow">Su</span><span class="cal-dow">Mo</span><span class="cal-dow">Tu</span>
        <span class="cal-dow">We</span><span class="cal-dow">Th</span><span class="cal-dow">Fr</span>
        <span class="cal-dow">Sa</span>`;

    // Blank cells before first day
    for (let i = 0; i < firstDow; i++) {
      html += '<span class="cal-day"></span>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const classes = ['cal-day'];
      if (availSet.has(dateStr)) classes.push('has-data');
      if (dateStr === today) classes.push('today');
      if (dateStr === this.currentDate) classes.push('selected');

      html += `<span class="${classes.join(' ')}" data-date="${dateStr}">${d}</span>`;
    }

    html += '</div>';
    this.calendarEl.innerHTML = html;

    // Event listeners
    this.calendarEl.querySelector('.cal-prev')?.addEventListener('click', () => {
      this.calMonth.month--;
      if (this.calMonth.month < 1) { this.calMonth.month = 12; this.calMonth.year--; }
      this.renderCalendar();
    });
    this.calendarEl.querySelector('.cal-next')?.addEventListener('click', () => {
      this.calMonth.month++;
      if (this.calMonth.month > 12) { this.calMonth.month = 1; this.calMonth.year++; }
      this.renderCalendar();
    });
    this.calendarEl.querySelectorAll('.cal-day.has-data').forEach(el => {
      el.addEventListener('click', () => {
        this.setDate(el.dataset.date);
      });
    });
  }
}
