// Bloco de folhas: uma semana de cada vez, mudar de semana enrolando a folha (page curl).
// O app.js gera as folhas em #weeks; este motor trata da dobra, do gesto, da mola, das setas e dos indicadores.
// Interface: Folhas.montar(caixa, { aoMudar(i), aoAcabar() }), atual(), irPara(i, { animar }), ocupado(), refazer().
// Durante a dobra só mudam transforms (camadas rodadas com overflow:hidden cortam a folha; o verso é o espelho
// na linha da dobra). Parada, a folha fica sem transform e o texto nítido.
window.Folhas = (() => {
  const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let semanas, aba, abaClip, abaPapel, abaCurva, zonas, op = {};
  let folhas = [], c = 0, W = 0, H = 0, animando = false, g = null;

  // ---- estado e indicadores ----
  function arrumar(mov = -1, baixo = c + 1){
    folhas.forEach((f, i) => {
      f.classList.toggle('ver', i === c || i === baixo || i === mov);
      f.classList.toggle('atual', i === c);
      f.classList.remove('dobrar', 'baixo');
      f.style.zIndex = i === mov ? 4 : i === c ? 3 : 1;
      f.inert = i !== c;
      const clip = f.querySelector(':scope > .clip');
      if (clip) { clip.style.cssText = ''; clip.firstElementChild.style.cssText = ''; }
    });
    aba.classList.remove('on');
    indicadores();
  }
  function indicadores(){
    const n = folhas.length, pontos = document.getElementById('pontos');
    pontos.hidden = n > 12;   // a partir de 12 folhas só "Semana x de N", para caber em 390 px
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
  function acabar(){ animando = false; if (op.aoAcabar) op.aoAcabar(); }

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
  // até onde a dobra tem de ir para a folha sair toda: maior projeção dos cantos na direção n
  function extensao(G, n){ return Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => (x - G.x) * n.x + (y - G.y) * n.y)) }

  // ---- mola em 2D: leva F até ao alvo, partindo da velocidade do dedo ----
  function mola(i, j, G, F0, V0, alvo, fim){
    animando = true;
    const F = { ...F0 }, V = { ...V0 }; let t0 = performance.now();
    const k = 240, amort = 30;
    const passo = t => {
      const dt = Math.min((t - t0) / 1000, 1 / 30); t0 = t;
      V.x += (k * (alvo.x - F.x) - amort * V.x) * dt; V.y += (k * (alvo.y - F.y) - amort * V.y) * dt;
      F.x += V.x * dt; F.y += V.y * dt;
      if (Math.hypot(alvo.x - F.x, alvo.y - F.y) < 0.6 && Math.hypot(V.x, V.y) < 20) { fim(); return; }
      desenhar(i, G, F, j); requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
  const alvoSaida = (G, F) => {   // F onde a folha que avança saiu toda
    const L = Math.hypot(F.x - G.x, F.y - G.y), n = L > 1 ? { x: (F.x - G.x) / L, y: (F.y - G.y) / L } : { x: -0.6, y: -0.8 };
    const e = 2 * extensao(G, n) + 40; return { x: G.x + n.x * e, y: G.y + n.y * e };
  };

  // ---- mudar de folha (setas, teclado, ligações) ----
  function irPara(i, { animar = true } = {}){
    if (animando || g || i === c || i < 0 || i >= folhas.length) return;
    medir();
    if (!animar || reduz()) { c = i; mudou(); acabar(); return; }
    if (i > c) {   // a folha atual enrola do canto de baixo à direita; a de destino fica por baixo
      const de = c; arrumar(de, i);
      const G = { x: W, y: H }, F = { x: W - 1, y: H - 1.3 };
      mola(de, i, G, F, { x: -260, y: -340 }, alvoSaida(G, F), () => { c = i; mudou(); acabar(); });
    } else {   // a de destino desenrola-se por cima, vinda da esquerda
      arrumar(i, c);
      const G = { x: W, y: H * 0.7 };
      mola(i, c, G, { x: -W - 40, y: G.y }, { x: 300, y: 0 }, G, () => { c = i; mudou(); acabar(); });
    }
  }

  // ---- gesto: esquerda/cima avança, direita/baixo volta; direção predominante nas diagonais ----
  const LADOS = { tl: 'lt', tr: 'rt', bl: 'lb', br: 'rb', t: 't', b: 'b', l: 'l', r: 'r' };   // margens que cada zona toca
  const OPOSTO = { l: 'r', r: 'l', t: 'b', b: 't' };
  const PARA_DENTRO = { l: { x: 1, y: 0 }, r: { x: -1, y: 0 }, t: { x: 0, y: 1 }, b: { x: 0, y: -1 } };
  const local = e => { const r = semanas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } };
  const pontoAgarrado = (z, p) => ({ tl: { x: 0, y: 0 }, tr: { x: W, y: 0 }, bl: { x: 0, y: H }, br: { x: W, y: H },
    t: { x: p.x, y: 0 }, b: { x: p.x, y: H }, l: { x: 0, y: p.y }, r: { x: W, y: p.y } })[z];
  const naMargem = (lado, p) => { const x = Math.max(0, Math.min(W, p.x)), y = Math.max(0, Math.min(H, p.y));
    return { l: { x: 0, y }, r: { x: W, y }, t: { x, y: 0 }, b: { x, y: H } }[lado] };

  function comecar(e){
    const z = e.target.dataset && e.target.dataset.z;
    if (!z || animando || g || !folhas.length) return;
    medir();
    g = { id: e.pointerId, z, p0: local(e), c0: { x: e.clientX, y: e.clientY }, modo: '', amostras: [] };
    try { zonas.setPointerCapture(e.pointerId) } catch (_) {}
    e.preventDefault();   // sem seleção de texto nem scroll a partir da zona
  }
  function mover(e){
    if (!g || e.pointerId !== g.id) return;
    const p = local(e), d = { x: p.x - g.p0.x, y: p.y - g.p0.y };
    if (!g.modo) {
      if (Math.hypot(d.x, d.y) < 6) return;
      const horiz = Math.abs(d.x) >= Math.abs(d.y);
      g.eixo = horiz ? 'x' : 'y';
      g.u = horiz ? { x: Math.sign(d.x), y: 0 } : { x: 0, y: Math.sign(d.y) };
      g.span = horiz ? W : H;
      // espaço do dedo até à borda do ecrã: um arrasto "para fora" a partir de uma margem tem pouco
      const ecra = horiz ? (d.x < 0 ? g.c0.x : innerWidth - g.c0.x) : (d.y < 0 ? g.c0.y : innerHeight - g.c0.y);
      g.alcance = Math.max(40, Math.min(g.span * 0.6, ecra));
      const de = horiz ? (d.x < 0 ? 'r' : 'l') : (d.y < 0 ? 'b' : 't');   // margem de onde o movimento parte
      const avanca = horiz ? d.x < 0 : d.y < 0;
      if (avanca ? c === folhas.length - 1 : c === 0) { g.modo = 'ressalto'; g.G = naMargem(de, g.p0); arrumar(c, c + 1); }
      else if (avanca) {
        arrumar(c, c + 1);
        if (LADOS[g.z].includes(de)) { g.modo = 'frente'; g.G = pontoAgarrado(g.z, g.p0); }   // o canto agarrado segue o dedo
        else { g.modo = 'frente-v'; g.G = naMargem(de, g.p0); }   // agarrou do outro lado: enrola a partir do lado oposto
      } else {
        g.modo = 'tras'; g.i = c - 1; arrumar(g.i, c);
        g.E = [...LADOS[g.z]].find(l => (horiz ? 'lr' : 'tb').includes(l)) || de;   // a anterior entra pela margem onde se começou
        g.e = PARA_DENTRO[g.E]; g.G = naMargem(OPOSTO[g.E], g.p0);
      }
    }
    const dAx = Math.abs(g.eixo === 'x' ? d.x : d.y), perp = g.eixo === 'x' ? { x: 0, y: d.y * 0.5 } : { x: d.x * 0.5, y: 0 };
    g.prog = Math.min(1.2, dAx / g.alcance);
    if (g.modo === 'frente') g.F = { x: g.G.x + d.x, y: g.G.y + d.y };
    else if (g.modo === 'frente-v') { const k = g.prog * 2 * g.span; g.F = { x: g.G.x + g.u.x * k + perp.x, y: g.G.y + g.u.y * k + perp.y }; }
    else if (g.modo === 'ressalto') { const k = Math.min(32, dAx); g.F = { x: g.G.x + g.u.x * k, y: g.G.y + g.u.y * k }; }
    else { const k = 2 * g.span * (1 - Math.min(1, g.prog)); g.F = { x: g.G.x - g.e.x * k + perp.x, y: g.G.y - g.e.y * k + perp.y }; }
    g.amostras.push([performance.now(), g.F.x, g.F.y]); if (g.amostras.length > 6) g.amostras.shift();
    if (!reduz()) g.modo === 'tras' ? desenhar(g.i, g.G, g.F, c) : desenhar(c, g.G, g.F, c + 1);
  }
  function largar(e){
    if (!g || (e && e.pointerId !== g.id)) return;
    const s = g.amostras, a = s[0], b = s[s.length - 1];
    const dt = a && b && b[0] > a[0] ? (b[0] - a[0]) / 1000 : 1;
    const V = a ? { x: (b[1] - a[1]) / dt, y: (b[2] - a[2]) / dt } : { x: 0, y: 0 };
    const { modo, G, F, i, prog, e: ent, span } = g; g = null;
    if (!modo) { acabar(); return; }
    const assenta = () => { arrumar(); acabar(); };
    if (modo === 'ressalto') { reduz() ? assenta() : mola(c, c + 1, G, F, V, G, assenta); return; }
    if (modo === 'tras') {
      const ve = V.x * ent.x + V.y * ent.y;   // velocidade no sentido em que a folha desenrola
      const completa = (prog > 0.45 || ve > 600) && ve > -400;
      if (reduz()) { if (completa) { c = i; mudou(); } else arrumar(); acabar(); return; }
      if (completa) mola(i, c, G, F, V, G, () => { c = i; mudou(); acabar(); });
      else mola(i, c, G, F, V, { x: G.x - ent.x * (2 * span + 40), y: G.y - ent.y * (2 * span + 40) }, assenta);
      return;
    }
    const L = Math.hypot(F.x - G.x, F.y - G.y), n = { x: (F.x - G.x) / (L || 1), y: (F.y - G.y) / (L || 1) };
    const q = L / (2 * extensao(G, n)), vn = V.x * n.x + V.y * n.y;
    // a dobra passou o meio da folha (q=0.25), ou um gesto rápido; a partir do lado oposto (pouco espaço até à borda) pede 40% do caminho
    const completa = (q > (modo === 'frente-v' ? 0.4 : 0.28) || vn > 700) && vn > -400;
    if (reduz()) { if (completa) { c++; mudou(); } else arrumar(); acabar(); return; }
    if (completa) { const de = c; mola(de, de + 1, G, F, V, alvoSaida(G, F), () => { c = de + 1; mudou(); acabar(); }); }
    else mola(c, c + 1, G, F, V, G, assenta);
  }

  function montar(caixa, opcoes = {}){
    op = opcoes;
    semanas = caixa.querySelector('#weeks');
    aba = caixa.querySelector('.aba'); abaClip = aba.querySelector('.aba-clip'); abaPapel = aba.querySelector('.aba-papel'); abaCurva = aba.querySelector('.aba-curva');
    zonas = caixa.querySelector('.zonas');
    zonas.addEventListener('pointerdown', comecar);
    zonas.addEventListener('pointermove', mover);
    zonas.addEventListener('pointerup', largar);
    zonas.addEventListener('pointercancel', largar);
    zonas.addEventListener('lostpointercapture', largar);   // botão largado fora da janela: a folha não fica presa
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
