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