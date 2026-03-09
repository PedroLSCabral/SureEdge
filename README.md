# SureEdge Dashboard

Dashboard de análise para arbitragem esportiva (surebets), integrado com Google Sheets. Visualiza lucro acumulado, performance por casa e esporte, histórico de operações e métricas gerais.

## Funcionalidades

- **Integração com Google Sheets** via URL pública CSV — sem backend, sem banco de dados
- **Agrupamento automático de pernas**: cada operação de surebet (2 linhas na planilha) é unificada em uma linha no dashboard
- **Status derivado do lucro**: Ganhou / Perdeu / Anulada / Pendente calculados automaticamente
- **Gráfico granular** (≤7 dias): curva por aposta individual + marcadores de fechamento do dia
- **Filtros**: últimos 7/14/30/90 dias, por mês, ou intervalo personalizado
- **3 temas**: Claro, Slate (meio-termo) e Escuro
- **Auto-refresh** a cada 5 minutos (opcional)
- **Cache-busting** para garantir dados atualizados do Google Sheets

## Estrutura do projeto

```
sureedge/
├── index.html          # Entrada — HTML puro, sem framework
├── css/
│   └── style.css       # Todos os estilos + variáveis de tema
└── js/
    ├── config.js       # COL_MAP (mapeamento de colunas) e constantes
    ├── parser.js       # Parse de CSV, mapeamento de headers, groupLegs
    ├── fetch.js        # Fetch do Google Sheets com fallback CORS
    ├── filters.js      # Lógica de filtro por período/mês/intervalo
    ├── kpis.js         # Cálculo e renderização dos KPI cards
    ├── charts.js       # Gráficos Chart.js (lucro, esporte, casa, status)
    ├── table.js        # Tabela de histórico com sort e paginação
    ├── theme.js        # Troca de tema e persistência
    ├── demo.js         # Gerador de dados fictícios para preview
    └── app.js          # Orquestração, eventos e auto-refresh
```

## Como usar

### 1. Rodar localmente

O projeto usa ES Modules (`type="module"`), por isso **não funciona direto via `file://`**. Use um servidor local:

```bash
# Python (sem instalar nada)
python3 -m http.server 8080

# Node (via npx)
npx serve .

# VSCode: instale a extensão Live Server e clique em "Open with Live Server"
```

Acesse `http://localhost:8080`.

### 2. Configurar a planilha

A planilha deve ter uma aba com os seguintes cabeçalhos na **linha 1** (nomes exatos ou aliases — veja `js/config.js`):

| Campo         | Cabeçalho esperado (exemplos)                     |
|---------------|---------------------------------------------------|
| Data aposta   | `DATA APOSTA`, `data`, `timestamp`                |
| Casa          | `CASA`, `bookmaker`, `bookie`                     |
| Esporte       | `ESPORTE`, `sport`, `modalidade`                  |
| Evento        | `EVENTO`, `event`, `match`                        |
| Mercado       | `MERCADO`, `market`                               |
| Stake         | `STAKE`, `valor`, `investment`                    |
| Odd           | `ODD`, `odds`, `cotação`                          |
| Arb%          | `%`, `arb`, `arbitragem`, `margem`                |
| Lucro         | `LUCRO`, `profit`, `ganho`                        |
| Resultado     | `RESULTADO`, `status`, `result`                   |

> **Para múltiplas abas mensais:** crie uma aba `TOTAL` com a fórmula abaixo na célula A2 (cabeçalho em A1):
> ```
> ={DEZEMBRO!A5:K100; JANEIRO!A5:K100; FEVEREIRO!A5:K100; MARÇO!A5:K100; …}
> ```
> DEZEMBRO vem primeiro por ser do ano anterior.

### 3. Publicar no Google Sheets

1. **Arquivo → Compartilhar → Publicar na web**
2. Escolha a aba **TOTAL** → formato **CSV** → clique em **Publicar**
3. Copie o link gerado (contém `/pub?…output=csv`)
4. Cole no campo de configuração do dashboard e clique em **Conectar**

### 4. Deploy (opcional)

O projeto é estático — funciona em qualquer CDN ou hosting simples:

```bash
# GitHub Pages: basta habilitar Pages na raiz do repositório (branch main)

# Netlify / Vercel: arraste a pasta ou conecte o repositório
```

## Personalização

### Adicionar alias de coluna

Edite `js/config.js` e adicione o novo nome ao array do campo correspondente:

```js
export const COL_MAP = {
  stake: ['stake', 'stakes', 'valor apostado', 'meu_campo_customizado'],
  // ...
};
```

### Alterar intervalo do auto-refresh

Em `js/config.js`:

```js
export const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos → altere aqui
```

### Adicionar um novo tema

Em `css/style.css`, adicione um bloco `[data-theme="meutema"] { … }` seguindo o padrão dos temas existentes.

Em `js/theme.js`, adicione o novo tema ao array `THEMES`.

Em `index.html`, adicione um `<button class="theme-btn" data-theme="meutema">` no `.theme-switcher`.

## Dependências externas (CDN)

| Lib       | Versão | Uso                        |
|-----------|--------|----------------------------|
| Chart.js  | 4.4.1  | Todos os gráficos          |
| PapaParse | 5.4.1  | Parse de CSV               |
| Google Fonts | –   | Space Mono + Outfit        |

Nenhuma dependência de build. Nenhum `npm install`.

## Roadmap

- [ ] Heatmap de calendário (lucro por dia estilo GitHub contributions)
- [ ] Drawdown máximo
- [ ] Meta mensal com barra de progresso e projeção
- [ ] Exportar relatório PDF
- [ ] Scatter plot Arb% × Lucro real
- [ ] **Link direto para partida via Google Custom Search API** — busca automática em Sofascore/Flashscore pelo nome do evento (atualmente usa link de busca como placeholder)
- [ ] Integração com plataforma financeira pessoal (renda USD + Carnê-Leão)

## Licença

MIT