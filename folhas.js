// Bloco de folhas: uma semana de cada vez, mudar de semana enrolando a folha (page curl).
// O app.js gera as folhas em #weeks; este motor trata da dobra, do gesto, da mola, das setas e dos indicadores.
// Interface: Folhas.montar(caixa, { aoMudar(i), aoAcabar() }), atual(), irPara(i, { animar }), ocupado(), refazer().
// Durante a dobra só mudam transforms (camadas rodadas com overflow:hidden cortam a folha; o verso é o espelho
// na linha da dobra). Parada, a folha fica sem transform e o texto nítido.
window.Folhas = (() => {
  const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let caixa, semanas, aba, abaClip, abaPapel, abaCurva, zonas, ro, op = {};
  let folhas = [], c = 0, W = 0, H = 0, animando = false, g = null;

  // ---- estado e indicadores ----
  function arrumar(mov = -1, baixo = c + 1){
    folhas.forEach((f, i) => {
      f.classList.toggle('ver', i === c || i === baixo || i === mov);
      f.classList.toggle('atual', i === c);
      f.classList.remove('dobrar', 'baixo');
      f.style.zIndex = i === mov ? 4 : i === c ? 3 : 1;
      f.inert = i !== c;
      // todas as camadas temporárias da dobra voltam ao repouso (sem transform nem tamanhos)
      f.querySelectorAll(':scope > .clip, :scope > .clip > .conteudo, :scope > .clip > .vinco, :scope > .sombra-baixo').forEach(x => x.removeAttribute('style'));
    });
    aba.classList.remove('on');
    [aba, abaClip, abaPapel, abaCurva].forEach(x => x.removeAttribute('style'));
    indicadores();
    ajustar();
    if (ro) { ro.disconnect(); ro.observe(semanas); const d = folhas[c] && folhas[c].querySelector('.days'); if (d) ro.observe(d); }
  }
  // A folha atual cabe na altura? Se não, linhas mais baixas (.compacta); se nem assim, scroll por dentro
  // e só as margens folheiam. Cabendo (.inteira), folheia-se a partir de qualquer ponto da folha.
  function ajustar(){
    const k = folhas[c] && folhas[c].querySelector('.conteudo');
    if (!k || animando || g) return;
    const cabe = () => k.scrollHeight <= k.clientHeight + 1;
    caixa.classList.remove('compacta');
    let ok = cabe();
    if (!ok) { caixa.classList.add('compacta'); ok = cabe(); }
    caixa.classList.toggle('inteira', ok);
  }
  function indicadores(){
    const n = folhas.length, pontos = document.getElementById('pontos');
    pontos.hidden = n > 8;   // a partir de 8 folhas só "Semana x de N": 10 pontos já não cabem a 375 px
    pontos.innerHTML = Array.from({ length: n }, (_, k) => `<i${k === c ? ' class="on"' : ''}></i>`).join('');
    const qual = document.getElementById('qual'), texto = `Semana ${c + 1} de ${n}`;
    if (qual.textContent !== texto) qual.textContent = texto;
    document.getElementById('ant').disabled = c === 0;
    document.getElementById('seg').disabled = c >= n - 1;
    document.getElementById('more').hidden = c < n - 1;   // "Ver mais semanas" só na última folha
  }
  function refazer(){
    folhas = [...semanas.children].filter(e => e.classList.contains('folha'));
    c = Math.max(0, Math.min(c, folhas.length - 1));
    arrumar();
  }
  function mudou(){ arrumar(); if (op.aoMudar) op.aoMudar(c); }
  function acabar(){ animando = false; ajustar(); if (op.aoAcabar) op.aoAcabar(); }

  // ---- geometria da dobra (coordenadas da folha: 0,0 no canto de cima à esquerda) ----
  function medir(){ const r = folhas[c].getBoundingClientRect(); W = r.width; H = r.height; }
  const S = () => 3 * Math.hypot(W, H);   // tamanho das camadas de corte: cobre sempre a folha
  // camada que mostra só o meio-plano {p : (p-M)·u >= 0}; o filho volta a pôr o conteúdo no sítio
  function meioPlano(clip, filho, M, ang){
    const s = S();
    clip.style.width = clip.style.height = s + 'px';
    clip.style.transform = `translate(${M.x}px,${M.y}px) rotate(${ang}rad) translate(0,${-s / 2}px)`;
    filho.style.transform = `translate(0,${s / 2}px) rotate(${-ang}rad) translate(${-M.x}px,${-M.y}px)`;
  }
  // G = ponto agarrado, F = onde está agora; a dobra é a mediatriz de GF; o lado de G vira para o lado de F
  function desenhar(i, G, F, j){
    const dx = F.x - G.x, dy = F.y - G.y, L = Math.hypot(dx, dy);
    const f = folhas[i], clip = f.querySelector(':scope > .clip'), cont = clip.firstElementChild;
    if (L < 0.5) { clip.style.cssText = ''; cont.style.cssText = ''; f.classList.remove('dobrar'); aba.classList.remove('on'); return; }
    const n = { x: dx / L, y: dy / L }, M = { x: (G.x + F.x) / 2, y: (G.y + F.y) / 2 }, ang = Math.atan2(n.y, n.x);
    f.classList.add('dobrar'); cont.style.width = W + 'px'; cont.style.height = H + 'px';
    meioPlano(clip, cont, M, ang);   // a parte que fica (lado de F)
    const mn = M.x * n.x + M.y * n.y;   // reflexão na linha da dobra
    aba.style.transform = `matrix(${1 - 2 * n.x * n.x},${-2 * n.x * n.y},${-2 * n.x * n.y},${1 - 2 * n.y * n.y},${2 * mn * n.x},${2 * mn * n.y})`;
    abaPapel.style.width = W + 'px'; abaPapel.style.height = H + 'px';
    meioPlano(abaClip, abaPapel, M, ang + Math.PI);
    const s = S();
    abaCurva.style.height = s + 'px';   // curvatura junto à dobra, cortada pelo papel
    abaCurva.style.transform = `translate(${M.x}px,${M.y}px) rotate(${ang + Math.PI}rad) translate(0,${-s / 2}px)`;
    aba.classList.add('on');
    const b = folhas[j];   // sombra na folha de baixo, do lado de G, junto à dobra
    if (b) {
      b.classList.add('baixo');
      const sb = b.querySelector(':scope > .sombra-baixo');
      sb.style.height = s + 'px';
      sb.style.transform = `translate(${M.x}px,${M.y}px) rotate(${ang + Math.PI}rad) translate(0,${-s / 2}px)`;
    }
  }

  // ---- geometria simples: dois eixos, dobra paralela à margem ----
  // O puxador é sempre o canto de baixo à direita (G). F = G + u·k (+ um pouco de inclinação no início, junto ao canto);
  // a dobra fica a k/2 da margem, paralela a ela. k = 2·span: a folha saiu toda.
  const EIXO = { x: { u: { x: -1, y: 0 }, perp: { x: 0, y: -1 } }, y: { u: { x: 0, y: -1 }, perp: { x: -1, y: 0 } } };
  const spanDe = eixo => eixo === 'x' ? W : H;
  function pontoF(G, eixo, k, inclina = true){
    const { u, perp } = EIXO[eixo], t = inclina ? k * 0.12 * Math.max(0, 1 - k / spanDe(eixo)) : 0;
    return { x: G.x + u.x * k + perp.x * t, y: G.y + u.y * k + perp.y * t };
  }
  const canto = () => ({ x: W, y: H });
  // ressalto (primeira / última folha): a margem de onde o dedo parte levanta no máximo 32 px
  function ressaltoF(G, eixo, sinal, k){ const u = EIXO[eixo].u; return { x: G.x + u.x * sinal * k, y: G.y + u.y * sinal * k } }

  // ---- mola em 1D sobre k (quanto a folha está enrolada); desenhar(k) põe a dobra ----
  function mola(k0, v0, alvo, desenharK, fim){
    animando = true;
    let k = k0, v = v0, t0 = performance.now();
    const passo = t => {
      const dt = Math.min((t - t0) / 1000, 1 / 30); t0 = t;
      v += (240 * (alvo - k) - 30 * v) * dt; k += v * dt;
      if (Math.abs(alvo - k) < 0.6 && Math.abs(v) < 20) { fim(); return; }
      desenharK(k); requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // ---- mudar de folha (setas, teclado, ligações) ----
  function irPara(i, { animar = true } = {}){
    if (animando || g || i === c || i < 0 || i >= folhas.length) return;
    medir();
    if (!animar || reduz()) { c = i; mudou(); acabar(); return; }
    const G = canto(), de = c, fim = () => { c = i; mudou(); acabar(); };
    if (i > c) {   // a atual enrola a partir da margem direita; a de destino fica por baixo
      arrumar(de, i);
      mola(2, 1500, 2 * W + 40, k => desenhar(de, G, pontoF(G, 'x', k), i), fim);
    } else {       // a de destino desenrola-se por cima, vinda da esquerda
      arrumar(i, de);
      mola(2 * W + 40, -1500, 0, k => desenhar(i, G, pontoF(G, 'x', k, false), de), fim);
    }
  }

  // ---- gesto: o eixo decide-se nos primeiros 10 px e fica até largar ----
  // esquerda / cima avança (a atual enrola da margem direita / de baixo); direita / baixo volta (a anterior desenrola-se por cima)
  const local = e => { const r = semanas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } };

  function comecar(e){
    if (e.button !== 0 || !e.isPrimary) return;   // só o botão principal / o primeiro dedo
    const z = e.target.dataset && e.target.dataset.z;
    // fora das zonas: só com a folha inteira à vista, e só depois de o dedo andar (um toque curto continua a marcar)
    const meio = !z && caixa.classList.contains('inteira') && !!e.target.closest('.folha.atual') && !e.target.closest('input,select,textarea');
    if ((!z && !meio) || animando || g || !folhas.length) return;
    medir();
    g = { id: e.pointerId, z: z || 'meio', p0: local(e), c0: { x: e.clientX, y: e.clientY }, modo: '', amostras: [] };
    if (meio) return;
    try { zonas.setPointerCapture(e.pointerId) } catch (_) {}
    e.preventDefault();   // sem seleção de texto nem scroll a partir da zona
  }
  // desenha o estado do gesto para um dado k
  function pintar(G, eixo, modo, i, sinal, k){
    if (modo === 'frente') desenhar(c, G, pontoF(G, eixo, k), c + 1);
    else if (modo === 'tras') desenhar(i, G, pontoF(G, eixo, k, false), c);
    else desenhar(c, G, ressaltoF(G, eixo, sinal, k), c + 1);
  }
  function mover(e){
    if (!g || e.pointerId !== g.id) return;
    const p = local(e), d = { x: p.x - g.p0.x, y: p.y - g.p0.y };
    if (!g.modo) {
      if (Math.hypot(d.x, d.y) < 10) return;
      // começou no meio: a partir daqui é gesto (o botão por baixo já não recebe o clique). Numa zona a captura já é da zona;
      // mudá-la para a caixa dispararia lostpointercapture e terminava o gesto.
      if (g.z === 'meio') try { caixa.setPointerCapture(e.pointerId) } catch (_) {}
      g.eixo = Math.abs(d.x) >= Math.abs(d.y) ? 'x' : 'y';   // fica bloqueado neste eixo até largar
      const avanca = (g.eixo === 'x' ? d.x : d.y) < 0;
      // espaço do dedo até à borda do ecrã nesse sentido: a partir de uma margem, "para fora" há pouco; cada píxel conta mais
      const sp = spanDe(g.eixo), x = g.eixo === 'x';
      g.espaco = Math.max(1, (x ? d.x : d.y) < 0 ? (x ? g.c0.x : g.c0.y) : (x ? innerWidth - g.c0.x : innerHeight - g.c0.y));
      g.fator = 1.6 * Math.min(8, Math.max(1, 0.5 * sp / g.espaco));
      g.G = canto(); g.sinal = 1;
      if (avanca && c < folhas.length - 1) { g.modo = 'frente'; arrumar(c, c + 1); }
      else if (!avanca && c > 0) { g.modo = 'tras'; g.i = c - 1; arrumar(g.i, c); }
      else {
        g.modo = 'ressalto'; arrumar(c, c + 1);
        if (!avanca) { g.sinal = -1; g.G = g.eixo === 'x' ? { x: 0, y: H } : { x: W, y: 0 }; }
      }
    }
    const a = g.eixo === 'x' ? d.x : d.y, span = spanDe(g.eixo);   // só conta o eixo escolhido
    g.amostras.push([performance.now(), a]); if (g.amostras.length > 6) g.amostras.shift();
    if (g.modo === 'frente') g.k = Math.max(0, Math.min(2 * span, -a * g.fator));
    else if (g.modo === 'tras') g.k = Math.max(0, Math.min(2 * span + 40, 2 * span + 40 - a * g.fator));
    else g.k = Math.min(32, Math.max(0, -a * g.sinal * 0.5));
    if (!reduz()) pintar(g.G, g.eixo, g.modo, g.i, g.sinal, g.k);
  }
  function largar(e){
    if (!g || (e && e.pointerId !== g.id)) return;
    const s = g.amostras, a = s[0], b = s[s.length - 1];
    const dt = a && b && b[0] > a[0] ? (b[0] - a[0]) / 1000 : 1;
    const vDedo = a ? (b[1] - a[1]) / dt : 0;   // px/s no eixo; negativo = para a esquerda / para cima
    const sacode = b && Math.abs(b[1]) >= Math.min(40, (g.espaco || 40) * 0.6);   // a velocidade só conta com pelo menos 40 px de dedo (ou 60% do espaço até à borda)
    const { modo, G, eixo, i, k, z, sinal, fator } = g; g = null;
    if (!modo) {
      // toque curto numa zona: vale para o que está por baixo (um botão de um dia que passou por baixo da margem)
      if (e && e.type === 'pointerup' && z !== 'meio') {
        const el = document.elementsFromPoint(e.clientX, e.clientY).find(x => !zonas.contains(x));
        const alvo = el && el.closest('button,a,input,select,summary');
        if (alvo && !alvo.closest('[inert]')) { alvo.focus({ preventScroll: true }); if (alvo.tagName !== 'INPUT' && alvo.tagName !== 'SELECT') alvo.click(); }
      }
      acabar(); return;
    }
    const assenta = () => { arrumar(); acabar(); }, span = spanDe(eixo), vk = -vDedo * (fator || 1.6);   // vk > 0: a enrolar mais
    const pinta = kk => pintar(G, eixo, modo, i, sinal, kk);
    if (modo === 'ressalto') { if (reduz()) assenta(); else mola(k, 0, 0, pinta, assenta); return; }
    if (modo === 'tras') {
      const prog = 1 - k / (2 * span + 40);   // 0 = ainda escondida, 1 = assente
      const completa = (prog > 0.3 || (sacode && vk < -500)) && vk < 400;
      if (reduz()) { if (completa) { c = i; mudou(); } else arrumar(); acabar(); return; }
      if (completa) mola(k, vk, 0, pinta, () => { c = i; mudou(); acabar(); });
      else mola(k, vk, 2 * span + 40, pinta, assenta);
      return;
    }
    // a dobra passou 20% da folha, ou um gesto rápido para o lado certo
    const completa = (k / (2 * span) > 0.2 || (sacode && vk > 500)) && vk > -400;
    if (reduz()) { if (completa) { c++; mudou(); } else arrumar(); acabar(); return; }
    const de = c;
    if (completa) mola(k, vk, 2 * span + 40, pinta, () => { c = de + 1; mudou(); acabar(); });
    else mola(k, vk, 0, pinta, assenta);
  }

  function montar(cx, opcoes = {}){
    op = opcoes; caixa = cx;
    semanas = caixa.querySelector('#weeks');
    aba = caixa.querySelector('.aba'); abaClip = aba.querySelector('.aba-clip'); abaPapel = aba.querySelector('.aba-papel'); abaCurva = aba.querySelector('.aba-curva');
    zonas = caixa.querySelector('.zonas');
    // na caixa: apanha as zonas (que estão dentro dela) e, com a folha inteira à vista, a folha toda
    caixa.addEventListener('pointerdown', comecar);
    caixa.addEventListener('pointermove', mover);
    caixa.addEventListener('pointerup', largar);
    caixa.addEventListener('pointercancel', largar);
    caixa.addEventListener('lostpointercapture', largar);   // botão largado fora da janela: a folha não fica presa
    if (window.ResizeObserver) ro = new ResizeObserver(() => ajustar());   // ecrã rodado, barra do browser, motivo aberto
    document.getElementById('seg').addEventListener('click', () => irPara(c + 1));
    document.getElementById('ant').addEventListener('click', () => irPara(c - 1));
    addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]'))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); irPara(c + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); irPara(c - 1) }
    });
    refazer();
  }

  return { montar, refazer, irPara, atual: () => c, ocupado: () => animando || !!g };
})();
