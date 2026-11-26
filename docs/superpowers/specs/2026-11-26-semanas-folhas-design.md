# Semanas como bloco de folhas a enrolar

Data: 2026-11-26 · Ramo: `semanas-deslizar` · Protótipo aprovado: https://claude.ai/artifact/8ZGNzgvw9GiTTkKGVRrvH5 (versão 2)

## Porquê

No telemóvel a página é muito comprida (~4 000 px com 6 semanas) e é chato descer à procura da semana. O dono quer também que pareça um calendário a sério e seja agradável de usar. Prático e claro continua a ser o principal.

## Objetivos

- Uma semana de cada vez, como folha de um **bloco de calendário de destacar** (lombada violeta picotada no topo, espessura do bloco por baixo), no estilo e cores Violeta.
- Mudar de semana **enrolando a folha** (page curl) com o dedo ou o rato, a partir de qualquer canto ou margem; setas e teclado ← → no computador com a mesma animação.
- Regra de direção: **esquerda ou para cima avança**; **direita ou para baixo volta** (a folha anterior desenrola-se por cima, vinda da margem onde se começou). Nas diagonais conta a direção predominante. Na primeira semana, voltar dá só um ressalto; na última, avançar também.
- Ao abrir: a semana atual. "Melhor dia" no topo continua visível; tocar nele (ou em "Também dá:") leva à folha desse dia e destaca o dia por momentos.
- Indicadores: pontinhos + "Semana x de N" + setas anterior/seguinte. Na última folha aparece "Ver mais semanas" (acrescenta 4).
- Tempo real: quando outra pessoa marca, a folha visível não muda.

## Não-objetivos / anti-objetivos

- Não mudar a lógica de dados (leitura, gravação, notas, nomes, melhor dia, tempo real) nem textos existentes.
- Sem bibliotecas; sem canvas/WebGL (ver Abordagens).
- Falha se: marcar ficar mais difícil, houver toques acidentais durante o gesto, o texto ficar desfocado com a folha parada, ou houver 3D com movimento reduzido.

## Restrições

- 60 fps no telemóvel: durante o gesto só mudam `transform` e `opacity` (cortes feitos com camadas rodadas `overflow:hidden`, verso espelhado com matriz de reflexão). Folha parada sem `transform`.
- `prefers-reduced-motion: reduce`: sem dobra nem animação; o gesto e as setas mudam de semana de imediato.
- Zonas de agarrar só nas margens (32 px) e cantos (56 px); o meio da folha continua a fazer scroll e a marcar; nenhuma zona tapa botões (conteúdo da folha com margem de 34 px, 58 px em baixo). Um gesto nunca conta como toque num botão.
- Cores só nos tokens do `:root` de `style.css`; contraste coberto por `tests/test_tokens.py`. Não mexer em `config.js` nem nos SQL.
- Funciona em 390 px e 1280 px, claro e escuro; abaixo de 360 px os botões continuam a ir para linha própria.

## Abordagens consideradas

1. **Scroll-snap nativo com efeito 3D ligado ao scroll** (protótipos 1 e 2: folha a inclinar, cover flow, cubo; depois argolas com `rotateX`). Rejeitada pelo dono: não era o efeito pretendido.
2. **Page curl em HTML/CSS + Pointer Events** (escolhida). Dobra reta na mediatriz entre o ponto agarrado e o dedo; verso e curvatura imitados com gradientes; só transforms por frame; o conteúdo continua a ser HTML real (texto nítido, botões acessíveis).
3. **Page curl em WebGL** (folha a enrolar em cilindro verdadeiro). Mais realista, mas obriga a fotografar a folha para textura durante o gesto (texto menos nítido, botões inativos), mais código e mais peso. Fica como plano B se a dobra reta desiludir.

## Decisões

- **Ficheiro novo `folhas.js`** com o motor do bloco (geometria da dobra, gesto, mola, setas/teclado, indicadores). `app.js` continua a gerar o HTML de cada semana e chama o motor; não sabe nada de gestos. Interface:
  - `Folhas.montar(caixa, { aoMudar(i) })` → liga o gesto às zonas do bloco.
  - `Folhas.atual()` → índice da folha visível.
  - `Folhas.irPara(i, { animar })` → muda de folha (uma só dobra mesmo que salte várias semanas; a folha de destino fica por baixo durante a dobra).
  - `Folhas.ocupado()` → `true` durante um gesto ou animação.
  - `Folhas.refazer()` → reaplica o estado (visibilidade, `inert`, indicadores) depois de o `app.js` reconstruir as folhas.
- **Render com tempo real**: o `render()` continua a reconstruir as folhas, mas guarda e repõe o índice da folha visível; se chegar uma atualização durante um gesto ou animação, o render fica pendente e corre quando o gesto acaba.
- **Ligações para dias** ("Melhor dia", "Também dá:"): o clique é intercetado, `irPara(semana do dia)` e depois o dia fica com um contorno `--brand` durante ~1,5 s (com movimento reduzido: sem animação, só o contorno).
- **Barra de navegação fixa em baixo** (decisão do dono): presa ao fundo do ecrã (`position: sticky; bottom`, com `env(safe-area-inset-bottom)`) enquanto o bloco está à vista, com setas de 44 px, pontinhos (um por semana, o atual alongado em `--brand`), "Semana x de N" com `aria-live="polite"` e, só na última folha, "Ver mais semanas" (o botão `#more` atual, com texto novo). Depois de acrescentar as 4 semanas, a folha avança para a primeira nova (decisão minha).
- **Ao mudar de folha** (decisão do dono): se o topo do bloco estiver fora do ecrã, a página sobe suavemente até ele, para se começar a ler a semana nova pela segunda-feira; com movimento reduzido, salta sem animação.
- **Ligações para dias**: depois de mudar de folha, a página desce até ao dia (centrado) e o dia fica destacado (decisão minha).
- **Acessibilidade**: folhas não visíveis com `inert` e `visibility:hidden`; a folha atual com `role="group"` e `aria-label` da semana; setas com `aria-label`; ← → só quando o foco não está num campo de texto.
- **Aspeto**: lombada `--band` 30 px com picotado; folhas com raio 10 px em baixo; espessura com duas arestas; verso `--verso` (token novo: claro #eeeaf8, escuro #1f2238); canto inferior direito desenhado como dobra (puxador). No computador a folha mantém as 7 colunas atuais.
- **Valores do protótipo aprovados**: mola k=240, amortecimento 30; avança se a dobra passou o meio da folha (q > 0,28) ou com velocidade > 700 px/s; a partir do lado oposto pede meio caminho do dedo; voltar completa com 45% ou > 600 px/s; ressalto máx. 32 px.

- **Render em espera durante o gesto vale para todos os renders** (tempo real, escrever o nome, marcar), não só o tempo real. A camada da aba (verso) e as zonas de agarrar ficam **fora** do que o `render()` reconstrói (`#weeks`), dentro do bloco.
- **Destaque do dia** ("Melhor dia"): classe `.destaque` ligada e desligada por `setTimeout` (~1,5 s), sem animação CSS longa (o `tests/test_efeitos.py` recusa animações > 250 ms).
- **Foco**: ao mudar de folha, o foco passa para o grupo da folha nova (`tabindex="-1"`), para não se perder numa folha `inert`.
- **Muitas semanas**: até 12 folhas mostram-se os pontinhos; a partir daí só "Semana x de N" e as setas, para caber em 390 px.
- **Alturas diferentes**: o bloco tem a altura da folha mais alta carregada (as folhas empilham-se na mesma célula de grelha, como no protótipo), para não haver saltos de layout ao folhear; a dobra mede W×H da folha que se move.

## Fica ao critério de quem implementa

- Nomes internos e organização do `folhas.js`, desde que a interface acima se mantenha.
- Ajustes finos de espaçamento revelados pelas capturas a 1280 px (folha larga de 7 colunas).

## Verificação

- Os testes do folhear ficam **fora do projeto** (decisão do dono): correm com o Playwright da sessão; o projeto continua sem dependências.
- Playwright a 390 px e 1280 px, claro e escuro: matriz de 8 zonas × 4 direções; ressaltos; setas e teclado; tempo real a meio de um gesto não muda a folha; ligação "Melhor dia" vai à folha certa; marcar funciona em todas as folhas e grava (pedidos simulados); nenhuma zona tapa botões; folha parada sem `transform`; movimento reduzido sem dobra.
- `tests/test_*.py` continuam verdes (token `--verso` acrescentado ao teste de tokens).
- `/impeccable audit` no fim; capturas mostradas ao dono antes de juntar ao `main`.
