import { fmtBRL } from './kpis.js';
import { filterState } from './filters.js';

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
Chart.defaults.font.family = "'Space Mono', monospace";
Chart.defaults.font.size   = 11;

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function gridColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-grid').trim();
}

// ─── LUCRO ACUMULADO ─────────────────────────────────────────────────────────
// ≤7 dias: granular por aposta + marcador de fechamento do dia
// >7 dias: agrupado por dia
export function chartLucroAcumulado(rows) {
  destroyChart('lucro');
  const sorted = [...rows].sort((a, b) => a._date - b._date);
  if (!sorted.length) return;

  const { mode, activePeriod } = filterState;
  const spanDays = sorted.length > 1
    ? (sorted[sorted.length - 1]._date - sorted[0]._date) / 86400000
    : 0;
  const granular = (mode === 'days' && activePeriod > 0 && activePeriod <= 7)
                || (mode !== 'days' && spanDays <= 7);

  const ctx  = document.getElementById('chartLucro').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 240);

  if (granular) {
    let acc = 0;
    const labels = [], dataAcc = [], ptColors = [], ptSizes = [];

    for (const r of sorted) {
      acc = +(acc + r.lucro).toFixed(2);
      const t = r.data.slice(-5);
      labels.push(r._date.toLocaleDateString('pt-BR').slice(0, 5) + ' ' + t);
      dataAcc.push(acc);
      ptColors.push(r.lucro >= 0 ? 'var(--green)' : 'var(--red)');
      ptSizes.push(r.lucro < 0 ? 6 : 4);
    }

    const isPos = dataAcc[dataAcc.length - 1] >= 0;
    grad.addColorStop(0, isPos ? 'rgba(0,168,84,0.13)' : 'rgba(224,37,58,0.10)');
    grad.addColorStop(1, 'transparent');

    // Marcadores de fim de dia
    const dayEndIdx = {};
    for (let i = 0; i < sorted.length; i++) {
      dayEndIdx[sorted[i]._date.toLocaleDateString('pt-BR')] = i;
    }
    const dayEndData = new Array(labels.length).fill(null);
    for (const idx of Object.values(dayEndIdx)) dayEndData[idx] = dataAcc[idx];

    const badge = document.getElementById('badgeTrend');
    if (badge) {
      badge.textContent = isPos ? '▲ alta' : '▼ queda';
      badge.style.color = isPos ? 'var(--green)' : 'var(--red)';
    }

    chartInstances['lucro'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [
        {
          label: 'Acum. por aposta',
          data: dataAcc,
          borderColor: isPos ? 'var(--green)' : 'var(--red)',
          backgroundColor: grad,
          borderWidth: 2,
          pointRadius: ptSizes,
          pointBackgroundColor: ptColors,
          pointBorderColor: ptColors,
          tension: 0.2, fill: true, order: 2,
        },
        {
          label: 'Fechamento do dia',
          data: dayEndData,
          borderColor: 'transparent',
          showLine: false,
          pointRadius: dayEndData.map(v => v !== null ? 8 : 0),
          pointStyle: 'rectRot',
          pointBackgroundColor: dayEndData.map(v =>
            v === null ? 'transparent' : v >= 0 ? 'var(--blue)' : 'var(--red)'
          ),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          order: 1,
        },
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 10, padding: 14, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => {
            if (ctx.datasetIndex === 1 && ctx.parsed.y === null) return null;
            return (ctx.datasetIndex === 0 ? ' Acum: ' : ' Dia: ') + fmtBRL(ctx.parsed.y);
          }}},
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 14, maxRotation: 30 } },
          y: { grid: { color: gridColor() }, ticks: { callback: v => 'R$' + v } },
        },
      },
    });

  } else {
    const byDay = {}, dayOrder = [];
    for (const r of sorted) {
      const k = r._date.toLocaleDateString('pt-BR');
      if (!byDay[k]) { byDay[k] = 0; dayOrder.push(k); }
      byDay[k] += r.lucro;
    }
    let acc = 0;
    const labels = [], data = [];
    for (const k of dayOrder) {
      acc = +(acc + byDay[k]).toFixed(2);
      labels.push(k);
      data.push(acc);
    }

    const isPos = data[data.length - 1] >= 0;
    grad.addColorStop(0, isPos ? 'rgba(0,168,84,0.13)' : 'rgba(224,37,58,0.10)');
    grad.addColorStop(1, 'transparent');

    const badge = document.getElementById('badgeTrend');
    if (badge) {
      badge.textContent = isPos ? '▲ alta' : '▼ queda';
      badge.style.color = isPos ? 'var(--green)' : 'var(--red)';
    }

    chartInstances['lucro'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{
        data,
        borderColor: isPos ? 'var(--green)' : 'var(--red)',
        backgroundColor: grad,
        borderWidth: 2,
        pointRadius: labels.length > 30 ? 0 : 3,
        pointBackgroundColor: isPos ? 'var(--green)' : 'var(--red)',
        tension: 0.35, fill: true,
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' ' + fmtBRL(ctx.parsed.y) } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
          y: { grid: { color: gridColor() }, ticks: { callback: v => 'R$' + v } },
        },
      },
    });
  }
}

// ─── POR ESPORTE ─────────────────────────────────────────────────────────────
export function chartEsporte(rows) {
  destroyChart('esporte');
  const map = {};
  for (const r of rows) map[r.esporte] = (map[r.esporte] || 0) + r.lucro;
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

  const badge = document.getElementById('badgeEsportes');
  if (badge) badge.textContent = `${sorted.length} modalidades`;

  const colors = ['#00a854', '#1a6fd4', '#c08000', '#e0253a', '#8b5cf6', '#f97316'];

  chartInstances['esporte'] = new Chart(document.getElementById('chartEsporte'), {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        data: sorted.map(s => +s[1].toFixed(2)),
        backgroundColor: colors.slice(0, sorted.length),
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtBRL(ctx.parsed)}` } },
      },
    },
  });
}

// ─── PERFORMANCE POR CASA ─────────────────────────────────────────────────────
export function chartCasa(rows) {
  destroyChart('casa');
  const map = {};
  for (const r of rows) {
    for (const leg of r._legs || [r]) {
      if (!map[leg.casa]) map[leg.casa] = { lucro: 0, count: 0 };
      map[leg.casa].lucro += r.lucro / (r._legs?.length || 1);
      map[leg.casa].count++;
    }
  }
  const sorted = Object.entries(map).sort((a, b) => b[1].lucro - a[1].lucro).slice(0, 10);

  const badge = document.getElementById('badgeCasas');
  if (badge) badge.textContent = `${sorted.length} casas`;

  const vals = sorted.map(s => +s[1].lucro.toFixed(2));

  chartInstances['casa'] = new Chart(document.getElementById('chartCasa'), {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        data: vals,
        backgroundColor: vals.map(v => v >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'),
        borderColor:     vals.map(v => v >= 0 ? 'var(--green)'     : 'var(--red)'),
        borderWidth: 1.5,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmtBRL(ctx.parsed.y) } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 30 } },
        y: { grid: { color: gridColor() }, ticks: { callback: v => 'R$' + v } },
      },
    },
  });
}

// ─── DISTRIBUIÇÃO DE RESULTADOS ───────────────────────────────────────────────
export function chartStatus(rows) {
  destroyChart('status');

  const counts = {};
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;

  const badge = document.getElementById('badgeStatus');
  if (badge) badge.textContent = `${rows.length} total`;

  const order  = ['Green', 'Meio Green', 'Red', 'Meio Red', 'Devolvido', 'Pendente'];
  const bgs    = ['#00a85418', '#5fcf8520', 'var(--red-dim)', '#e0708020', '#6a728a18', '#c0800022'];
  const border = ['#00a854',   '#5fcf85',   'var(--red)',     '#e07080',   'var(--text3)', 'var(--yellow)'];

  const active = order.filter(k => counts[k] > 0);

  chartInstances['status'] = new Chart(document.getElementById('chartStatus'), {
    type: 'doughnut',
    data: {
      labels: active,
      datasets: [{
        data:            active.map(k => counts[k]),
        backgroundColor: active.map(k => bgs[order.indexOf(k)]),
        borderColor:     active.map(k => border[order.indexOf(k)]),
        borderWidth: 1.5,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } },
      },
    },
  });
}