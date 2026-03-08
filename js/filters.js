// ─── FILTER STATE ─────────────────────────────────────────────────────────────
export const filterState = {
  mode:        'days',   // 'days' | 'month' | 'custom'
  activePeriod: 7,
  activeMonth:  null,
  customFrom:   null,
  customTo:     null,
};

// ─── FILTER ROWS ─────────────────────────────────────────────────────────────
export function filterRows(rows) {
  const { mode, activePeriod, activeMonth, customFrom, customTo } = filterState;

  if (mode === 'days') {
    if (!activePeriod) return rows;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - activePeriod);
    return rows.filter(r => r._date >= cutoff);
  }

  if (mode === 'month' && activeMonth) {
    const [y, m] = activeMonth.split('-').map(Number);
    return rows.filter(r =>
      r._date.getFullYear() === y && r._date.getMonth() === m - 1
    );
  }

  if (mode === 'custom' && customFrom && customTo) {
    return rows.filter(r => r._date >= customFrom && r._date <= customTo);
  }

  return rows;
}

// ─── POPULATE MONTH SELECTOR ──────────────────────────────────────────────────
export function populateMonths(rows) {
  const months = {};
  for (const r of rows) {
    const y = r._date.getFullYear();
    const m = r._date.getMonth() + 1;
    const key   = `${y}-${String(m).padStart(2, '0')}`;
    const label = r._date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months[key] = label;
  }

  const sel = document.getElementById('monthSelect');
  sel.innerHTML = Object.entries(months)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join('');

  filterState.activeMonth = sel.value;
}
