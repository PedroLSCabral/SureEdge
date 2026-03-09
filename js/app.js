import { AUTO_REFRESH_MS } from './config.js';
import { initAuth, signIn, isSignedIn } from './auth.js';
import { storageGet, storageSet } from './storage.js';
import { extractSpreadsheetId, findOperationRows, writeResults } from './editor.js';
import { setEditCallback } from './table.js';
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
let spreadsheetId = null;
let sheetUrl     = localStorage.getItem('surebetSheetUrl') || null;
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
    localStorage.setItem('surebetSheetUrl', url);
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


// ─── AUTH UI ─────────────────────────────────────────────────────────────────
function onSignedIn() {
  const btn = document.getElementById('btnLogin');
  if (btn) { btn.classList.add('signed-in'); document.getElementById('btnLoginLabel').textContent = 'Conectado'; }
}

// ─── EDITOR ───────────────────────────────────────────────────────────────────
function initEditor() {
  // Login button
  document.getElementById('btnLogin')?.addEventListener('click', () => {
    if (isSignedIn()) return;
    signIn();
  });

  // Close modal
  document.getElementById('btnModalClose')?.addEventListener('click', closeEditModal);
  document.getElementById('editOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('editOverlay')) closeEditModal();
  });

  // Save spreadsheet ID
  document.getElementById('btnSaveSheetId')?.addEventListener('click', () => {
    const url = document.getElementById('sheetEditUrlInput').value.trim();
    const id  = extractSpreadsheetId(url);
    if (!id) { alert('URL inválida. Use a URL de edição da planilha (contém /spreadsheets/d/…)'); return; }
    spreadsheetId = id;
    storageSet('surebetSpreadsheetId', id);
    document.getElementById('sheetIdSection').style.display = 'none';
  });

  // Confirm edit
  document.getElementById('btnConfirmEdit')?.addEventListener('click', confirmEdit);

  // Winner option selection
  document.getElementById('winnerOptions')?.addEventListener('click', e => {
    const opt = e.target.closest('.winner-option');
    if (!opt) return;
    document.querySelectorAll('.winner-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input[type="radio"]').checked = true;
    const val = opt.querySelector('input').value;
    const typeCol = document.getElementById('resultTypeCol');
    if (val === 'void') {
      typeCol.style.opacity = '.35';
      typeCol.style.pointerEvents = 'none';
      document.getElementById('btnConfirmEdit').disabled = false;
    } else {
      typeCol.style.opacity = '1';
      typeCol.style.pointerEvents = 'auto';
      // Only enable confirm if result type also selected
      const hasType = document.getElementById('resultTypeTrigger').dataset.value;
      document.getElementById('btnConfirmEdit').disabled = !hasType;
    }
  });

  // Custom select dropdown
  document.getElementById('winnerOptions')?.addEventListener('click', e => {
    const trigger = e.target.closest('#resultTypeTrigger');
    const option  = e.target.closest('.custom-select-option');

    if (trigger) {
      document.getElementById('resultTypeDropdown').classList.toggle('open');
      return;
    }
    if (option) {
      const val = option.dataset.value;
      document.getElementById('resultTypeLabel').textContent = val;
      document.getElementById('resultTypeTrigger').dataset.value = val;
      document.getElementById('resultTypeDropdown').classList.remove('open');

      // Show color dot in trigger
      const dotClass = { Green: 'green', 'Meio Green': 'meio-green', Red: 'red', 'Meio Red': 'meio-red' }[val];
      document.getElementById('resultTypeLabel').innerHTML =
        `<span class="result-dot ${dotClass}"></span> ${val}`;

      // Enable confirm if leg also selected
      const hasWinner = document.querySelector('input[name="winner"]:checked');
      document.getElementById('btnConfirmEdit').disabled = !hasWinner;
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#resultTypeSelect')) {
      document.getElementById('resultTypeDropdown')?.classList.remove('open');
    }
  });

  // Edit callback from table
  setEditCallback(openEditModal);

  // Restore saved spreadsheet ID
  const savedId = storageGet('surebetSpreadsheetId');
  if (savedId) spreadsheetId = savedId;
}

let _editOperation = null;

function openEditModal(timestamp) {
  if (!isSignedIn()) {
    signIn();
    return;
  }

  const op = allRows.find(r => r.data === timestamp);
  if (!op) return;
  _editOperation = op;

  // Populate modal
  document.getElementById('modalEvent').textContent = op.evento;
  document.getElementById('modalMeta').textContent  = `${op.data} · ${op.esporte}`;

  // Spreadsheet ID section
  document.getElementById('sheetIdSection').style.display = spreadsheetId ? 'none' : 'block';

  // Legs
  const legsGrid = document.getElementById('legsGrid');
  legsGrid.innerHTML = op._legs.map((leg, i) => `
    <div class="leg-card">
      <div class="leg-label">Perna ${i + 1}</div>
      <div class="leg-casa">${leg.casa}</div>
      <div class="leg-info">${leg.mercado || '–'}</div>
      <div class="leg-info" style="margin-top:4px">Odd ${leg.odd} · Stake ${leg.stake}</div>
    </div>
  `).join('');

  // Winner options
  const opts = document.getElementById('winnerOptions');
  opts.innerHTML = `
    <div class="result-row">
      <div class="result-col">
        <div class="modal-section-label" style="margin-bottom:8px">Qual perna bateu?</div>
        ${op._legs.map((leg, i) => `
          <label class="winner-option">
            <input type="radio" name="winner" value="${i}">
            <div>
              <div class="winner-option-label">Perna ${i + 1} — ${leg.casa}</div>
              <div class="winner-option-sub">${leg.mercado || ''} · Odd ${leg.odd}</div>
            </div>
          </label>
        `).join('')}
        <label class="winner-option">
          <input type="radio" name="winner" value="void">
          <div>
            <div class="winner-option-label">Devolvido (ambas)</div>
            <div class="winner-option-sub">Push, cancelamento ou walkover</div>
          </div>
        </label>
      </div>
      <div class="result-col" id="resultTypeCol" style="opacity:.35;pointer-events:none">
        <div class="modal-section-label" style="margin-bottom:8px">Tipo de resultado</div>
        <div class="custom-select" id="resultTypeSelect">
          <div class="custom-select-trigger" id="resultTypeTrigger">
            <span id="resultTypeLabel">Selecionar…</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="custom-select-dropdown" id="resultTypeDropdown">
            <div class="custom-select-option" data-value="Green">
              <span class="result-dot green"></span> Green
            </div>
            <div class="custom-select-option" data-value="Meio Green">
              <span class="result-dot meio-green"></span> Meio Green
            </div>
            <div class="custom-select-option" data-value="Red">
              <span class="result-dot red"></span> Red
            </div>
            <div class="custom-select-option" data-value="Meio Red">
              <span class="result-dot meio-red"></span> Meio Red
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Reset state
  document.getElementById('btnConfirmEdit').disabled = true;
  setModalStatus('');

  document.getElementById('editOverlay').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editOverlay').style.display = 'none';
  _editOperation = null;
}

async function confirmEdit() {
  if (!_editOperation || !spreadsheetId) return;

  const selected = document.querySelector('input[name="winner"]:checked');
  if (!selected) return;

  const winnerVal = selected.value;
  const btn = document.getElementById('btnConfirmEdit');
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  setModalStatus('Buscando linhas na planilha…');

  try {
    const foundRows = await findOperationRows(spreadsheetId, _editOperation.data);

    if (foundRows.length === 0) {
      setModalStatus('Linhas não encontradas na planilha. Verifique se a URL de edição está correta.', 'err');
      btn.disabled = false; btn.textContent = 'Confirmar resultado';
      return;
    }

    // Monta resultados por perna
    let legResults;
    if (winnerVal === 'void') {
      legResults = foundRows.map(() => 'Devolvido');
    } else {
      const winnerIndex = parseInt(winnerVal);
      const resultType  = document.getElementById('resultTypeTrigger').dataset.value;
      const opposite    = { 'Green': 'Red', 'Meio Green': 'Meio Red', 'Red': 'Green', 'Meio Red': 'Meio Green' };
      legResults = foundRows.map((_, i) =>
        i === winnerIndex ? resultType : (opposite[resultType] || 'Red')
      );
    }

    setModalStatus('Escrevendo resultados…');
    await writeResults(spreadsheetId, foundRows, legResults);

    setModalStatus('✓ Salvo com sucesso! Atualizando dashboard…', 'ok');

    // Refresh data
    setTimeout(async () => {
      closeEditModal();
      if (sheetUrl) await loadAndRender(sheetUrl);
    }, 1200);

  } catch (err) {
    setModalStatus('Erro: ' + err.message, 'err');
    btn.disabled = false;
    btn.textContent = 'Confirmar resultado';
  }
}

function setModalStatus(msg, type = '') {
  const el = document.getElementById('modalStatus');
  el.textContent  = msg;
  el.className    = 'modal-status' + (type ? ' ' + type : '');
}

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
  initTheme(() => { if (allRows.length) renderDashboard(allRows); });
  initAuth(onSignedIn);
  initEditor();
  bindEvents();

  if (sheetUrl) {
    document.getElementById('sheetUrlInput').value = sheetUrl;
    loadAndRender(sheetUrl);
  }
}

init();