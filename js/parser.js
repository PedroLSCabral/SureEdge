import { COL_MAP } from './config.js';

// ─── HEADER MAPPING ───────────────────────────────────────────────────────────
export function mapHeaders(headers) {
  const map = {};
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const [key, aliases] of Object.entries(COL_MAP)) {
    for (const alias of aliases) {
      const idx = lower.indexOf(alias);
      if (idx !== -1) { map[key] = idx; break; }
    }
  }
  return map;
}

// ─── VALUE PARSERS ────────────────────────────────────────────────────────────
export function parseDate(str) {
  if (!str) return new Date(0);
  const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return new Date(str);
}

export function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d,.\-]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

export function parseStatus(v) {
  if (!v) return 'Pendente';
  const s = String(v).toLowerCase().trim();
  if (s === 'selecionar' || s === '' || s === '–' || s === '-') return 'Pendente';
  if (s.includes('gan') || s.includes('win') || s === 'w' || s === '1') return 'Ganhou';
  if (s.includes('perd') || s.includes('los') || s === 'l' || s === '0') return 'Perdeu';
  return 'Pendente';
}

// ─── CSV → ROW OBJECTS ────────────────────────────────────────────────────────
export function csvToRows(csv) {
  const results = Papa.parse(csv, { skipEmptyLines: true });
  if (!results.data || results.data.length < 2) return null;

  const headers = results.data[0];
  const map = mapHeaders(headers);
  if (Object.keys(map).length < 3) return null;

  const get = (row, key, fallback = '–') =>
    map[key] !== undefined ? row[map[key]] : fallback;

  // Filtra linhas sem DATA APOSTA antes de processar — elimina linhas vazias
  // de fórmulas que se estendem além dos dados reais (ex: dropdown de status)
  const dataColIdx = map['data'];
  const dataRows = dataColIdx !== undefined
    ? results.data.slice(1).filter(row => {
        const v = (row[dataColIdx] || '').trim();
        return v.length > 0 && v !== '–';
      })
    : results.data.slice(1);

  return dataRows.map(row => {
    const d = parseDate(get(row, 'data', ''));
    return {
      data:       get(row, 'data'),
      _date:      d,
      dataEvento: get(row, 'dataEvento'),
      casa:       get(row, 'casa'),
      esporte:    get(row, 'esporte'),
      evento:     get(row, 'evento'),
      mercado:    get(row, 'mercado'),
      stake:      parseNum(get(row, 'stake', 0)),
      odd:        parseNum(get(row, 'odd', 0)),
      arb:        parseNum(get(row, 'arb', 0)),
      lucro:      parseNum(get(row, 'lucro', 0)),
      status:     parseStatus(get(row, 'status', '')),
    };
  });
}

// ─── GROUP LEGS ───────────────────────────────────────────────────────────────
// Cada surebet tem 2 linhas (pernas) com o mesmo timestamp.
// Agrupa pelo timestamp exato e deriva status pelo lucro consolidado:
//   lucro > 0  → Ganhou
//   lucro < 0  → Perdeu
//   lucro = 0 + planilha resolvida → Anulada (void/handicap)
//   lucro = 0 + pendente           → Pendente
export function groupLegs(rows) {
  const ops = {};
  const order = [];

  for (const r of rows) {
    const key = r.data;
    if (!ops[key]) { ops[key] = []; order.push(key); }
    ops[key].push(r);
  }

  return order.map(key => {
    const legs = ops[key];
    const a = legs[0];

    const evento = legs.reduce((best, l) =>
      l.evento.length > best.length ? l.evento : best, '');
    const lucro  = +legs.reduce((s, l) => s + l.lucro, 0).toFixed(2);
    const stake  = +legs.reduce((s, l) => s + l.stake, 0).toFixed(2);
    const arb    = Math.max(...legs.map(l => l.arb));
    const rawResolved = legs.find(l => l.status !== 'Pendente');

    let status;
    if      (lucro > 0)      status = 'Ganhou';
    else if (lucro < 0)      status = 'Perdeu';
    else if (rawResolved)    status = 'Anulada';
    else                     status = 'Pendente';

    // Lucro estimado para operações pendentes:
    // média do retorno líquido de cada perna se ela ganhar
    // ((Stake1 * Odd1) - StakeTotal + (Stake2 * Odd2) - StakeTotal) / 2
    let lucroEstimado = null;
    if (status === 'Pendente' && legs.length >= 2) {
      const sum = legs.reduce((s, l) => s + (l.stake * l.odd - stake), 0);
      lucroEstimado = +(sum / legs.length).toFixed(2);
    }

    return {
      data:     a.data,
      _date:    a._date,
      esporte:  a.esporte,
      evento,
      casa:     legs.map(l => l.casa).join(' × '),
      mercado:  legs.map(l => l.mercado).join(' / '),
      odd:      legs.map(l => l.odd).join(' / '),
      arb,
      stake,
      lucro,
      lucroEstimado,
      status,
      _legs:    legs,
    };
  });
}