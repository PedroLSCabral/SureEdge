// ─── DEMO DATA ────────────────────────────────────────────────────────────────
// Gera ~90 dias de operações fictícias para preview sem planilha conectada.
export function generateDemo() {
  const casas    = ['Betano', 'Bet365', 'KTO', 'Sportingbet', 'Pixbet', 'Novibet', 'Pinnacle', 'Betfast'];
  const esportes = ['Futebol', 'Tênis', 'Basquete', 'Vôlei', 'E-sports', 'Futebol Americano'];
  const eventos  = {
    Futebol:            ['Flamengo x Palmeiras', 'Chelsea x Arsenal', 'Brasil x Argentina', 'Real Madrid x Barcelona'],
    Tênis:              ['Djokovic x Alcaraz', 'Swiatek x Gauff', 'Sinner x Medvedev'],
    Basquete:           ['Lakers x Bulls', 'Celtics x Warriors'],
    Vôlei:              ['Brasil x Itália', 'São Paulo x Minas'],
    'E-sports':         ['FURIA x NAVI', 'Team Liquid x G2'],
    'Futebol Americano':['Chiefs x Eagles', 'Cowboys x Packers'],
  };
  const mercados = ['Time1 Win', 'Time2 Win', 'AH1 (+0.5)', 'AH2 (-1.5)', 'TU (0.5)', 'TO (0.5)'];
  const rows = [];
  const now  = new Date();

  for (let i = 90; i >= 0; i--) {
    const n = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < n; j++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));

      const esp   = esportes[Math.floor(Math.random() * esportes.length)];
      const stake = +(50 + Math.random() * 450).toFixed(2);
      const arb   = +(1 + Math.random() * 4).toFixed(2);
      const lucro = +(stake * arb / 100).toFixed(2);
      const casa1 = casas[Math.floor(Math.random() * casas.length)];
      let   casa2 = casas[Math.floor(Math.random() * casas.length)];
      while (casa2 === casa1) casa2 = casas[Math.floor(Math.random() * casas.length)];

      const dataStr = d.toLocaleDateString('pt-BR') + ' '
        + String(d.getHours()).padStart(2,'0') + ':'
        + String(d.getMinutes()).padStart(2,'0') + ':00';

      const baseRow = {
        data: dataStr, _date: d,
        esporte: esp,
        evento:  eventos[esp][Math.floor(Math.random() * eventos[esp].length)],
        mercado: mercados[Math.floor(Math.random() * mercados.length)],
        odd:     +(1.5 + Math.random() * 2).toFixed(2),
        arb, status: 'Ganhou',
      };

      // Perna 1
      rows.push({ ...baseRow, casa: casa1, stake: +(stake * 0.55).toFixed(2), lucro });
      // Perna 2
      rows.push({ ...baseRow, casa: casa2, stake: +(stake * 0.45).toFixed(2), lucro: 0 });
    }
  }

  return rows;
}
