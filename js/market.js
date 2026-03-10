// ─── MARKET DASHBOARD ─────────────────────────────────────────────────────────
// Standalone ES Module for market.html — same pattern as analysis.html inline script.
// Fetches stats from FastAPI VPS and renders charts + KPIs.

import { MARKET_API_URL } from './config.js';
import { initTheme } from './theme.js';

// ── PALETTE (mirrors charts.js) ──────────────────────────────────────────────
const PALETTE = {
  light: { green:'#00a854',greenDim:'#00a85418',red:'#e0253a',redDim:'#e0253a14',blue:'#1a6fd4',blueDim:'#1a6fd418',yellow:'#c08000',text3:'#9098b0',grid:'#e2e4ea',surface2:'#f0f1f5' },
  slate: { green:'#2ecc85',greenDim:'#2ecc8520',red:'#f04058',redDim:'#f0405820',blue:'#5b9cf6',blueDim:'#5b9cf620',yellow:'#e8b840',text3:'#565e78',grid:'#363c52',surface2:'#262b3d' },
  dark:  { green:'#00e87a',greenDim:'#00e87a22',red:'#ff3d5a',redDim:'#ff3d5a22',blue:'#4d9fff',blueDim:'#4d9fff22',yellow:'#f0c040',text3:'#4a5068',grid:'#1e2230',surface2:'#171b28' },
};

function clr(key) {
  const t = document.documentElement.getAttribute('data-theme') || 'slate';
  return (PALETTE[t] || PALETTE.slate)[key];
}

// ── STATE ────────────────────────────────────────────────────────────────────
const charts = {};
let marketData = null;
let retryTimer = null;

const RETRY_INTERVAL = 30_000; // 30s
const FETCH_TIMEOUT  = 10_000; // 10s

// ── HELPERS ──────────────────────────────────────────────────────────────────
function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── FETCH DATA ───────────────────────────────────────────────────────────────
async function fetchEndpoint(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${MARKET_API_URL}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMarketData() {
  hideError();
  showLoading(true);

  try {
    const [casas, horarios, roi, esportes] = await Promise.all([
      fetchEndpoint('/stats/casas'),
      fetchEndpoint('/stats/horarios'),
      fetchEndpoint('/stats/roi'),
      fetchEndpoint('/stats/esportes'),
    ]);
    marketData = { casas, horarios, roi, esportes };
    clearRetry();
    onDataReady();
  } catch (err) {
    console.error('Market fetch failed:', err);
    showError(err.message);
    scheduleRetry();
  } finally {
    showLoading(false);
  }
}

// ── LOADING / ERROR STATE ────────────────────────────────────────────────────
function showLoading(on) {
  const bar = document.getElementById('loadingBar');
  if (bar) bar.style.width = on ? '70%' : '0';
}

function showError(msg) {
  const el = document.getElementById('marketError');
  if (el) el.style.display = 'block';
  set('marketErrorMsg', `Não foi possível conectar à API: ${msg}`);
  document.getElementById('mainContent')?.querySelectorAll('.card')
    .forEach(c => c.style.display = 'none');
}

function hideError() {
  const el = document.getElementById('marketError');
  if (el) el.style.display = 'none';
  document.getElementById('mainContent')?.querySelectorAll('.card')
    .forEach(c => c.style.display = '');
}

function scheduleRetry() {
  let remaining = RETRY_INTERVAL / 1000;
  set('marketRetryCountdown', `Tentando novamente em ${remaining}s…`);
  retryTimer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearRetry();
      fetchMarketData();
    } else {
      set('marketRetryCountdown', `Tentando novamente em ${remaining}s…`);
    }
  }, 1000);
}

function clearRetry() {
  if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }
}

// ── DATA READY → RENDER ─────────────────────────────────────────────────────
function onDataReady() {
  const { casas, horarios, roi, esportes } = marketData;

  const totalOps = casas.reduce((s, c) => s + c.count, 0) / 2; // each op counted in 2 casas
  const avgRoi = roi.length ? roi.reduce((s, r) => s + r.avg_roi, 0) / roi.length : 0;
  const topCasa = casas.length ? casas[0].casa : '–';

  // Peak hour
  let peakLabel = '–';
  if (horarios.length) {
    const peak = horarios.reduce((a, b) => b.count > a.count ? b : a);
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    peakLabel = `${dias[peak.dia]} ${String(peak.hora).padStart(2,'0')}h`;
  }

  set('kpiTotal', Math.round(totalOps).toLocaleString('pt-BR'));
  set('kpiAvgRoi', avgRoi.toFixed(2).replace('.', ',') + '%');
  set('kpiTopCasa', topCasa);
  set('kpiPeakHour', peakLabel);

  document.getElementById('syncDot').className = 'sync-dot ok';
  set('syncLabel', 'Conectado');

  renderCharts();
}

function renderCharts() {
  if (!marketData) return;
  renderCasasFreq();
  renderRoiCasas();
  renderEsportes();
  renderHorarios();
}

// ── CHART: Casas Frequency ───────────────────────────────────────────────────
function renderCasasFreq() {
  destroyChart('casasFreq');
  const data = marketData.casas.slice(0, 12);
  if (!data.length) return;

  charts['casasFreq'] = new Chart(document.getElementById('chartCasasFreq'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.casa),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: clr('blueDim'),
        borderColor: clr('blue'),
        borderWidth: 1.5, borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: clr('grid') } },
        y: { grid: { display: false } },
      },
    },
  });
}

// ── CHART: ROI by Casa ───────────────────────────────────────────────────────
function renderRoiCasas() {
  destroyChart('roiCasas');
  const data = marketData.roi.slice(0, 12);
  if (!data.length) return;

  charts['roiCasas'] = new Chart(document.getElementById('chartRoiCasas'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.casa),
      datasets: [{
        data: data.map(d => d.avg_roi),
        backgroundColor: data.map(d => d.avg_roi >= 0 ? clr('greenDim') : clr('redDim')),
        borderColor: data.map(d => d.avg_roi >= 0 ? clr('green') : clr('red')),
        borderWidth: 1.5, borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: clr('grid') }, ticks: { callback: v => v + '%' } },
        y: { grid: { display: false } },
      },
    },
  });
}

// ── CHART: Esportes (doughnut) ───────────────────────────────────────────────
function renderEsportes() {
  destroyChart('esportes');
  const data = marketData.esportes.slice(0, 8);
  if (!data.length) return;

  const colors = ['#2ecc85','#5b9cf6','#e8b840','#f04058','#8b5cf6','#f97316','#06b6d4','#ec4899'];

  charts['esportes'] = new Chart(document.getElementById('chartEsportesMarket'), {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.esporte),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: colors.slice(0, data.length).map(c => c + '44'),
        borderColor: colors.slice(0, data.length),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, padding: 12, usePointStyle: true } },
      },
    },
  });
}

// ── CHART: Heatmap (matrix plugin) ───────────────────────────────────────────
function renderHorarios() {
  destroyChart('horarios');
  const raw = marketData.horarios;
  if (!raw.length) return;

  const maxCount = Math.max(...raw.map(r => r.count), 1);
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  // Build matrix data: { x: day, y: hour, v: count }
  const matrixData = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const found = raw.find(r => r.dia === d && r.hora === h);
      matrixData.push({ x: dias[d], y: h, v: found ? found.count : 0 });
    }
  }

  charts['horarios'] = new Chart(document.getElementById('chartHorarios'), {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Oportunidades',
        data: matrixData,
        backgroundColor(ctx) {
          const v = ctx.dataset.data[ctx.dataIndex]?.v || 0;
          if (v === 0) return clr('surface2');
          const ratio = v / maxCount;
          // Interpolate opacity — base 0.15 → 1.0
          const alpha = Math.round((0.15 + ratio * 0.85) * 255).toString(16).padStart(2, '0');
          return clr('green').slice(0, 7) + alpha;
        },
        borderColor: clr('grid'),
        borderWidth: 1,
        width: ({ chart }) => (chart.chartArea?.width || 200) / 7 - 2,
        height: ({ chart }) => (chart.chartArea?.height || 200) / 24 - 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: {
          type: 'category',
          labels: dias,
          grid: { display: false },
          offset: true,
        },
        y: {
          type: 'linear',
          min: 0, max: 23,
          reverse: true,
          grid: { display: false },
          ticks: { stepSize: 1, callback: v => String(v).padStart(2, '0') + 'h' },
          offset: true,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: () => '',
            label(ctx) {
              const d = ctx.raw;
              return `${d.x} ${String(d.y).padStart(2,'0')}h — ${d.v} oportunidade${d.v !== 1 ? 's' : ''}`;
            },
          },
        },
      },
    },
  });
}

// ── INIT ─────────────────────────────────────────────────────────────────────
initTheme(() => { if (marketData) renderCharts(); });
fetchMarketData();
