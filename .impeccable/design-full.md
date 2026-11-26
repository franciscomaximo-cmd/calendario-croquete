# Design

Sistema visual do calendário da croquetada. Produto e tom: ver [PRODUCT.md](PRODUCT.md). Modo: Operate (ferramenta de marcar e decidir). Redesenho de 2026-11-25: paleta **Violeta**, escolhida pelo grupo (desenho em [docs/superpowers/specs/2026-11-25-redesign-violeta-design.md](docs/superpowers/specs/2026-11-25-redesign-violeta-design.md)).

## Princípio

Prático e claro primeiro, com personalidade nos sítios certos. O violeta é a cor do grupo e só aparece na faixa do título, no melhor dia, nos sublinhados e na seleção; os estados têm as suas cores (verde, amarelo, vermelho) e nunca a usam. Sem cartões com sombra nem ilustração. A cor nunca é o único sinal: ✓, "?", nome riscado e "Melhor dia" escrito.

## Cor / Colors (tokens em `style.css`, `light-dark()`; claro / escuro)

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

## Tipo / Typography

Títulos em **Poppins** (`--display`), servida pelo próprio site em `fonts/` (só 700 e 800, subconjunto latin, `font-display: swap`, licença OFL em `fonts/OFL.txt`) e, enquanto carrega, uma fonte de recurso "Poppins fallback" (Arial negrito, ou Helvetica/Roboto) com `size-adjust`, `ascent-override`, `descent-override` e `line-gap-override` medidos para o 800, para o título e a data não saltarem; o resto na fonte do sistema (`--font`). Papéis: título do grupo 24–36px/800 Poppins; data do melhor dia 28–40px/800 Poppins ("Melhor dia:" fica na fonte do sistema a 500); títulos de semana 18px/700 Poppins; "Quem és tu?" 22px/800 Poppins; corpo 16px; rótulos 14px/600; datas e metadados 14px em `--mute` com algarismos tabulares; nomes 13px/600. Espaçamento de letras dos títulos grandes -.01em (a Poppins já é estreita). `tests/test_fonte.py` confirma os ficheiros, o `swap` e que nada vem do Google Fonts.

## Componentes / Components

- **Ecrã único (index):** a página não faz scroll (`body.app`, 100dvh). Topo: faixa violeta fina com o título a 17px; uma linha com o nome (etiqueta só para o leitor de ecrã), "Semana toda / Só fins de semana" e um botão de 44px com setas que abre um menu pequeno "Já marcaste noutro dispositivo?" (fecha ao tocar fora); "Melhor dia: **Quinta, 3 dez** Ana, Rui e Zé" numa linha que corta com reticências ("Também dá" sai). Sem ninguém livre: "Ainda ninguém está livre" a 15px em `--mute`, com "Marca os dias em que podes." só enquanto ninguém marcou nada. "N pessoas no grupo…" fica só para o leitor de ecrã; erros de ligação à vista. A folha ocupa o resto da altura até à barra das semanas.
- **Folha que não cabe:** primeiro `.compacta` (até 899px: dias com 4px de margem, botões de 38px, data a 12px, título da semana a 16px); se mesmo assim não couber, a folha faz scroll por dentro (barra fina) e só as margens folheiam. Cabendo (`.inteira`), a folha toda folheia (`touch-action:none`): o gesto só começa depois de o dedo andar 10px, por isso um toque curto num botão continua a marcar, e um arrasto começado num botão não o marca.
- **Bloco de folhas:** uma semana de cada vez, como um bloco de secretária de destacar (`folhas.js`). Lombada `--band` de 30px com picotado tracejado em `--line`; duas bordas `--edge` desviadas 2–4px por baixo dão a espessura; cada folha em `--bg` com contorno `--line`, raio 0 0 10px 10px, margem 14/22/46px e um canto dobrado em baixo à direita (o puxador, verso em `--verso`). As folhas escondidas ficam `visibility:hidden` + `inert`.
- **Zonas de agarrar:** 32px nas quatro margens e 56px nos cantos, 12px fora da folha (na margem da página), invisíveis, `touch-action:none`. Um toque curto numa zona passa para o botão que estiver por baixo (dias que passam por baixo da margem quando a folha faz scroll).
- **Barra das semanas (`.mudar`):** no fundo do ecrã, por baixo da folha (fundo `--bg`, linha `--line` em cima, respeita a zona segura do iPhone): seta ‹ (44px, redonda, contorno `--edge`), pontinhos (o atual alongado em `--brand`; escondidos acima de 8 semanas), "Semana 2 de 6" em `--mute` (anunciado ao leitor de ecrã), seta ›. Na última folha aparece "Ver mais semanas" (+4 e avança); abaixo de 480px os pontinhos e o texto saem nessa folha para a barra caber numa linha. Setas desativadas a 35%.
- **Ligação do melhor dia:** muda logo para a folha desse dia, desliza até ele e contorna-o 4px em `--brand` durante 1,5s (`.destaque`; mais grosso que os 2px do melhor dia, senão não se via).
- **Semana:** título + intervalo + "marcaste 3 de 7" (só dias que ainda se podem marcar; "marcaste tudo" em `--yestxt`); até 899px o intervalo fica por baixo do título; dias numa grelha com linhas de 1px (`gap:1px` sobre `--line`), sem raio nem contorno lateral (a folha já é a moldura), sem sombra.
- **Quem és tu?:** num dispositivo sem nome guardado, num grupo que já tem pessoas, aparece antes de tudo um bloco `--surface` (raio 10px, sem sombra) com "Quem és tu?", um botão `.sec` por nome e "Sou novo no grupo" como ligação. Escolher um nome usa a troca com Desfazer; "Sou novo" (ou tocar num dia) fecha-o e mostra o campo do nome. Enquanto está aberto, o formulário do nome fica escondido.
- **Topo do formulário:** nome + filtro na mesma linha; "Já marcaste noutro dispositivo?" fica num `<details>` discreto. Sem legenda: os botões já dizem o estado. Um toque sem nome fica guardado: a dica por baixo diz qual ("o teu "Livre" de sábado, 5 dez fica marcado a seguir") e, com Enter ou ao sair do campo, a marcação é feita e o dia volta ao ecrã. Escrever um nome que já existe (sem contar maiúsculas nem acentos) não grava nada e pergunta "Já existe Inês no grupo. É o teu nome?" com o botão "Sou eu" (Livre, 44px).
- **Dia:** até 899px uma linha (dia/data à esquerda, três botões à direita, nomes por baixo só se houver) e os dias passados juntos numa linha ("Segunda a sexta já passaram."); sem "Sem respostas" e sem nomes nos dias passados. A partir de 900px 7 colunas (3 em "só fins de semana"): dia, data, linha reservada para "Melhor dia", barra e logo a seguir os botões, para ficarem alinhados entre colunas; os nomes vêm depois dos botões.
- **Melhor dia na grelha:** fundo `--surface`, contorno de 2px em `--brand` à volta do dia e "Melhor dia" escrito em `--brand` 12px/700 por baixo da data (nada de riscas laterais).
- **Barra:** 6px; Livre em `--yes`, Talvez em `--maybebar`, sobre fundo `--bg` com contorno de 1px em `--line` (assim a barra vazia continua a ver-se).
- **Botões de estado:** 44px de altura, contorno `--edge`; Livre por escolher leva texto `--yestxt` e contorno `--yes` a 700 (é a resposta que mais interessa); escolhido = cor do estado + ✓ em SVG; Talvez escolhido com contorno `--maybeedge`; Ocupado escolhido com contorno de 2px em `--ink`. Abaixo de 440px sai o ✓ e o texto passa a 13px abaixo de 450px; abaixo de 380px os botões passam para uma linha própria (pontos ~50px acima dos antigos: a folha come essa largura).
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
- **Mudar de semana (exceção pedida pelo grupo):** a folha enrola como papel (page curl), só em dois eixos. O eixo decide-se nos primeiros 10px de arrasto e fica bloqueado até largar. Para a esquerda avança (a folha enrola a partir da margem direita); para cima avança (enrola a partir da margem de baixo); o puxador é sempre o canto de baixo à direita. Para a direita / para baixo volta: a anterior desenrola-se por cima, vinda da esquerda / de cima. A linha da dobra fica paralela à margem de onde saiu, com até ~7° de inclinação junto ao canto no início, que desaparece à medida que enrola; a dobra anda 0,8× o dedo (mais quando há pouco espaço até à borda do ecrã), por isso nunca aparece a meio da folha. Passa de folha com a dobra a 20% da folha, ou com um gesto rápido de pelo menos 40px. Na primeira e na última folha só um ressalto de 32px. O verso (`--verso`) é o espelho na linha da dobra, com gradiente de curvatura e sombra na folha de baixo. Ao largar, uma mola (k 240, amortecimento 30) acaba ou desfaz. Setas e ← → fazem a mesma dobra horizontal. Só `transform` por frame; no fim de cada animação todas as camadas temporárias (corte, verso, curvatura, vinco, sombra) perdem o `style` e as classes, e a folha parada fica igual, píxel a píxel, ao que estava antes. Com movimento reduzido não há dobra: a folha muda logo. Durante a dobra a grelha não é redesenhada (o tempo real espera que a folha assente). Ao mudar, a folha nova abre no topo e o foco passa para ela (com as setas, o foco fica na seta).
- **Guardar:** o aviso "Guardado." entra com opacidade + 8px (200 ms), mais o "pop" do botão.
