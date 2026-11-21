# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Um grupo de cerca de 8 amigos, quase todos estudantes universitários. Usam sobretudo o telemóvel, em visitas rápidas: abrir o link, marcar, fechar.

## Product Purpose

Marcar em segundos os dias em que cada um está livre e ver logo qual é o melhor dia para estarem juntos. Sucesso: toda a gente marca as próximas semanas sem esforço e o grupo combina o dia sem trocar mensagens.

## Positioning

Um calendário só do grupo, sem contas: cada um escreve o nome e marca Livre / Talvez / Ocupado por dia; o melhor dia (mais livres, desempate por talvez) aparece calculado e atualiza em tempo real para todos.

## Operating Context

- Link partilhado no grupo; aberto no browser do telemóvel, às vezes no computador.
- Visitas curtas e frequentes; a pessoa volta quando o plano muda.
- Língua: português de Portugal.

## Capabilities and Constraints

- Semanas de segunda a domingo: a atual e as seguintes (6 por omissão, "mais" acrescenta 4); filtro "Semana toda / Só fins de semana" (sexta a domingo).
- Dias já passados da semana atual não se podem marcar.
- Três estados por dia e por pessoa: Livre, Talvez, Ocupado; tocar outra vez no estado ativo remove a marcação.
- Melhor dia e Top 3, só de hoje em diante.
- Sem contas: identidade por id guardado no browser; "Já marcaste noutro dispositivo?" recupera um nome existente.
- Supabase (tabelas `pessoas` e `disponibilidade`) com tempo real; HTML/CSS/JS estático sem build, publicado como site estático.

## Brand Commitments

- Tom sóbrio e limpo: uma ferramenta, não uma brincadeira.
- O nome "croquete"/"croquetada" fica só no título, como identidade do grupo; sem trocadilhos espalhados pela interface.
- Evitar: cartões e sombras genéricas, ilustrações decorativas, texto a mais.

## Evidence on Hand

Nenhum logótipo, fotografia ou material de marca. Não inventar testemunhos nem números.

## Product Principles

1. Marcar primeiro: a ação de marcar um dia é a coisa mais rápida e óbvia da página.
2. A resposta à vista: o melhor dia é a informação principal, legível num relance.
3. Telemóvel antes de tudo: pensado para uma mão e visitas de segundos.
4. Só o necessário: cada texto e elemento tem de servir a marcação ou a decisão.
