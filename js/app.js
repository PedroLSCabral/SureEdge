import { AUTO_REFRESH_MS } from './config.js';
import { storageGet, storageSet } from './storage.js';
import { csvToRows, groupLegs } from './parser.js';
import { fetchSheet } from './fetch.js';
import { generateDemo } from './demo.js';
import { filterRows, filterState, populateMonths } from './filters.js';
import { updateKPIs } from './kpis.js';
import { chartLucroAcumulado, chartEsporte, chartCasa, chartStatus } from './charts.js';
import { renderTable, bindTableSort, tableState } from './table.js';
import { initTheme } from './theme.js';

// ─── STATE ────────────────────────────────────────────────────────────────────
let allRows      = [];
let sheetUrl     = storageGet('surebetSheetUrl');
let refreshTimer = null;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function showError(msg) {
  const el = document.getElementById('setupError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideError() {
  const el = document.getElementById('setupError');
  if (el) el.style.display = 'none';
}

function setLoading(on) {
  const bar = document.getElementById('loadingBar');
  if (!bar) return;
  bar.style.width = on ? '70%' : '100%';
  if (!on) setTimeout(() => { bar.style.width = '0'; }, 400);
}

function setSyncOk(label) {
  document.getElementById('syncDot').className  = 'sync-dot ok';
  document.getElementById('syncLabel').textContent = label;
}

// ─── RENDER PIPELINE ─────────────────────────────────────────────────────────
function renderDashboard(rows) {
  const period = filterRows(rows);
  updateKPIs(period);
  chartLucroAcumulado(period);
  chartEsporte(period);
  chartCasa(period);
  chartStatus(period);
  renderTable(period);
}

// ─── LOAD & RENDER ────────────────────────────────────────────────────────────
async function loadAndRender(url, demo = false) {
  setLoading(true);
  hideError();

  let rows;
  if (demo) {
    rows = generateDemo();
  } else {
    rows = await fetchSheet(url);
  }

  setLoading(false);

  if (!rows?.length) return;

  allRows = groupLegs(rows);
  document.getElementById('setupOverlay').style.display = 'none';
  document.getElementById('mainContent').style.display  = 'block';
  setSyncOk(demo ? 'Demo ativo' : 'Sincronizado');

  populateMonths(allRows);
  renderDashboard(allRows);

  if (document.getElementById('autoRefreshToggle')?.classList.contains('on') && sheetUrl) {
    startAutoRefresh();
  }
}

// ─── AUTO-REFRESH ─────────────────────────────────────────────────────────────
function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(async () => {
    if (sheetUrl) await loadAndRender(sheetUrl);
  }, AUTO_REFRESH_MS);
}

function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function bindEvents() {
  // Setup: conectar planilha
  document.getElementById('btnConnect')?.addEventListener('click', async () => {
    const url = document.getElementById('sheetUrlInput').value.trim();
    if (!url) return;
    sheetUrl = url;
    storageSet('surebetSheetUrl', url);
    await loadAndRender(url);
  });

  // Setup: demo
  document.getElementById('btnDemo')?.addEventListener('click', () =>
    loadAndRender(null, true)
  );

  // Atualizar dados
  document.getElementById('btnRefresh')?.addEventListener('click', async () => {
    if (!sheetUrl) return;
    document.getElementById('syncDot').className    = 'sync-dot';
    document.getElementById('syncLabel').textContent = 'Atualizando…';
    await loadAndRender(sheetUrl);
  });

  // Filtros de período
  document.getElementById('periodTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.period-tab');
    if (!tab) return;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const mode = tab.dataset.mode;
    document.getElementById('filterMonth').style.display  = 'none';
    document.getElementById('filterCustom').style.display = 'none';

    if (mode === 'month') {
      filterState.mode = 'month';
      populateMonths(allRows);
      document.getElementById('filterMonth').style.display = 'flex';
      filterState.activeMonth = document.getElementById('monthSelect').value;
    } else if (mode === 'custom') {
      filterState.mode = 'custom';
      document.getElementById('filterCustom').style.display = 'flex';
      const to = new Date(), from = new Date();
      from.setDate(from.getDate() - 30);
      document.getElementById('dateFrom').value = from.toISOString().slice(0, 10);
      document.getElementById('dateTo').value   = to.toISOString().slice(0, 10);
      filterState.customFrom = from;
      filterState.customTo   = to;
    } else {
      filterState.mode         = 'days';
      filterState.activePeriod = +tab.dataset.days;
    }
    tableState.currentPage = 1;
    renderDashboard(allRows);
  });

  // Seletor de mês
  document.getElementById('monthSelect')?.addEventListener('change', function () {
    filterState.activeMonth = this.value;
    tableState.currentPage  = 1;
    renderDashboard(allRows);
  });

  // Intervalo personalizado
  document.getElementById('btnApply')?.addEventListener('click', () => {
    const f = document.getElementById('dateFrom').value;
    const t = document.getElementById('dateTo').value;
    if (!f || !t) return;
    filterState.customFrom = new Date(f);
    filterState.customTo   = new Date(t);
    filterState.customTo.setHours(23, 59, 59);
    tableState.currentPage = 1;
    renderDashboard(allRows);
  });

  // Busca na tabela
  document.getElementById('tableSearch')?.addEventListener('input', () => {
    tableState.currentPage = 1;
    renderTable(filterRows(allRows));
  });

  // Auto-refresh toggle
  document.getElementById('autoRefreshToggle')?.addEventListener('click', function () {
    this.classList.toggle('on');
    this.classList.contains('on') && sheetUrl ? startAutoRefresh() : stopAutoRefresh();
  });

  // Sort colunas da tabela
  bindTableSort(() => allRows);
}

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
  initTheme(() => { if (allRows.length) renderDashboard(allRows); });
  bindEvents();

  if (sheetUrl) {
    if (sheetUrl) document.getElementById('sheetUrlInput').value = sheetUrl;
    loadAndRender(sheetUrl);
  }
}

init();