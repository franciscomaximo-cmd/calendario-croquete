# Redesenho Violeta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a paleta Violeta, a fonte Poppins nos títulos e efeitos discretos ao calendário e ao admin, sem mudar funcionalidade.

**Architecture:** Site estático (HTML/CSS/JS sem build). Todas as cores ficam no bloco `:root` de `style.css` (`light-dark()`), partilhado por `index.html` e `admin.html`. A Poppins é servida a partir de `fonts/` no próprio projeto. Os efeitos são CSS; o JS só marca o botão acabado de tocar.

**Tech Stack:** HTML, CSS (`light-dark()`, `@font-face`), JS do navegador; verificação com Playwright MCP e `impeccable detect`; script de contraste em Python.

**Spec:** `docs/superpowers/specs/2026-11-25-redesign-violeta-design.md`

## Global Constraints

- Só aspeto: nenhum texto, fluxo ou dado muda. Única linha de JS nova: pôr a classe `pop` no botão acabado de tocar.
- Cores só no bloco `:root` de `style.css`.
- Tokens (claro · escuro): `--bg` `#ffffff` · `#0f1020`; `--surface` `#f4f1fd` · `#181a2e`; `--ink` `#131627` · `#f2f0fb`; `--mute` `#565a6e` · `#b3b1c8`; `--edge` `#858aa0` · `#7c7c96`; `--band` `#6f00fd` · `#6f00fd`; `--bandink` `#ffffff` · `#ffffff`; `--brand` `#6f00fd` · `#a983ff`; `--yes` `#0a4230` · `#1f7a55`; `--yesink` `#ffffff` · `#ffffff`; `--yestxt` `#0a4230` · `#5cd6a0`; `--maybe` `#ffd21f` · `#f2c94c`; `--maybeink` `#131627` · `#131627`; `--maybeedge` `#8a6a00` · `#f2c94c`; `--no` `#c62828` · `#d32f2f`; `--noink` `#ffffff` · `#ffffff`; `--erro` `#b3261e` · `#ff8a80`.
- Contraste: texto ≥ 4,5:1; contornos e preenchimentos de estado ≥ 3:1 contra `--bg` e `--surface`; `--yes` vs `--maybe` ≥ 3:1; faixa do escuro ≥ 2:1 contra `--bg`.
- Poppins auto-alojada: só os pesos usados (700 e 800), subconjunto latin, `font-display: swap`, licença OFL incluída. Nenhum pedido a fonts.googleapis.com.
- Animações ≤ 250 ms, nunca bloqueiam cliques, e são desligadas com `prefers-reduced-motion: reduce`.
- Não mexer em `config.js` nem em `*.sql`. Tudo no ramo `redesign`; não juntar ao `main` antes de o dono ver as capturas.
- Testes no navegador nunca chegam ao Supabase real: rota Playwright que responde aos GET com dados de teste e às escritas com 201 sem sair do navegador.

## Review Focus

- Tema escuro do sistema: cada estado e o texto do Livre por escolher têm de se ler (Task 1 mede no escuro).
- Melhor dia que calha num sábado/domingo com Talvez escolhido: o amarelo tem de se ver (Task 1 verifica esse dia).
- Pessoa com movimento reduzido ligado: nenhuma animação corre (Task 3 verifica `animation-name: none`).
- Realtime a redesenhar a grelha: a animação de "pop" não se repete em todos os botões escolhidos, só no tocado (Task 3).
- Fonte ainda a carregar ou bloqueada: o texto aparece logo na fonte do sistema (swap) e nada se desalinha (Task 2 verifica `font-display` e transbordos).

---

### Task 1: Tokens Violeta e papéis de cor

**Files:**
- Modify: `style.css` (bloco `:root`; regras de `.best .t a`, `::selection`, `.day.top`, `.pick button.y`, `.pick button[aria-pressed=true].m`, `.chip.m`, `.bar .m`, `.toast`/`.warn`/`.tag` que usavam `--maybe` como cor de destaque)
- Test: script `paletas/check.py` (scratchpad) com os tokens acima + medição Playwright

**Interfaces:**
- Produces: tokens `--brand`, `--yestxt`, `--maybeedge` (além dos existentes; `--best` deixa de existir).

- [ ] **Step 1:** Screenshots "antes" a 390×844 e 1280×800, claro e escuro, com dados de teste (Marta: Livre, Talvez num sábado melhor-dia, Ocupado com motivo).
- [ ] **Step 2:** Substituir os valores do `:root` pelos da Global Constraints; acrescentar `--brand`, `--yestxt`, `--maybeedge`; apagar `--best`.
- [ ] **Step 3:** Papéis: `.day.top` = fundo `--surface` + `box-shadow: inset 4px 0 0 var(--brand)`; sublinhado da data do melhor dia e `::selection` em `--brand`; Livre por escolher com `color: var(--yestxt)`; Talvez escolhido e `.chip.m` com contorno `--maybeedge`; segmento Talvez da barra com cor visível contra o fundo da barra; `.warn` e `.tag` do admin deixam o amarelo de identidade.
- [ ] **Step 4:** Verificar: Playwright lê as cores calculadas dos pares da Global Constraints nos dois temas e calcula os rácios; todos ≥ mínimos. Screenshots "depois" nos 4 modos; sem scroll horizontal; nenhum botão a transbordar a 320/390.
- [ ] **Step 5:** Commit `colorize: paleta Violeta com estados verde, amarelo e vermelho`.

### Task 2: Poppins nos títulos (auto-alojada)

**Files:**
- Create: `fonts/poppins-latin-700-normal.woff2`, `fonts/poppins-latin-800-normal.woff2`, `fonts/OFL.txt`
- Modify: `style.css` (`@font-face` ×2 no topo; `--display` token; usar em `h1`, `.best .t`, `.wk h2`, `.ola h2`)

**Interfaces:**
- Consumes: nada. Produces: token `--display: "Poppins", var(--font)`.

- [ ] **Step 1:** Descarregar os dois `.woff2` e a OFL de `@fontsource/poppins` (versão fixa) para `fonts/`.
- [ ] **Step 2:** `@font-face { font-family: "Poppins"; font-weight: 700|800; font-display: swap; src: url(fonts/…) format("woff2") }`.
- [ ] **Step 3:** Aplicar `--display` aos títulos listados; corpo continua em `--font`.
- [ ] **Step 4:** Verificar com Playwright: `document.fonts.check('800 20px Poppins')` true depois de carregar; nenhum pedido a `fonts.googleapis.com`/`gstatic`; h1 e data do melhor dia sem transbordo a 390; screenshots nos 4 modos.
- [ ] **Step 5:** Commit `typeset: Poppins auto-alojada nos títulos`.

### Task 3: Efeitos discretos

**Files:**
- Modify: `style.css` (bloco de movimento), `app.js` (`setDia`: depois do `render()`, pôr `pop` no botão `.pick button[data-k=k][data-v=v]`)

**Interfaces:**
- Consumes: `setDia(k, v)` existente.

- [ ] **Step 1:** CSS: transição de `background-color`, `border-color`, `color` em botões (150 ms ease-out); `@keyframes pop` (escala 0.94 → 1, 200 ms) só em `.pick button.pop`; ✓ desenhado com `stroke-dasharray` em `.pop .ok` (200 ms); entrada de `.band > .wrap` (opacidade 0→1 + 8 px, 250 ms, uma vez). Tudo dentro de `@media (prefers-reduced-motion: no-preference)`.
- [ ] **Step 2:** JS: em `setDia`, a seguir ao primeiro `render()`, adicionar a classe `pop` ao botão tocado (se existir e estiver escolhido).
- [ ] **Step 3:** Verificar com Playwright: depois de tocar em Livre de um dia, só esse botão tem `pop`; um redesenho (evento `input` no `#nick`) não põe `pop` noutros; com `reducedMotion: 'reduce'` o `animation-name` calculado é `none`; marcar continua a gravar (pedido POST interceptado).
- [ ] **Step 4:** Commit `animate: efeitos discretos ao marcar, passar o rato e abrir`.

### Task 4: Polish e audit

**Files:** os que os achados indicarem (`style.css`, `index.html`, `admin.html`).

- [ ] **Step 1:** `impeccable detect --json index.html admin.html app.js` e polish/audit do Impeccable sobre `index.html`; corrigir achados reais (falsos positivos conhecidos: `repeated-container-text` na grelha).
- [ ] **Step 2:** Admin: login e lista com dados simulados a 390 e 1280, claro e escuro; sem transbordos.
- [ ] **Step 3:** Commit `polish: acabamento e acessibilidade do redesenho`.

### Task 5: Documentação e capturas finais

**Files:**
- Modify: `DESIGN.md` (tabela de cores, tipo, componentes afetados, movimento), `PRODUCT.md` (Brand Commitments: "prático e claro, com alguma personalidade")

- [ ] **Step 1:** Atualizar os dois ficheiros com as decisões desta spec.
- [ ] **Step 2:** Capturas finais do calendário e do admin a 390 e 1280, claro e escuro; mostrar ao dono.
- [ ] **Step 3:** Commit `docs: DESIGN.md e PRODUCT.md do redesenho Violeta`. Push do ramo `redesign` só se o dono pedir; não juntar ao `main` antes de ele ver as capturas.
