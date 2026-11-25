{
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DIAS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const LABEL = {y:'Livre', m:'Talvez', n:'Ocupado'};
const $ = s => document.querySelector(s);
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fmt = d => d.getDate()+' '+MES[d.getMonth()];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Estado
let weeksShown = 6;
let pessoas = {};   // id -> nome
let disp = {};      // id -> { 'AAAA-MM-DD': 'y'|'m'|'n' }
let notas = {};     // id -> { 'AAAA-MM-DD': motivo do "Ocupado" }
let notaAberta = null;   // dia com o campo "Porquê?" aberto: só um de cada vez
let temNota = true;      // false se a coluna "nota" ainda não existir no Supabase (nota.sql por correr)
let sb = null;
let souNovo = false;  // escolheu "Sou novo no grupo" (ou tocou num dia): não mostrar o "Quem és tu?"

// Identidade: um id aleatório guardado neste browser
const store = {
  get(k){ try { return localStorage.getItem(k) } catch(e){ return null } },
  set(k,v){ try { localStorage.setItem(k,v) } catch(e){} }
};
let myId = store.get('fds_id');
if (!myId) { myId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random().toString(16).slice(2)); store.set('fds_id', myId); }

let soFds = store.get('fds_vista') === 'fds';

function mondays(n){
  const t = new Date(); t.setHours(0,0,0,0);
  const seg = new Date(t); seg.setDate(t.getDate() - (t.getDay()+6)%7);   // getDay: 0=domingo
  return Array.from({length:n}, (_,i) => { const d = new Date(seg); d.setDate(seg.getDate()+7*i); return d });
}
const nameOf = id => (pessoas[id] && pessoas[id].trim()) || 'Sem nome';
const mine = () => disp[myId] || (disp[myId] = {});
// Texto escrito por pessoas: espaços juntos, sem pontas, no máximo 40 caracteres (contados como o Postgres)
const limpaNota = s => Array.from(String(s || '').replace(/\s+/g, ' ').trim()).slice(0, 40).join('').trim();
const notaDe = (id, k) => limpaNota((notas[id] || {})[k]);
const poeNota = (k, t) => { const n = notas[myId] || (notas[myId] = {}); if (t) n[k] = t; else delete n[k] };
const rotulo = k => { const d = new Date(k+'T00:00'); return DIAS[(d.getDay()+6)%7].toLowerCase()+', '+fmt(d) };

// O teu motivo num dia em que estás Ocupado: campo aberto, ou texto com "editar"/"acrescentar motivo"
function motivoHtml(k){
  if (!temNota || mine()[k] !== 'n') return '';
  const nota = notaDe(myId, k);
  if (notaAberta === k) return `<div class="motivo">
    <label class="nota-lbl" for="nota-${k}">Estás ausente porque vais praticar o coito ou vais à saída de solteiros? Se quiseres, justifica a tua ausência.<span class="vh"> (${rotulo(k)})</span></label>
    <input type="text" class="nota-in" id="nota-${k}" data-k="${k}" maxlength="40" value="${esc(nota)}" placeholder="ex.: exame"
      aria-describedby="vis-${k}" enterkeyhint="done" autocomplete="off">
    <small id="vis-${k}">Visível para todo o grupo.</small></div>`;
  return `<div class="motivo">${nota ? `<span>Motivo: <b>${esc(nota)}</b></span>` : ''}
    <button type="button" class="linkbtn mini" data-nota="${k}" aria-label="${nota ? 'Editar o teu motivo' : 'Acrescentar motivo'} de ${rotulo(k)}">${nota ? 'editar' : 'acrescentar motivo'}</button></div>`;
}
// Etiqueta de quem respondeu; no Ocupado, o motivo fica à vista ("Rui · exame"), sem depender de hover
function chipHtml(a, k){
  const nota = a.v === 'n' ? notaDe(a.id, k) : '';
  return `<span class="chip ${a.v}${nota ? ' com-nota' : ''}" data-id="${a.id}" title="${LABEL[a.v]}"><span class="nm">${esc(nameOf(a.id))}</span>`
    + (a.v === 'm' ? '<span aria-hidden="true">?</span>' : '')
    + (nota ? `<span class="nt" aria-hidden="true"> · ${esc(nota)}</span>` : '')
    + `<span class="vh"> (${LABEL[a.v].toLowerCase()}${nota ? ': '+esc(nota) : ''})</span></span>`;
}
// Só troca o bloco do motivo (e a tua etiqueta) desse dia: um render completo substituía o botão em que se tocou a seguir e o clique perdia-se
function atualizarMotivo(k){
  const m = document.querySelector(`#d-${k} .motivo`);
  if (m) m.outerHTML = motivoHtml(k);
  const c = document.querySelector(`#d-${k} .chip[data-id="${myId}"]`);
  if (c && mine()[k]) c.outerHTML = chipHtml({ id: myId, v: mine()[k] }, k);
}

let aRedesenhar = false;
function render(){
  // quem está a escrever o motivo não perde o texto, o foco nem o cursor quando a página se redesenha (ex.: tempo real)
  const ativo = document.activeElement;
  const rascunho = ativo && ativo.classList.contains('nota-in') ? { k: ativo.dataset.k, v: ativo.value, a: ativo.selectionStart, b: ativo.selectionEnd } : null;
  aRedesenhar = true;
  try { desenhar() } finally { aRedesenhar = false }
  const i = rascunho && document.querySelector(`.nota-in[data-k="${rascunho.k}"]`);
  if (i) { i.value = rascunho.v; i.focus({ preventScroll: true }); i.setSelectionRange(rascunho.a, rascunho.b) }
}
function desenhar(){
  const ids = Object.keys(disp).filter(id => Object.keys(disp[id]).length);
  const grupo = new Set([...Object.keys(pessoas), ...ids]).size || 1;
  const hoje = iso(new Date());
  const cands = [];
  $('#weeks').classList.toggle('only-we', soFds);
  $('#weeks').innerHTML = mondays(weeksShown).map((seg,wi) => {
    const dom = new Date(seg); dom.setDate(seg.getDate()+6);
    const passados = []; let porMarcar = 0, marcados = 0;
    const days = DIAS.map((name,off) => {
      if (soFds && off < 4) return '';
      const d = new Date(seg); d.setDate(seg.getDate()+off); const k = iso(d);
      const past = k < hoje;
      if (past) passados.push(name); else { porMarcar++; if (mine()[k]) marcados++ }
      const ans = ids.map(id => ({id, v: disp[id][k]})).filter(a => a.v)
                     .sort((a,b) => 'ymn'.indexOf(a.v)-'ymn'.indexOf(b.v) || nameOf(a.id).localeCompare(nameOf(b.id)));
      const y = ans.filter(a => a.v==='y').length, m = ans.filter(a => a.v==='m').length;
      if (!past && y > 0) cands.push({y, m, k, name, d, ans});
      const my = mine()[k] || '';
      return `<div class="day${off>=5 ? ' we' : ''}${past ? ' past' : ''}" data-k="${k}" id="d-${k}">
        <div class="dname">${name}<span class="n">${fmt(d)}</span></div>
        <div class="bar" role="img" aria-label="${y} ${y===1 ? 'livre' : 'livres'}, ${m} talvez, de ${grupo}"><i class="m" style="--v:${(y+m)/grupo}"></i><i class="y" style="--v:${y/grupo}"></i></div>
        <div class="who">${ans.map(a => chipHtml(a, k)).join('')}</div>
        ${past ? '' : `<div class="pick" role="group" aria-label="A tua disponibilidade, ${name} ${fmt(d)}">
          ${['y','m','n'].map(v => `<button type="button" class="${v}" data-k="${k}" data-v="${v}" aria-pressed="${my===v}"><svg class="ok" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>${LABEL[v]}</button>`).join('')}
        </div>${motivoHtml(k)}`}</div>`;
    }).join('');
    const title = wi===0 ? 'Esta semana' : wi===1 ? 'Próxima semana' : 'Semana de '+fmt(seg);
    const range = wi < 2 ? `${fmt(seg)} – ${fmt(dom)}` : `até ${fmt(dom)}`;
    // no telemóvel os dias passados ficam numa só linha (o CSS esconde os .day.past)
    const pastline = passados.length ? `<p class="pastline">${passados.length===1 ? passados[0]+' já passou.' : passados[0]+' a '+passados.at(-1).toLowerCase()+' já passaram.'}</p>` : '';
    const feito = !porMarcar ? '' : marcados === porMarcar ? ' · <b class="feito">marcaste tudo</b>' : ` · marcaste ${marcados} de ${porMarcar}`;
    return `<article class="wk"><header><h2>${title}</h2><small>${range}${feito}</small></header><div class="days">${pastline}${days}</div></article>`;
  }).join('');

  // Mais livres primeiro, depois mais "talvez", depois o mais cedo
  cands.sort((a,b) => b.y-a.y || b.m-a.m || a.k.localeCompare(b.k));
  const best = cands[0];
  const b = $('#best');
  if (best) {
    b.className = 'best';
    const conta = c => `${c.y} ${c.y===1 ? 'livre' : 'livres'}${c.m ? ` e ${c.m} talvez` : ''}`;
    const nomes = v => new Intl.ListFormat('pt-PT').format(best.ans.filter(a => a.v===v).map(a => esc(nameOf(a.id))));
    b.innerHTML = `<h2 class="t"><span class="lbl">Melhor dia:</span> <a href="#d-${best.k}">${best.name}, ${fmt(best.d)}</a></h2>
      <p class="s"><span class="nomes">${nomes('y')}</span>${best.m ? ` · talvez ${nomes('m')}` : ''}</p>
      ${cands.length > 1 ? `<p class="top3"><b>Também dá:</b> ${cands.slice(1,3).map(c =>
        `<a href="#d-${c.k}">${c.name}, ${fmt(c.d)}</a> (${conta(c)})`).join(' · ')}</p>` : ''}`;
    const el = document.querySelector(`.day[data-k="${best.k}"]`); if (el) el.classList.add('top');
  } else {
    b.className = 'best empty';
    b.innerHTML = '<h2 class="t">Ainda ninguém está livre</h2><p class="s">Marca os dias em que podes e o melhor aparece aqui.</p>';
  }

  const outros = Object.keys(pessoas).filter(id => id !== myId && pessoas[id].trim())
    .sort((a,b) => nameOf(a).localeCompare(nameOf(b)));
  const sel = $('#claim'), cur = sel.value;
  sel.innerHTML = '<option value="">Escolhe o teu nome</option>' +
    outros.map(id => `<option value="${id}">${esc(nameOf(id))}</option>`).join('');
  sel.value = cur;

  // "Quem és tu?": dispositivo sem nome num grupo que já tem pessoas
  const ola = !souNovo && !$('#nick').value.trim() && outros.length > 0;
  $('#ola').hidden = !ola; $('.me').hidden = ola;
  const botoes = outros.map(id => `<button class="sec" type="button" data-id="${id}">${esc(nameOf(id))}</button>`).join('');
  if (ola && $('#olanomes').innerHTML !== botoes) $('#olanomes').innerHTML = botoes;   // só refaz se mudou: não tirar o foco a quem usa o teclado
}

function status(t, erro){
  const el = $('#status');
  if (el.textContent !== t) el.textContent = t;   // role=status: não repetir o anúncio a cada atualização
  el.classList.toggle('erro', !!erro);
}

// Aviso curto em baixo do ecrã, perto de onde se toca
let toastTimer = null, toastAcao = null;
function toast(t, erro, acao){   // acao = { label, fn }: botão no aviso, que recebe o foco
  const el = $('#toast');
  el.textContent = t; el.classList.toggle('erro', !!erro); el.classList.add('on');
  toastAcao = acao || null;
  el.classList.toggle('acao', !!acao);
  if (acao) { const b = document.createElement('button'); b.type = 'button'; b.textContent = acao.label; el.append(' ', b); b.focus() }
  clearTimeout(toastTimer); toastTimer = setTimeout(() => {
    if (el.contains(document.activeElement)) $('#claim').focus();   // não deixar o foco perdido num aviso escondido
    el.classList.remove('on', 'acao'); toastAcao = null;
  }, acao ? 8000 : erro ? 6000 : 2200);
}
function erroPt(acao, e){
  console.error(acao, e);
  const m = String((e && e.message) || e);
  if (/fetch|network|Failed/i.test(m)) return `Sem ligação: não deu para ${acao}. Tenta outra vez.`;
  if (e && (e.code === '42501' || e.code === 'PGRST301')) return `Sem permissão para ${acao}.`;
  return `Não deu para ${acao}. Tenta outra vez.`;
}
// Toque feito sem nome: fica guardado e aplica-se quando o nome estiver escrito
let pendente = null;
function pedirNome(k, v){
  const n = $('#nick');
  pendente = { k, v };
  if (!souNovo) { souNovo = true; render() }   // fecha o "Quem és tu?" para mostrar o campo do nome
  const dn = document.getElementById('d-'+k).querySelector('.dname');
  $('#nickdica').textContent = `Escreve o teu nome: o teu "${LABEL[v]}" de ${dn.firstChild.textContent.toLowerCase()}, ${dn.querySelector('.n').textContent} fica marcado a seguir.`;
  $('#nickdica').hidden = false;
  n.setAttribute('aria-invalid', 'true');
  n.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  n.focus({ preventScroll: true });
}

// ---- Escritas ----
let pessoaGuardada = false;
async function ensurePessoa(){
  if (pessoaGuardada) return true;
  const nome = $('#nick').value.trim();
  const { error } = await sb.from('pessoas').upsert({ id: myId, nome });
  if (error) { toast(erroPt('guardar o teu nome', error), true); return false }
  pessoas[myId] = nome; pessoaGuardada = true; return true;
}

async function setDia(k, v){
  if (!$('#nick').value.trim()) { pedirNome(k, v); return }   // sem nome, os outros não sabem quem marcou
  const antes = mine()[k], notaAntes = notaDe(myId, k);
  if (antes === v) delete mine()[k]; else mine()[k] = v;
  poeNota(k, '');   // mudar de estado (ou desmarcar) apaga o motivo
  notaAberta = mine()[k] === 'n' ? k : (notaAberta === k ? null : notaAberta);   // acabaste de marcar Ocupado: abre o "Porquê?"
  const repor = () => { if (antes) mine()[k] = antes; else delete mine()[k]; poeNota(k, notaAntes); if (notaAberta === k) notaAberta = null; render() };
  render();
  const tocado = document.querySelector(`.pick button[data-k="${k}"][data-v="${v}"][aria-pressed="true"]`);
  if (tocado) tocado.classList.add('pop');   // só o botão tocado anima (o CSS desliga com movimento reduzido)
  if (!sb) return;
  if (!(await ensurePessoa())) return repor();
  const novo = mine()[k];
  const gravar = () => novo
    ? sb.from('disponibilidade').upsert({ pessoa_id: myId, dia: k, estado: novo, atualizado_em: new Date().toISOString(), ...(temNota ? { nota: null } : {}) })
    : sb.from('disponibilidade').delete().eq('pessoa_id', myId).eq('dia', k);
  let { error } = await gravar();
  if (error && error.code === 'PGRST204' && temNota) { temNota = false; render(); ({ error } = await gravar()) }   // coluna "nota" ainda não existe: grava sem ela
  if (error && error.code === '23503') { // a linha em "pessoas" desapareceu (ex.: apagada no Supabase): recria e tenta de novo
    pessoaGuardada = false;
    if (await ensurePessoa()) ({ error } = await gravar());
  }
  if (error) { repor(); toast(erroPt('guardar', error), true) }   // repõe se falhou
  else toast(mine()[k] ? 'Guardado.' : 'Marcação removida.');
}

async function guardarNota(k, texto){
  const nova = limpaNota(texto), antes = notaDe(myId, k);
  notaAberta = null;
  if (mine()[k] !== 'n' || nova === antes) return atualizarMotivo(k);
  poeNota(k, nova); atualizarMotivo(k);
  if (!sb) return;
  const { error } = await sb.from('disponibilidade')
    .upsert({ pessoa_id: myId, dia: k, estado: 'n', nota: nova || null, atualizado_em: new Date().toISOString() });
  if (!error) return toast(nova ? 'Motivo guardado.' : 'Motivo apagado.');
  poeNota(k, antes);
  if (error.code === 'PGRST204') { temNota = false; render(); return toast('Os motivos ainda não estão ligados no Supabase.', true) }
  atualizarMotivo(k); toast(erroPt('guardar o motivo', error), true);
}
// Grava ao sair do campo (Enter também sai); Escape desiste do que se escreveu
document.addEventListener('focusout', e => {
  if (e.target.classList && e.target.classList.contains('nota-in') && !aRedesenhar) guardarNota(e.target.dataset.k, e.target.value);
});
document.addEventListener('keydown', e => {
  if (!e.target.classList || !e.target.classList.contains('nota-in')) return;
  if (e.key === 'Escape') e.target.value = notaDe(myId, e.target.dataset.k);
  if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.target.blur() }
});

let nickTimer = null;
$('#nick').addEventListener('input', e => {
  const nome = e.target.value.slice(0,24);
  store.set('fds_nome', nome);
  if (nome.trim()) { $('#nickdica').hidden = true; e.target.removeAttribute('aria-invalid') }
  pessoas[myId] = nome.trim(); render();
  clearTimeout(nickTimer);
  // nome igual ao de outra pessoa: provavelmente é ela noutro dispositivo; não gravar um duplicado sem perguntar
  const norm = s => s.trim().toLocaleLowerCase('pt').normalize('NFD').replace(/\p{M}/gu, '');
  dupId = nome.trim() ? Object.keys(pessoas).find(id => id !== myId && norm(pessoas[id]) === norm(nome)) : undefined;
  const dup = $('#nickdup');
  dup.hidden = !dupId;
  if (dupId) { dup.innerHTML = `<span>Já existe <b>${esc(pessoas[dupId].trim())}</b> no grupo. É o teu nome?</span> <button type="button" id="soueu">Sou eu</button>`; return }
  nickTimer = setTimeout(async () => {
    if (!sb) return;
    const { error } = await sb.from('pessoas').upsert({ id: myId, nome: nome.trim() });
    if (error) toast(erroPt('guardar o teu nome', error), true);
    else { pessoaGuardada = true; if (!pendente) toast('Nome guardado.') }
  }, 600);
});
let dupId;
function aplicarPendente(){
  if (!pendente || !$('#nick').value.trim() || dupId) return;   // com nome repetido, espera pelo "Sou eu"
  const { k, v } = pendente; pendente = null;
  clearTimeout(nickTimer); pessoaGuardada = false;   // o setDia grava o nome e a marcação de uma vez
  if (mine()[k] !== v) setDia(k, v);   // setDia alterna: não desmarcar se já estava assim
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('d-'+k).scrollIntoView({ block: 'center', behavior: reduz ? 'auto' : 'smooth' });
}
$('#nick').addEventListener('change', aplicarPendente);   // Enter ou sair do campo

function serComo(id, nome){
  myId = id; store.set('fds_id', id); pessoaGuardada = pessoas[id] !== undefined;
  $('#nick').value = nome; store.set('fds_nome', nome);
  $('#nickdica').hidden = true; $('#nick').removeAttribute('aria-invalid');
  dupId = undefined; $('#nickdup').hidden = true;
  notaAberta = null;
  render();
}
function trocarPara(id){
  const antes = { id: myId, nome: $('#nick').value };
  serComo(id, pessoas[id] || '');
  toast('Agora marcas como '+nameOf(id)+'.', false, { label: 'Desfazer', fn: () => {
    serComo(antes.id, antes.nome);
    toast(antes.nome.trim() ? 'Voltaste a marcar como '+antes.nome.trim()+'.' : 'Troca desfeita.');
    ($('#ola').hidden ? $('#nick') : $('#olanomes button')).focus();
  }});
  aplicarPendente();
}
// Escolher um nome não troca logo: pede "Sou eu" e depois oferece "Desfazer"
$('#claim').addEventListener('change', e => {
  const id = e.target.value; e.target.value = ''; if (!id) return;
  toast('Marcar como '+nameOf(id)+'?', false, { label: 'Sou eu', fn: () => trocarPara(id) });
});

document.addEventListener('click', e => {
  if (e.target.closest('.toast button') && toastAcao) { toastAcao.fn(); return }
  if (e.target.id === 'soueu' && dupId) { trocarPara(dupId); return }
  const ola = e.target.closest('#olanomes button');
  if (ola) { trocarPara(ola.dataset.id); return }
  if (e.target.id === 'novo') { souNovo = true; render(); $('#nick').focus(); return }
  const ed = e.target.closest('button[data-nota]');
  if (ed) {   // abre o campo nesse dia e fecha o que estiver aberto noutro
    const antes = notaAberta; notaAberta = ed.dataset.nota;
    if (antes && antes !== notaAberta) atualizarMotivo(antes);
    atualizarMotivo(notaAberta);
    const i = document.querySelector(`.nota-in[data-k="${notaAberta}"]`); if (i) i.focus();
    return;
  }
  const bt = e.target.closest('.pick button');
  if (bt) { setDia(bt.dataset.k, bt.dataset.v); return }
  if (e.target.id === 'more') { weeksShown += 4; render() }
});

$('#vista').value = soFds ? 'fds' : 'all';
$('#vista').addEventListener('change', e => {
  soFds = e.target.value === 'fds'; store.set('fds_vista', e.target.value); render();
});

// ---- Leitura e tempo real ----
async function carregar(){
  const desde = iso(mondays(1)[0]);
  const [p, d] = await Promise.all([
    sb.from('pessoas').select('id,nome'),
    sb.from('disponibilidade').select('*').gte('dia', desde)   // '*': não falha se a coluna "nota" ainda não existir
  ]);
  if (p.error || d.error) throw (p.error || d.error);
  pessoas = {}; p.data.forEach(r => pessoas[r.id] = r.nome || '');
  disp = {}; notas = {};
  d.data.forEach(r => {
    (disp[r.pessoa_id] ||= {})[r.dia] = r.estado;
    if (r.estado === 'n' && r.nota) (notas[r.pessoa_id] ||= {})[r.dia] = r.nota;
  });
  if (d.data.length) temNota = 'nota' in d.data[0];
  if (pessoas[myId] !== undefined) { pessoaGuardada = true; if (!$('#nick').value) $('#nick').value = pessoas[myId] }
  const n = Object.keys(pessoas).length;
  status(n ? `${n} ${n===1 ? 'pessoa no grupo' : 'pessoas no grupo'}. Atualiza sozinho quando alguém marca.` : 'Ainda ninguém respondeu. Sê o primeiro.');
  render();
}

$('#nick').value = store.get('fds_nome') || '';
if ($('#nick').value) pessoas[myId] = $('#nick').value.trim();
render();

if (!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.includes('O-TEU-PROJETO')) {
  $('#warn').innerHTML = '<div class="warn">Falta configurar o Supabase em <b>config.js</b>. Por agora as marcações ficam só nesta janela.</div>';
  status('Modo local.');
} else {
  sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  carregar().catch(err => status('Erro a ligar ao Supabase: '+(err.message || err), true));
  let t = null;
  const recarregar = () => { clearTimeout(t); t = setTimeout(() => carregar().catch(err => status('Erro a atualizar: '+(err.message || err), true)), 300) };
  sb.channel('fds')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilidade' }, recarregar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, recarregar)
    .subscribe((s, err) => {
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') status('Tempo real indisponível ('+s+'). Recarrega a página para veres alterações dos outros.', true);
      if (s === 'SUBSCRIBED') recarregar();   // apanha o que mudou enquanto a ligação esteve em baixo
    });
}
}
