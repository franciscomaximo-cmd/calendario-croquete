# Design

Sistema visual do calendário da croquetada. Produto e tom: ver [PRODUCT.md](PRODUCT.md). Modo: Operate (ferramenta de marcar e decidir). Redesenho de 2026-11-25: paleta **Violeta**, escolhida pelo grupo (desenho em [docs/superpowers/specs/2026-11-25-redesign-violeta-design.md](docs/superpowers/specs/2026-11-25-redesign-violeta-design.md)).

## Princípio

Prático e claro primeiro, com personalidade nos sítios certos. O violeta é a cor do grupo e só aparece na faixa do título, no melhor dia, nos sublinhados e na seleção; os estados têm as suas cores (verde, amarelo, vermelho) e nunca a usam. Sem cartões com sombra nem ilustração. A cor nunca é o único sinal: ✓, "?", nome riscado e "Melhor dia" escrito.

## Cor (tokens em `style.css`, `light-dark()`; claro / escuro)

Todas as cores vivem no bloco `:root` de `style.css`; mudar uma cor é mudar uma linha. `tests/test_tokens.py` confirma os valores e 27 regras de contraste nos dois temas (`python -I tests/test_tokens.py`).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | #ffffff | #0f1020 | fundo, dias normais |
| `--surface` | #f4f1fd | #181a2e | sábado e domingo, melhor dia, "Quem és tu?", repetidos no admin |
| `--line` | #e4e0f0 | #2a2c44 | linhas finas da grelha, separadores, fundo da barra |
| `--edge` | #858aa0 | #7c7c96 | contorno de controlos (≥3:1) |
| `--ink` / `--mute` | #131627 / #565a6e | #f2f0fb / #b3b1c8 | texto / texto secundário |
| `--band` / `--bandink` | #6f00fd / #ffffff | #6f00fd / #ffffff | faixa do título, botão principal do admin, seleção de texto |
| `--brand` | #6f00fd | #a983ff | destaque: contorno e "Melhor dia", sublinhado da data |
| `--yes` / `--yesink` | #0a4230 / #ffffff | #1f7a55 / #ffffff | Livre (preenchido) |
| `--yestxt` | #0a4230 | #5cd6a0 | texto verde sobre o fundo (Livre por escolher, "marcaste tudo") |
| `--maybe` / `--maybeink` | #ffd21f / #131627 | #f2c94c / #131627 | Talvez (preenchido) |
| `--maybeedge` | #8a6a00 | #f2c94c | contorno do Talvez (o amarelo sozinho não se vê no branco) |
| `--maybebar` | #b07d00 | #f2c94c | segmento Talvez da barra (≥3:1 contra o verde ao lado e contra o fundo da barra) |
| `--no` / `--noink` | #c62828 / #ffffff | #d32f2f / #ffffff | Ocupado |
| `--erro` / `--erroink` | #b3261e / #ffffff | #ff8a80 / #131627 | avisos de erro |

Regras: texto ≥4,5:1; contornos e preenchimentos de estado ≥3:1 contra `--bg` e `--surface`; Livre e Talvez diferem ≥3:1 em luminosidade; a faixa do escuro fica ≥2:1 contra o fundo. O Ocupado vermelho fica perto do vermelho de erro; os erros têm sempre uma frase, e o Ocupado escolhido leva contorno de 2px em `--ink` para se separar do verde a quem não distingue as duas cores.

## Tipo

Títulos em **Poppins** (`--display`), servida pelo próprio site em `fonts/` (só 700 e 800, subconjunto latin, `font-display: swap`, licença OFL em `fonts/OFL.txt`); o resto na fonte do sistema (`--font`). Papéis: título do grupo 24–36px/800 Poppins; data do melhor dia 28–40px/800 Poppins ("Melhor dia:" fica na fonte do sistema a 500); títulos de semana 18px/700 Poppins; "Quem és tu?" 22px/800 Poppins; corpo 16px; rótulos 14px/600; datas e metadados 14px em `--mute` com algarismos tabulares; nomes 13px/600. Espaçamento de letras dos títulos grandes -.01em (a Poppins já é estreita). `tests/test_fonte.py` confirma os ficheiros, o `swap` e que nada vem do Google Fonts.

## Componentes

- **Semana:** título + intervalo + "marcaste 3 de 7" (só dias que ainda se podem marcar; "marcaste tudo" em `--yestxt`); até 899px o intervalo fica por baixo do título; dias numa grelha com linhas de 1px (`gap:1px` sobre `--line`), raio 10px, sem sombra.
- **Quem és tu?:** num dispositivo sem nome guardado, num grupo que já tem pessoas, aparece antes de tudo um bloco `--surface` (raio 10px, sem sombra) com "Quem és tu?", um botão `.sec` por nome e "Sou novo no grupo" como ligação. Escolher um nome usa a troca com Desfazer; "Sou novo" (ou tocar num dia) fecha-o e mostra o campo do nome. Enquanto está aberto, o formulário do nome fica escondido.
- **Topo do formulário:** nome + filtro na mesma linha; "Já marcaste noutro dispositivo?" fica num `<details>` discreto. Sem legenda: os botões já dizem o estado. Um toque sem nome fica guardado: a dica por baixo diz qual ("o teu "Livre" de sábado, 5 dez fica marcado a seguir") e, com Enter ou ao sair do campo, a marcação é feita e o dia volta ao ecrã. Escrever um nome que já existe (sem contar maiúsculas nem acentos) não grava nada e pergunta "Já existe Inês no grupo. É o teu nome?" com o botão "Sou eu" (Livre, 44px).
- **Dia:** até 899px uma linha (dia/data à esquerda, três botões à direita, nomes por baixo só se houver) e os dias passados juntos numa linha ("Segunda a sexta já passaram."); sem "Sem respostas" e sem nomes nos dias passados. A partir de 900px 7 colunas (3 em "só fins de semana"): dia, data, linha reservada para "Melhor dia", barra e logo a seguir os botões, para ficarem alinhados entre colunas; os nomes vêm depois dos botões.
- **Melhor dia na grelha:** fundo `--surface`, contorno de 2px em `--brand` à volta do dia e "Melhor dia" escrito em `--brand` 12px/700 por baixo da data (nada de riscas laterais).
- **Barra:** 6px; Livre em `--yes`, Talvez em `--maybebar`, sobre fundo `--bg` com contorno de 1px em `--line` (assim a barra vazia continua a ver-se).
- **Botões de estado:** 44px de altura, contorno `--edge`; Livre por escolher leva texto `--yestxt` e contorno `--yes` a 700 (é a resposta que mais interessa); escolhido = cor do estado + ✓ em SVG; Talvez escolhido com contorno `--maybeedge`; Ocupado escolhido com contorno de 2px em `--ink`. Abaixo de 380px sai o ✓; abaixo de 360px os botões passam para uma linha própria.
- **O teu motivo (Ocupado):** ao marcar Ocupado abre-se nesse dia um campo com a etiqueta por cima ("Estás ausente porque vais praticar o coito ou vais à saída de solteiros? Se quiseres, justifica a tua ausência.", 13px/600, parte em várias linhas sem alargar a coluna), placeholder curto "ex.: exame" e "Visível para todo o grupo." por baixo; só um aberto de cada vez. Nos teus outros dias Ocupado: "Motivo: **exame**" + ligação "editar", ou só "acrescentar motivo". Grava com Enter ou ao sair; Escape desiste.
- **Nomes:** etiqueta com a cor do estado; Talvez leva "?" e contorno `--maybeedge`; no Ocupado o nome é riscado (não depende só da cor). Com motivo: "Rui · exame", só o nome riscado e o motivo a 500; a etiqueta pode partir em duas linhas para o motivo se ler inteiro sem hover.
- **Melhor dia (topo):** frase "Melhor dia: <data>" com a data em ligação para o dia, sublinhada em `--brand`; por baixo quem está livre ("Ana, Rui e Zé · talvez Marta") e "Também dá:" com os dois dias seguintes, sem repetir o vencedor.
- **Estado da ligação:** 14px em `--mute` logo por baixo do melhor dia, com `text-wrap: pretty`; erros de ligação ou de tempo real em `--erro` a 600.
- **Aviso (toast):** fixo em baixo, tinta sobre fundo invertido; erro em `--erro` com texto `--erroink`. Se o campo do motivo estiver aberto na zona de baixo do ecrã, o aviso aparece em cima para não o tapar. Pode levar um botão de ação (44px, recebe o foco, 8s): escolher um nome em "Já marcaste noutro dispositivo?" pede "Sou eu" e depois oferece "Desfazer".

## Admin (`admin.html`)

Mesmo sistema: faixa violeta, Poppins no título, campos e botões iguais; botão principal (Entrar, Mudar password, Guardar password) em `--band`. Login numa coluna (máx. 320px). Lista de pessoas em linhas finas como os dias; nomes repetidos com fundo `--surface` e etiqueta "repetido" amarela. Botões secundários `.sec` (contorno `--edge`); Apagar com contorno e texto `--erro`. Confirmações com `confirm()` nativo. "Mudar password" por baixo da lista, numa coluna (máx. 360px), com a regra "Pelo menos 8 caracteres." em `--mute` e o erro em `--erro` por cima do botão; o botão fica desativado e diz "A guardar…" enquanto grava. Um ecrã de cada vez: login (com "Esqueci-me da password" como ligação), pedido da ligação (resposta sempre igual, a 600), "Nova password" quando se chega pela ligação do email, ou o painel.

## Movimento

Discreto, nunca mais de 250 ms, nunca bloqueia cliques, e todo dentro de `@media (prefers-reduced-motion: no-preference)` (`tests/test_efeitos.py` confirma):

- **Passar o rato:** cor, contorno e sombra dos botões mudam em 150 ms ease-out.
- **Marcar:** só o botão acabado de tocar (classe `pop`, posta pelo `setDia`) faz um "pop" (escala .94 → 1, 200 ms) e o ✓ desenha-se (200 ms). Um redesenho da grelha não repete a animação noutros botões.
- **Abrir a página:** faixa e conteúdo entram com opacidade + 8px (250 ms), uma vez.
- **Barra:** `transform: scaleX` em 250 ms.
- **Guardar:** o aviso "Guardado." entra com opacidade + 8px (200 ms), mais o "pop" do botão.
