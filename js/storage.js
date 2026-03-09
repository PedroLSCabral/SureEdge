// Wrapper seguro para localStorage.
// Tracking Prevention (Edge/Safari) pode bloquear acesso ao storage de terceiros,
// lançando exceção. Esse módulo absorve o erro e faz fallback para memória.

const _mem = {};

export function storageGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
  catch { return _mem[key] ?? fallback; }
}

export function storageSet(key, value) {
  try { localStorage.setItem(key, value); }
  catch { _mem[key] = value; }
}

// ─── SHEET DATA CACHE (sessionStorage) ───────────────────────────────────────
// Mantém os dados da planilha em cache durante a sessão do browser.
// Ao navegar entre páginas, não precisa re-buscar o CSV.
// sessionStorage é limpo ao fechar a aba — sem dados desatualizados.

const CACHE_KEY = 'surebetDataCache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function saveCache(rows) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      rows,
    }));
  } catch { /* sessionStorage indisponível — sem cache */ }
}

export function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, rows } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null; }
    // Restaura _date como objeto Date (JSON serializa como string)
    rows.forEach(r => {
      r._date = new Date(r._date);
      if (r._legs) r._legs.forEach(l => { if (l._date) l._date = new Date(l._date); });
    });
    return rows;
  } catch { return null; }
}

export function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}