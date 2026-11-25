# Redesenho visual: paleta Violeta

Data: 2026-11-25 · Ramo: `redesign`

## Porquê

O grupo pediu outras cores (sem dizer porquê). O dono quer o site "mais bonito e com mais vida, sem deixar de ser uma ferramenta prática". A crítica Impeccable (27/40) apontou: amarelo com 6 papéis (identidade = Talvez), melhor dia quase invisível na grelha, Ocupado a parecer desativado, barra com estados confundíveis, tipografia sem voz.

## Objetivos

- Paleta Violeta, escolhida pelo grupo (tons medidos numa imagem enviada por um amigo): violeta elétrico `#6f00fd`, branco, texto quase preto `#131627`.
- Estados pedidos pelo dono: Livre verde, Talvez amarelo, Ocupado vermelho.
- Personalidade nos títulos com uma fonte própria; o resto na fonte do sistema.
- Efeitos que se notam mas não atrasam nem distraem; tudo desligado com `prefers-reduced-motion`.
- Admin muda junto (partilha o `style.css`).

## Não-objetivos / anti-objetivos

- Nenhuma mudança de funcionalidade, texto ou comportamento (só aspeto). A única linha de JS tocada é para pôr uma classe de animação no botão acabado de tocar.
- Não copiar o estilo de marca da imagem de referência (maiúsculas, caixas pretas): só as cores.
- Nada que atrase marcar um dia: animações ≤ 250 ms, sem bloquear cliques.

## Restrições

- Cores num só sítio: o bloco `:root` do `style.css`, com `light-dark()` para claro/escuro.
- Contraste verificado (script): texto ≥ 4,5:1; contornos e preenchimentos de estado ≥ 3:1 contra o fundo do dia; Livre e Talvez distintos em luminosidade; faixa do escuro ≥ 2:1 contra o fundo.
- Não depender só da cor: ✓, "?" e nome riscado ficam.
- Não mexer em `config.js` nem nos ficheiros SQL.

## Abordagens consideradas

1. **Só trocar os valores dos tokens existentes.** Rápido, mas não resolve os problemas da crítica (melhor dia só por tom de fundo, amarelo sobre branco invisível, texto verde ilegível no escuro).
2. **Trocar tokens e acrescentar 3 tokens de papel** (`--brand`, `--yestxt`, `--maybeedge`) e ajustar as poucas regras que os usam. **Escolhida**: resolve os problemas apontados com poucas linhas e mantém as cores num só sítio.
3. Reescrever a folha de estilos. Desproporcionado para uma mudança de aspeto.

## Decisões

- Tokens (claro · escuro): fundo `#ffffff` · `#0f1020`; fim de semana `#f4f1fd` · `#181a2e`; texto `#131627` · `#f2f0fb`; secundário `#565a6e` · `#b3b1c8`; contorno `#858aa0` · `#7c7c96`; faixa `#6f00fd` (texto branco) nos dois; destaque `#6f00fd` · `#a983ff`; Livre `#0a4230` · `#1f7a55` (texto do Livre por escolher `#0a4230` · `#5cd6a0`); Talvez `#ffd21f` · `#f2c94c` com contorno `#8a6a00` no claro; Ocupado `#c62828` · `#d32f2f`; erro `#b3261e` · `#ff8a80`.
- Melhor dia na grelha: fundo de fim de semana + risca de 4 px na margem em `--brand` (em vez do tom amarelo).
- Sublinhado da data do melhor dia, seleção de texto e foco ficam no violeta, não no amarelo.
- Fonte dos títulos: Poppins 700/800 (Google Fonts, `display=swap`) para o título da faixa, a data do melhor dia, os títulos de semana e "Quem és tu?". Corpo na fonte do sistema.
- Efeitos: transição de cor/contorno nos botões ao passar o rato (150 ms); ao marcar, o botão escolhido faz um pequeno "pop" e o ✓ desenha-se (≤ 250 ms); entrada suave da página (opacidade + 8 px, uma vez); o aviso "Guardado." mantém a entrada atual. Tudo desligado com `prefers-reduced-motion`.

## Fica ao critério de quem implementa

- Ajustes finos de espaçamento revelados pelas capturas.
- Tom exato do segmento Talvez na barra (tem de se ver contra o fundo da barra).

## Verificação

Playwright (já instalado nesta máquina) a 390 px e 1280 px, claro e escuro, antes e depois; `impeccable detect`, polish e audit no fim; capturas mostradas ao dono.
