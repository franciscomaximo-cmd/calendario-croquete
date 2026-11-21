# Design

Sistema visual do calendário da croquetada. Produto e tom: ver [PRODUCT.md](PRODUCT.md). Modo: Operate (ferramenta de marcar e decidir).

## Princípio

Uma ferramenta sóbria. A cor só faz trabalho: identidade do grupo (faixa do título) e estados (Livre / Talvez / Ocupado). Sem cartões com sombra, sem ilustração, sem trocadilhos.

## Cor (tokens em `style.css`, `light-dark()`; claro / escuro)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | #faf9f6 | #15130f | fundo, dias normais |
| `--surface` | #f1eee7 | #211e18 | sábado e domingo |
| `--line` | #dcd6ca | #3b362d | linhas finas da grelha, separadores, fundo da barra |
| `--edge` | #857e70 | #857c6b | contorno de controlos (≥3:1) |
| `--ink` / `--mute` | #1d1b17 / #5f5a50 | #f2efe8 / #b3ab9c | texto / texto secundário |
| `--band` / `--bandink` | #f2c230 / #1d1b17 | #2b2414 / #f2c230 | faixa do título (única superfície de cor) |
| `--yes` / `--yesink` | #1f6f4a / #fff | #3fae7a / #0f1a14 | Livre |
| `--maybe` / `--maybeink` | #e6a817 / #1d1b17 | #f0b72f / #1d1b17 | Talvez |
| `--no` / `--noink` | #dcd6ca / #1d1b17 | #4a463f / #f2efe8 | Ocupado |
| `--best` | #fdf1c7 | #2e2712 | dia em destaque (melhor dia) |
| `--erro` | #b3261e | #ff8a80 | avisos de erro |

Todos os pares de texto ≥4,5:1 e contornos ≥3:1 nos dois temas.

## Tipo

Fonte do sistema (`--font`), sem fontes externas. Papéis: título do grupo 24–36px/800; melhor dia 28–40px/800 (herói); títulos de semana 18px/700; corpo 16px; rótulos 14px/600; datas e metadados 14px em `--mute` com algarismos tabulares; nomes 13px/600.

## Componentes

- **Semana:** título + intervalo; dias numa grelha com linhas de 1px (`gap:1px` sobre `--line`), raio 10px, sem sombra.
- **Topo do formulário:** nome + filtro na mesma linha; "Já marcaste noutro dispositivo?" fica num `<details>` discreto. Sem legenda: os botões já dizem o estado. Um toque sem nome fica guardado: a dica por baixo diz qual ("o teu "Livre" de sábado, 5 dez fica marcado a seguir") e, com Enter ou ao sair do campo, a marcação é feita e o dia volta ao ecrã. Escrever um nome que já existe (sem contar maiúsculas nem acentos) não grava nada e pergunta "Já existe Inês no grupo. É o teu nome?" com o botão "Sou eu" (Livre, 44px).
- **Dia:** até 899px uma linha (dia/data à esquerda, três botões à direita, nomes por baixo só se houver) e os dias passados juntos numa linha ("Segunda a sexta já passaram."); a partir de 900px 7 colunas (3 em "só fins de semana") com botões empilhados.
- **Botões de estado:** 44px de altura, contorno `--edge`; Livre leva texto e contorno `--yes` a 700 (é a resposta que mais interessa); escolhido = cor do estado + ✓ em SVG, e Ocupado escolhido leva ainda contorno de 2px em `--ink`. Abaixo de 380px sai o ✓; abaixo de 360px os botões passam para uma linha própria.
- **Nomes:** etiqueta com a cor do estado; Talvez leva "?" e Ocupado é riscado (não depende só da cor).
- **Melhor dia:** frase "Melhor dia: <data>" com a data em ligação para o dia; por baixo quem está livre ("Ana, Rui e Zé · talvez Marta") e "Também dá:" com os dois dias seguintes, sem repetir o vencedor.
- **Aviso (toast):** fixo em baixo, tinta sobre fundo invertido; erro em `--erro`. Pode levar um botão de ação (44px, recebe o foco, 8s): escolher um nome em "Já marcaste noutro dispositivo?" pede "Sou eu" e depois oferece "Desfazer".

## Movimento

Só a barra (transform `scaleX`) e o aviso (opacidade + 8px), ambos com ease-out e desligados com `prefers-reduced-motion`.
