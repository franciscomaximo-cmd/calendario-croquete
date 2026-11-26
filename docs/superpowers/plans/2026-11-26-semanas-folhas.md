# Semanas como bloco de folhas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar uma semana de cada vez como folha de um bloco de destacar, mudando de semana com um page curl ligado ao dedo, sem mudar a lógica de dados.

**Architecture:** Um motor novo, `folhas.js` (global `window.Folhas`), trata da geometria da dobra, do gesto (Pointer Events), da mola, das setas/teclado e dos indicadores. `app.js` continua a gerar o HTML das semanas, agora como folhas, e chama o motor; o `render()` guarda a folha visível e espera enquanto há gesto ou animação. A camada do verso e as zonas de agarrar vivem fora do que o `render()` reconstrói.

**Tech Stack:** HTML/CSS/JS sem build; Pointer Events; transforms (camadas rodadas com `overflow:hidden` e matriz de reflexão); verificação com o Playwright da sessão (fora do repositório) e os testes Python em `tests/`.

**Spec:** `docs/superpowers/specs/2026-11-26-semanas-folhas-design.md` · Protótipo de referência (código a portar): `scratchpad/enrolar/enrolar.html` (versão 2, https://claude.ai/artifact/8ZGNzgvw9GiTTkKGVRrvH5)

## Global Constraints

- Lógica de dados, gravação, notas, nomes, melhor dia e tempo real não mudam; textos existentes não mudam (exceto "Mostrar mais 4 semanas" → "Ver mais semanas").
- Sem bibliotecas; sem canvas/WebGL. Não mexer em `config.js` nem em `*.sql`.
- Durante o gesto só mudam `transform` e `opacity`; folha parada sem `transform`.
- `prefers-reduced-motion: reduce`: sem dobra nem animação; gesto e setas mudam de semana de imediato.
- Regra de direção: esquerda ou para cima avança; direita ou para baixo volta (a anterior entra pela margem onde se começou); direção predominante nas diagonais; ressalto (máx. 32 px) na primeira semana ao voltar e na última ao avançar.
- Zonas: margens 32 px, cantos 56 px; conteúdo da folha com margem 34 px (58 px em baixo); nenhuma zona tapa botões; um gesto nunca conta como toque.
- Valores do protótipo: mola k=240, amortecimento 30; avança com q > 0,28 (q > 0,5 a partir do lado oposto) ou > 700 px/s; volta completa com 45% ou > 600 px/s.
- Cores só no `:root` de `style.css`; token novo `--verso: light-dark(#eeeaf8,#1f2238)`.
- Barra de navegação fixa em baixo (sticky, com `env(safe-area-inset-bottom)`): setas 44 px, pontinhos (até 12 folhas), "Semana x de N" (`aria-live="polite"`), "Ver mais semanas" só na última folha (acrescenta 4 e avança para a primeira nova).
- Ao mudar de folha: se o topo do bloco estiver fora do ecrã, a página sobe até ele (suave; sem animação com movimento reduzido).
- Testes do folhear fora do repositório (Playwright da sessão); `tests/test_*.py` continuam verdes.

## Review Focus

- Campo do motivo aberto e com foco numa folha quando chega um redesenho ou se muda de folha: o texto escrito não se perde e o foco não fica numa folha `inert` (Task 2).
- Teclas ← → com o foco no campo do nome ou do motivo: escrevem, não mudam de folha (Task 1).
- Rato no computador: arrastar uma zona não seleciona texto da página e não deixa a folha presa se o botão for largado fora da janela (Task 1).
- "Ver mais semanas" com um gesto ou animação a decorrer: não se perde nem duplica semanas (Task 2).
- O aviso "Guardado." continua a não tapar o campo do motivo dentro da folha (Task 2).

---

### Task 1: Bloco, folhas e motor do folhear

**Files:**
- Create: `folhas.js`
- Modify: `index.html` (secção do bloco no lugar de `#weeks`/`#more`; `<script src="folhas.js">` antes de `app.js`)
- Modify: `style.css` (token `--verso`; bloco, lombada, espessura, folha, dobra, zonas, barra fixa)
- Modify: `app.js` (cada semana passa a ser uma folha: `article.folha.wk[data-i]` com `.clip > .conteudo`, `.vinco`, `.sombra-baixo`; chamar o motor)
- Modify: `tests/test_tokens.py` (`'verso': ('#eeeaf8', '#1f2238')` em `VIOLETA`)

**Interfaces:**
- Produces (global `window.Folhas`):
  - `montar(caixa: HTMLElement, opcoes: { aoMudar(i: number): void, aoAcabar(): void }): void` — `caixa` é `#caixa` (contém `#weeks`, `.aba`, `.zonas`); `aoAcabar` é chamado quando termina um gesto ou animação.
  - `atual(): number` — índice da folha visível.
  - `irPara(i: number, opcoes?: { animar?: boolean }): void` — uma só dobra mesmo que salte várias folhas (a de destino fica por baixo).
  - `ocupado(): boolean` — `true` durante gesto ou animação.
  - `refazer(): void` — reaplica visibilidade, `inert`, z-index e indicadores depois de `#weeks` ser reconstruído.
- Marcação que `app.js` gera por semana: `<article class="folha wk" data-i="{n}" role="group" aria-label="{título}" tabindex="-1"><div class="clip"><div class="conteudo">{header + .days atuais}</div><div class="vinco"></div></div><div class="sombra-baixo"></div></article>`.
- Marcação em `index.html`: `section.bloco#bloco[aria-label="Semanas"] > .lombada + #caixa(.folhas-caixa) > (#weeks.folhas + .aba#aba > .aba-clip > .aba-papel > .aba-curva) + .zonas#zonas(8 × i[data-z]) ` e `nav.barra#barra` com `#ant`, `#pontos`, `#qual`, `#seg`, `#more`.

- [ ] **Step 1:** Screenshots "antes" a 390×844 e 1280×800, claro e escuro, com dados de teste (rota Playwright: GET devolve dados, escritas respondem 201 sem sair do browser).
- [ ] **Step 2 (teste a falhar):** `python -I tests/test_tokens.py` com `verso` acrescentado → FAIL (`--verso` em falta). Script Playwright `.playwright-mcp/folhas-matriz.js` (fora do git): a partir da semana 2, cada zona `t,b,l,r,tl,tr,bl,br` × `esquerda,cima` → semana 3 e × `direita,baixo` → semana 1; semana 1 + direita → fica 1; última + esquerda → fica na última; `←`/`→` mudam; `→` com foco em `#nick` não muda; nenhuma zona sobrepõe `.pick button` (0) a 320/390/1280; folha visível sem `transform` em repouso; com `reducedMotion: 'reduce'` nenhuma `.folha.dobrar` durante o gesto. Correr → FAIL (não há bloco).
- [ ] **Step 3:** Portar do protótipo para `folhas.js` a geometria (`meioPlano`, `desenhar`, `extensao`), a mola, o gesto (regra de direção, `frente`/`frente-v`/`tras`/`ressalto`, `alcance` até à borda do ecrã) e as setas/teclado, expondo a interface acima; `user-select:none` nas zonas; `pointercancel` e `lostpointercapture` largam o gesto. CSS do protótipo adaptado aos tokens do site; barra `position:sticky; bottom:0`. `app.js`: gerar a marcação por semana e chamar `Folhas.montar` uma vez e `Folhas.refazer()` no fim de cada `render()`.
- [ ] **Step 4:** Correr `tests/test_*.py` → OK; script de matriz → tudo como esperado; screenshots "depois" nos 4 modos.
- [ ] **Step 5:** Commit `feat: semanas como bloco de folhas a enrolar`.

### Task 2: Integração com os dados e a navegação

**Files:**
- Modify: `app.js` (`render`, ligações do melhor dia, `#more`, destaque, scroll ao topo, foco)
- Modify: `style.css` (`.day.destaque`)

**Interfaces:**
- Consumes: `Folhas.montar/atual/irPara/ocupado/refazer` (Task 1).

- [ ] **Step 1 (teste a falhar):** Script `.playwright-mcp/folhas-dados.js`: (a) na semana 3, um redesenho (evento `input` em `#nick`) mantém "Semana 3"; (b) durante um gesto a meio, um redesenho não estraga a dobra e corre quando o gesto acaba (o texto escrito no `#nick` aparece no fim); (c) marcar Livre em folhas 1, 2 e 4 envia POST com o dia certo; (d) clicar "Melhor dia" numa semana diferente leva a essa folha, o dia fica com `.destaque` e perde-a ~1,5 s depois, e o dia fica visível no ecrã; (e) na última folha "Ver mais semanas" está visível, acrescenta 4 pontinhos e avança para a primeira nova; nas outras folhas está escondido; (f) com o campo do motivo focado, um redesenho mantém o texto e o foco; ao mudar de folha o foco vai para a folha nova; (g) com a página descida até domingo, avançar sobe até ao topo do bloco; (h) o aviso "Guardado." não tapa o campo do motivo aberto no fundo do ecrã. Correr → FAIL.
- [ ] **Step 2:** `render()`: se `Folhas.ocupado()`, marcar `renderPendente = true` e sair; `aoAcabar` corre o render pendente. Guardar e repor `Folhas.atual()` (o `refazer()` já o faz). Ligações `a[href^="#d-"]` do melhor dia: `preventDefault`, `Folhas.irPara(semanaDoDia)`, depois `scrollIntoView({block:'center'})` do dia e classe `.destaque` por 1500 ms via `setTimeout`. `#more`: `weeksShown += 4; render(); Folhas.irPara(antigoTotal)`. `aoMudar`: se o topo de `#bloco` estiver acima do ecrã, `scrollIntoView({block:'start'})` (suave só sem movimento reduzido) e foco na folha nova (`focus({preventScroll:true})`).
- [ ] **Step 3:** `.day.destaque{box-shadow:inset 0 0 0 2px var(--brand)}` (sem animação).
- [ ] **Step 4:** Correr o script de dados e o de matriz → OK; `tests/test_*.py` → OK.
- [ ] **Step 5:** Commit `feat: folhas ligadas aos dados, ao melhor dia e a "Ver mais semanas"`.

### Task 3: Acabamento, audit e documentação

**Files:**
- Modify: os que o audit indicar; `.impeccable/design-full.md` (secções Componentes e Movimento: bloco, folha, barra, dobra); `PRODUCT.md` (Capabilities: "uma semana de cada vez, como folhas de um bloco; 'Ver mais semanas' acrescenta 4").

- [ ] **Step 1:** `impeccable detect --json index.html app.js folhas.js` e `/impeccable audit` sobre `index.html`; corrigir achados reais.
- [ ] **Step 2:** Atualizar `design-full.md` e `PRODUCT.md`.
- [ ] **Step 3:** Correr os dois scripts Playwright e `tests/test_*.py`; capturas finais a 390 e 1280, claro e escuro (incluindo uma a meio da dobra); mostrar ao dono. Não juntar ao `main` antes de ele ver.
- [ ] **Step 4:** Commit `polish: bloco de folhas — audit e documentação`.
