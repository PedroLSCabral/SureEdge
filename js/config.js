// ─── COLUMN MAPPING ──────────────────────────────────────────────────────────
// Aliases aceitos por campo. Case-insensitive, trim automático.
// Adicione aliases aqui se seu software usar nomes diferentes.
export const COL_MAP = {
  data:       ['data aposta', 'data_aposta', 'data', 'date', 'datetime', 'timestamp', 'data/hora'],
  dataEvento: ['data evento', 'data_evento', 'data do evento'],
  casa:       ['casa', 'bookmaker', 'bookie', 'casa de aposta', 'casa aposta'],
  esporte:    ['esporte', 'sport', 'modalidade'],
  evento:     ['evento', 'event', 'match', 'jogo', 'partida'],
  mercado:    ['mercado', 'market', 'mercado aposta'],
  stake:      ['stake', 'stakes', 'valor apostado', 'valor', 'investment', 'capital'],
  odd:        ['odd', 'odds', 'cotacao', 'cotação'],
  arb:        ['%', 'arb', 'arbitragem', 'arb%', 'profit%', 'margem'],
  // LUCRO mapeado antes de RESULTADO para evitar conflito de alias
  lucro:      ['lucro', 'profit', 'ganho', 'retorno', 'return'],
  status:     ['resultado', 'status', 'result'],
};

// ─── APP CONSTANTS ────────────────────────────────────────────────────────────
export const PAGE_SIZE       = 20;
export const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos

// CORS proxies tentados em sequência quando fetch direto falha (ex: file://)
export const CORS_PROXIES = [
  url => url,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];
