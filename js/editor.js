import { getToken } from './auth.js';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

// ─── EXTRAIR SPREADSHEET ID ───────────────────────────────────────────────────
export function extractSpreadsheetId(url) {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// ─── REQUISIÇÃO AUTENTICADA ───────────────────────────────────────────────────
async function sheetsRequest(path, method = 'GET', body = null) {
  const token = getToken();
  if (!token) throw new Error('Não autenticado. Faça login novamente.');

  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(`${SHEETS_API}/${path}`, opts);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ─── LISTAR ABAS ─────────────────────────────────────────────────────────────
async function getSheets(spreadsheetId) {
  const data = await sheetsRequest(`${spreadsheetId}?fields=sheets.properties`);
  return data.sheets.map(s => s.properties.title);
}

// ─── NORMALIZAR TIMESTAMP ─────────────────────────────────────────────────────
// Remove espaços extras e segundos (:SS) para comparação tolerante.
// Ex: "07/03/2026 14:32:00" e "07/03/2026 14:32" → "07/03/2026 14:32"
function normalizeTs(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')           // espaços múltiplos → um
    .replace(/(\d{2}:\d{2}):\d{2}$/, '$1'); // remove :SS do final
}

// ─── BUSCAR LINHAS POR TIMESTAMP ─────────────────────────────────────────────
// Varre todas as abas mensais (exclui TOTAL) procurando as pernas pelo timestamp.
// Retorna [{ sheet, rowIndex, statusColLetter }]
export async function findOperationRows(spreadsheetId, timestamp) {
  const tsNorm = normalizeTs(timestamp);

  const sheets = await getSheets(spreadsheetId);
  const targets = sheets.filter(s => s.toLowerCase() !== 'total');

  const results = [];

  for (const sheet of targets) {
    // Usa A:Z (sem número) — a Sheets API aceita colunas abertas
    const range    = `${sheet}!A:Z`;
    const encoded  = encodeURIComponent(range);
    let data;
    try {
      data = await sheetsRequest(`${spreadsheetId}/values/${encoded}`);
    } catch { continue; }

    const rows = data.values || [];
    if (rows.length < 2) continue;

    // Encontra a linha de cabeçalho: primeira linha que contém algo parecido com "data"
    let headerRowIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const low = rows[i].map(h => String(h || '').toLowerCase().trim());
      if (findCol(low, ['data aposta','data_aposta','data','timestamp','data/hora']) !== -1) {
        headerRowIdx = i;
        headers = low;
        break;
      }
    }
    if (headerRowIdx === -1) continue;

    const dataCol   = findCol(headers, ['data aposta','data_aposta','data','timestamp','data/hora']);
    const statusCol = findCol(headers, ['resultado','status','result']);
    if (dataCol === -1 || statusCol === -1) continue;

    // Varre linhas de dados (após o cabeçalho)
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const cellVal = normalizeTs(rows[i][dataCol] || '');
      if (cellVal && cellVal === tsNorm) {
        results.push({
          sheet,
          rowIndex:        i + 1,   // 1-based para a Sheets API
          statusColLetter: colLetter(statusCol),
        });
      }
    }

    // Se já achou 2 pernas, pode parar (surebet sempre tem 2)
    if (results.length >= 2) break;
  }

  return results;
}

// ─── ESCREVER RESULTADO ───────────────────────────────────────────────────────
export async function writeResults(spreadsheetId, foundRows, legResults) {
  const data = foundRows.map((r, i) => ({
    range:  `${r.sheet}!${r.statusColLetter}${r.rowIndex}`,
    values: [[legResults[i]]],
  }));

  await sheetsRequest(`${spreadsheetId}/values:batchUpdate`, 'POST', {
    valueInputOption: 'USER_ENTERED',
    data,
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function findCol(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function colLetter(index) {
  let s = '', n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}