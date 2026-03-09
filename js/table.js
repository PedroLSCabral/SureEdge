import { PAGE_SIZE } from './config.js';
import { fmtBRL } from './kpis.js';
import { filterRows } from './filters.js';

// ─── TABLE STATE ──────────────────────────────────────────────────────────────
export const tableState = {
  sort: { col: 'data', asc: false },
  currentPage: 1,
};

// ─── STATUS BADGE CLASS ───────────────────────────────────────────────────────
function badgeClass(status) {
  return {
    'Green':      'green',
    'Meio Green': 'meio-green',
    'Red':        'red',
    'Meio Red':   'meio-red',
    'Devolvido':  'devolvido',
    // Legados (compatibilidade)
    'Ganhou': 'green', 'Perdeu': 'red', 'Anulada': 'devolvido',
  }[status] || 'pending';
}

// ─── RENDER TABLE ────────────────────────────────────────────────────────────
let _onEdit = null;
export function setEditCallback(fn) { _onEdit = fn; }

export function renderTable(rows) {
  const query = document.getElementById('tableSearch')?.value.toLowerCase() || '';

  let display = rows.filter(r =>
    !query || [r.casa, r.esporte, r.evento, r.status].join(' ').toLowerCase().includes(query)
  );

  // Sort
  display.sort((a, b) => {
    let av = a[tableState.sort.col], bv = b[tableState.sort.col];
    if (tableState.sort.col === 'data') { av = a._date; bv = b._date; }
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    return tableState.sort.asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const total = display.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const page  = Math.min(tableState.currentPage, pages || 1);
  const slice = display.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text3)">
      Nenhuma operação encontrada</td></tr>`;
  } else {
    tbody.innerHTML = slice.map(r => `
      <tr>
        <td>${r.data}</td>
        <td>
          <span style="color:var(--text)">${r._legs[0].casa}</span>
          <span style="color:var(--text3);font-size:11px;margin:0 4px">×</span>
          <span style="color:var(--text)">${(r._legs[1] || r._legs[0]).casa}</span>
        </td>
        <td style="color:var(--text2)">${r.esporte}</td>
        <td>
          <a class="evento-link" href="https://www.sofascore.com/search/${encodeURIComponent(r.evento)}" target="_blank" rel="noopener noreferrer">${r.evento}</a>
          <div style="color:var(--text3);font-size:11px;margin-top:2px">${r.mercado}</div>
        </td>
        <td style="font-family:var(--mono)">${fmtBRL(r.stake)}</td>
        <td style="font-family:var(--mono);color:var(--text3)">${r.odd}</td>
        <td style="font-family:var(--mono);color:${r.arb < 0 ? 'var(--red)' : 'var(--text2)'}">
          ${r.arb ? r.arb.toFixed(2) + '%' : '–'}
        </td>
        <td class="${r.lucro > 0 ? 'profit-pos' : r.lucro < 0 ? 'profit-neg' : ''}"
            style="${r.lucro === 0 && r.status !== 'Pendente' ? 'color:var(--text3)' : ''}">
          ${r.status === 'Pendente' && r.lucroEstimado !== null
            ? `<span class="lucro-estimado" title="Lucro estimado (média das pernas)">~${fmtBRL(r.lucroEstimado)}</span>`
            : fmtBRL(r.lucro)
          }
        </td>
        <td><span class="status-badge ${badgeClass(r.status)}">${r.status}</span></td>
        <td>${r.status === 'Pendente' ? `<button class="btn-edit" data-ts="${r.data}">Editar</button>` : ''}</td>
      </tr>
    `).join('');
  }

  // Bind edit buttons
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (_onEdit) _onEdit(btn.dataset.ts);
    });
  });

  document.getElementById('tableCount').textContent = `${total} operações`;
  document.getElementById('tablePag').textContent   = pages > 1 ? `Página ${page} de ${pages}` : '';

  // Sort arrows
  document.querySelectorAll('thead th[data-col]').forEach(th => {
    th.classList.toggle('sorted', th.dataset.col === tableState.sort.col);
    const arrow = th.querySelector('.sort-arrow');
    if (!arrow) return;
    arrow.textContent = th.dataset.col === tableState.sort.col
      ? (tableState.sort.asc ? '↑' : '↓')
      : '↕';
  });
}

// ─── BIND SORT HEADERS ───────────────────────────────────────────────────────
export function bindTableSort(getAllRows) {
  document.querySelectorAll('thead th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (tableState.sort.col === col) tableState.sort.asc = !tableState.sort.asc;
      else { tableState.sort.col = col; tableState.sort.asc = true; }
      renderTable(filterRows(getAllRows()));
    });
  });
}