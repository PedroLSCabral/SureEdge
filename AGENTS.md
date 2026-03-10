# SureEdge — Agent Context

## O que é o projeto
Dashboard pessoal de rastreamento de operações de arbitragem esportiva (surebets).
Roda inteiramente no browser via GitHub Pages — sem servidor, sem build step.

- **Repo:** https://github.com/pedrolscabral/SureEdge
- **Live:** https://pedrolscabral.github.io/SureEdge/

---

## Stack

**Frontend**
- Vanilla JS com ES Modules (`type="module"`)
- Chart.js via CDN (gráficos)
- PapaParse via CDN (parse de CSV)
- CSS custom properties para temas (light / slate / dark)
- Sem framework, sem bundler, sem npm

**Dados**
- Google Sheets publicado como CSV (leitura)
- Google Sheets API v4 com OAuth2 GIS (escrita de resultados)
- sessionStorage como cache com TTL de 5 minutos

**Infra**
- GitHub Pages (hospedagem estática)
- Oracle VPS — em construção: userbot Telegram + SQLite + FastAPI

---

## Estrutura de arquivos

```
sureedge/
├── index.html          — dashboard principal
├── analysis.html       — análise histórica (gráficos por dia, esporte, mês)
├── market.html         — em construção: análise de mercado via bot Telegram
├── perf-test.html      — suite de testes de performance do pipeline de dados
├── assets/
│   ├── favicon.png
│   └── logo.png
├── css/
│   └── style.css       — todos os estilos, temas via CSS custom properties
└── js/
    ├── app.js          — orquestração, eventos, auth UI, modal de edição
    ├── auth.js         — Google OAuth2 GIS, sessionStorage persistence
    ├── charts.js       — Chart.js: lucro acumulado, esporte, casa, status
    ├── config.js       — COL_MAP, PAGE_SIZE, AUTO_REFRESH_MS, CORS_PROXIES
    ├── demo.js         — geração de dados demo
    ├── editor.js       — escrita de resultados via Sheets API v4
    ├── fetch.js        — fetch do CSV com fallback de proxies CORS
    ├── filters.js      — filterState, filterRows, populateMonths
    ├── kpis.js         — updateKPIs, fmtBRL
    ├── parser.js       — mapHeaders, parseDate, parseNum, parseStatus, csvToRows, groupLegs
    ├── storage.js      — storageGet/storageSet, saveCache/loadCache/clearCache
    ├── table.js        — renderTable, bindTableSort, paginação
    └── theme.js        — applyTheme, initTheme
```

---

## Modelo de dados

**Linha crua (csvToRows):**
```js
{
  data, _date, casa, esporte, evento, mercado,
  stake, odd, arb, lucro,
  status // 'Green' | 'Meio Green' | 'Red' | 'Meio Red' | 'Devolvido' | 'Pendente'
}
```

**Operação agrupada (groupLegs):**
```js
{
  data, _date, esporte, evento,
  casa,    // "Betfast × Pinnacle"
  mercado, // "AH1 / AH2"
  odd,     // "1.71 / 2.61"
  arb, stake, lucro, lucroEstimado,
  status,
  _legs    // array com as linhas cruas
}
```

Cada surebet tem 2 linhas na planilha agrupadas pelo timestamp exato (`data`).

---

## Convenções de código

- Imports ES Module no topo de cada arquivo — sem circular imports
- Funções exportadas individualmente, sem default exports
- `storageGet`/`storageSet` sempre no lugar de `localStorage` direto (try-catch seguro)
- Erros de fetch tratados via callback `onError` passado como parâmetro
- Nenhuma lógica de negócio em `app.js` — apenas orquestração
- CSS: variáveis de tema em `:root[data-theme]`, nunca cores hardcoded no JS exceto em `charts.js` via `clr()`

---

## Regras de UI

- Font size mínimo: 15px body, 13px labels, nunca abaixo de 12px
- Temas: slate (padrão), light, dark — sempre testar nos três
- Mobile: breakpoint em 768px, charts contidos com `overflow: hidden` + `min-width: 0` nos grids
- Novos cards seguem o padrão `.card` existente em `style.css`

---

## Instruções de commit

Após cada alteração funcional completa, faça commit automaticamente:

```
git add .
git commit -m "tipo(escopo): descrição em inglês"
git push
```

Padrão de tipos: `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`

Exemplos:
- `feat(market): add FastAPI endpoint for casa frequency stats`
- `fix(parser): handle missing odd field in telegram message`
- `perf(fetch): reduce CSV size by filtering empty rows`

Commite a cada feature ou correção isolada — não agrupe mudanças não relacionadas num commit só.
Faça `git push` ao final de cada sessão ou quando solicitado explicitamente.

---

## O que NÃO fazer

- Não usar `localStorage` diretamente — sempre via `storageGet`/`storageSet`
- Não criar imports circulares — `app.js` importa tudo, nada importa `app.js`
- Não adicionar dependências via npm — apenas CDN em `<script>` tags
- Não usar `!important` no CSS exceto para forçar contenção de canvas Chart.js
- Não hardcodar cores fora de `charts.js`
- Não usar `toLocaleDateString` como chave de agrupamento — gera inconsistências entre browsers

---

## Próxima feature — market.html (análise de mercado)

Objetivo: capturar todas as oportunidades detectadas pelo bot de surebets (independente de serem apostadas) para análise estatística de mercado — quais casas aparecem mais, horários de pico, ROI médio por casa, esportes mais frequentes.

### Arquitetura

**VPS Oracle** — 4 arquivos Python:
- `telethon_listener.py` — userbot Telethon escutando DMs do `@greensurebet_bot` em tempo real
- `parser.py` — extrai campos da mensagem via regex + gera `dedup_key`
- `database.py` — SQLite com `INSERT OR IGNORE` na `dedup_key`
- `api.py` — FastAPI com CORS aberto expondo os endpoints de estatísticas
- Processo mantido vivo via serviço systemd

**SureEdge** — nova página `market.html` consumindo a API

### Formato da mensagem do bot

```
🟣 Bot GreenSurebet (@greensurebet_bot)

🏘 Casas: Betfast x Pinnacle
💰 LUCRO: 3.31%

➡ Cadenasso, Gianluca - Monteiro, Thiago
➡ Gianluca Cadenasso - Thiago Monteiro

🏆 Tênis / Challenger. Santiago, Chile
🏆 Tênis / ATP Challenger Santiago - R1

⏰ Data: 10/03 12:20
⏰ Data: 10/03 10:00

🟡 Betfast: @1.71  - Link direto
✅ Aposta: AH1 (+4.5)
✅ Descrição: Asian Handicap1 (+4.5)

🟡 Pinnacle: @2.61  - Link direto
✅ Aposta: AH2 (-4.5)
✅ Descrição: Asian Handicap2 (-4.5)
```

Uma mensagem por oportunidade agrupando as duas pernas.

### Deduplicação

O bot frequentemente envia a mesma oportunidade repetida com pequenas variações (ordem das casas invertida, descrição de mercado ligeiramente diferente). A deduplicação usa:

```python
dedup_key = sha256(casas_ordenadas + evento_normalizado + data_evento + odd1 + odd2)
```

- **casas ordenadas:** `sorted([casa1, casa2])` — evita "Betfast x Pinnacle" vs "Pinnacle x Betfast"
- **evento normalizado:** lowercase + strip acentos + remover pontuação
- **odd1/odd2:** valores numéricos — identificador mais preciso de uma oportunidade específica

### Schema SQLite

```sql
CREATE TABLE opportunities (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at  DATETIME NOT NULL,
  casas        TEXT NOT NULL,
  casa1        TEXT NOT NULL,
  casa2        TEXT NOT NULL,
  roi          REAL NOT NULL,
  esporte      TEXT,
  competicao   TEXT,
  evento       TEXT,
  data_evento  TEXT,
  odd1         REAL,
  odd2         REAL,
  mercado1     TEXT,
  mercado2     TEXT,
  hora_chegada TEXT,
  dedup_key    TEXT UNIQUE
);
```

### Endpoints FastAPI

- `GET /stats/casas` — ranking de casas por frequência de aparição (individual, não par)
- `GET /stats/horarios` — contagem de oportunidades por hora do dia + dia da semana (para heatmap)
- `GET /stats/roi` — ROI médio por casa
- `GET /stats/esportes` — distribuição por esporte

Sem autenticação por enquanto (CORS aberto).

### Dashboard market.html — seções planejadas

Prioridade definida:
1. Casas que mais aparecem (barras horizontais, individual)
2. Heatmap de horários por dia da semana
3. ROI médio por casa (barras)
4. Distribuição por esporte (doughnut)

KPIs no topo: total de oportunidades captadas, ROI médio geral, casa mais frequente, horário de pico.