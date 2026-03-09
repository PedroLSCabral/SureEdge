// ─── FORMAT BRL ───────────────────────────────────────────────────────────────
export function fmtBRL(v) {
  const abs = Math.abs(v);
  const s   = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '-' : '') + 'R$' + s;
}

// ─── UPDATE KPI CARDS ────────────────────────────────────────────────────────
export function updateKPIs(rows) {
  const resolved   = rows.filter(r => r.status !== 'Pendente');
  const lucroTotal = rows.reduce((s, r) => s + r.lucro, 0);
  const stakeTotal = rows.reduce((s, r) => s + r.stake, 0);
  const roi        = stakeTotal > 0 ? (lucroTotal / stakeTotal * 100) : 0;
  const avgLucro   = rows.length > 0 ? lucroTotal / rows.length : 0;
  const bestRow    = [...rows].sort((a, b) => b.lucro - a.lucro)[0];

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setColor = (id, color) => { const el = document.getElementById(id); if (el) el.style.color = color; };

  set('kpiLucro',    fmtBRL(lucroTotal));
  setColor('kpiLucro', lucroTotal >= 0 ? 'var(--green)' : 'var(--red)');
  set('kpiLucroSub', `${rows.length} operações`);

  set('kpiRoi',    roi.toFixed(2).replace('.', ',') + '%');
  setColor('kpiRoi', roi >= 0 ? 'var(--blue)' : 'var(--red)');
  set('kpiRoiSub', `sobre ${fmtBRL(stakeTotal)}`);

  set('kpiStake',    fmtBRL(stakeTotal));
  set('kpiStakeSub', `${rows.length} stakes`);

  set('kpiAvg',    fmtBRL(avgLucro));
  set('kpiBest',   bestRow ? fmtBRL(bestRow.lucro) : 'R$0');
  set('kpiBestSub', bestRow ? (bestRow.casa || '–') : '–');
}