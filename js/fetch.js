import { CORS_PROXIES } from './config.js';
import { csvToRows } from './parser.js';
import { showError } from './app.js';

// ─── URL NORMALIZER ───────────────────────────────────────────────────────────
// Aceita qualquer forma de URL do Google Sheets e converte para CSV público.
export function extractCsvUrl(url) {
  url = url.trim();
  if (url.includes('output=csv')) return url;
  if (url.includes('/pub')) {
    return url.split('#')[0] + (url.includes('?') ? '&' : '?') + 'output=csv&single=true';
  }
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  const gid = (url.match(/[#&]gid=(\d+)/) || [])[1] || '0';
  return `https://docs.google.com/spreadsheets/d/${m[1]}/pub?gid=${gid}&single=true&output=csv`;
}

// ─── FETCH WITH CORS FALLBACK ────────────────────────────────────────────────
// Tenta cada proxy em sequência até obter um CSV válido.
async function tryFetch(url) {
  // Cache-busting: evita que o Google sirva versão antiga
  const cacheBust = url + (url.includes('?') ? '&' : '?') + `_cb=${Date.now()}`;

  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy(cacheBust));
      if (!resp.ok) continue;
      const text = await resp.text();
      // Recebeu HTML → provavelmente página de login ou erro
      if (text.trim().startsWith('<')) continue;
      return text;
    } catch { continue; }
  }
  return null;
}

// ─── MAIN FETCH ───────────────────────────────────────────────────────────────
export async function fetchSheet(url) {
  const csvUrl = extractCsvUrl(url);
  if (!csvUrl) {
    showError('URL inválida. Copie o link direto da planilha do Google Sheets.');
    return null;
  }

  document.getElementById('syncLabel').textContent = 'Conectando…';

  const text = await tryFetch(csvUrl);
  if (!text) {
    showError(
      'Não foi possível carregar a planilha.\n\n' +
      'Causa provável: a planilha não está publicada publicamente.\n' +
      'Solução: Arquivo → Compartilhar → Publicar na web → aba TOTAL → CSV → Publicar.\n\n' +
      'Alternativa: abra o HTML via Live Server (VSCode) para evitar bloqueio CORS local.'
    );
    return null;
  }

  const rows = csvToRows(text);
  if (!rows || rows.length === 0) {
    showError(
      'Planilha carregada mas sem dados reconhecidos.\n' +
      'Verifique se o cabeçalho está na linha 1 da aba TOTAL:\n' +
      'DATA APOSTA | CASA | ESPORTE | EVENTO | MERCADO | ODD | STAKE | % | RESULTADO | LUCRO'
    );
    return null;
  }

  return rows;
}
