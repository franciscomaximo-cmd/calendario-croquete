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
let sb = null;

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

function render(){
  const ids = Object.keys(disp).filter(id => Object.keys(disp[id]).length);
  const grupo = new Set([...Object.keys(pessoas), ...ids]).size || 1;
  const hoje = iso(new Date());
  const cands = [];
  $('#weeks').classList.toggle('only-we', soFds);
  $('#weeks').innerHTML = mondays(weeksShown).map((seg,wi) => {
    const dom = new Date(seg); dom.setDate(seg.getDate()+6);
    const days = DIAS.map((name,off) => {
      if (soFds && off < 4) return '';
      const d = new Date(seg); d.setDate(seg.getDate()+off); const k = iso(d);
      const past = k < hoje;
      const ans = ids.map(id => ({id, v: disp[id][k]})).filter(a => a.v)
                     .sort((a,b) => 'ymn'.indexOf(a.v)-'ymn'.indexOf(b.v) || nameOf(a.id).localeCompare(nameOf(b.id)));
      const y = ans.filter(a => a.v==='y').length, m = ans.filter(a => a.v==='m').length;
      if (!past && y > 0) cands.push({y, m, k, name, d});
      const my = mine()[k] || '';
      return `<div class="day${off>=5 ? ' we' : ''}${past ? ' past' : ''}" data-k="${k}" id="d-${k}">
        <div class="dname">${name}<span class="n">${fmt(d)}</span></div>
        <div class="bar" aria-label="${y} livres, ${m} talvez"><i style="width:${y/grupo*100}%;background:var(--yes)"></i><i style="width:${m/grupo*100}%;background:var(--maybe)"></i></div>
        <div class="who">${ans.map(a => `<span class="chip ${a.v}" title="${LABEL[a.v]}">${esc(nameOf(a.id))}</span>`).join('') || '<span style="color:var(--mute);font-size:13px">Sem respostas</span>'}</div>
        ${past ? '' : `<div class="pick" role="group" aria-label="A tua disponibilidade, ${name} ${fmt(d)}">
          ${['y','m','n'].map(v => `<button type="button" class="${v}" data-k="${k}" data-v="${v}" aria-pressed="${my===v}">${LABEL[v]}</button>`).join('')}
        </div>`}</div>`;
    }).join('');
    const title = wi===0 ? 'Esta semana' : wi===1 ? 'Próxima semana' : 'Semana de '+fmt(seg);
    const range = wi < 2 ? `${fmt(seg)} – ${fmt(dom)}` : `até ${fmt(dom)}`;
    return `<article class="wk"><header><h2>${title}</h2><small>${range}</small></header><div class="days">${days}</div></article>`;
  }).join('');

  // Mais livres primeiro, depois mais "talvez", depois o mais cedo
  cands.sort((a,b) => b.y-a.y || b.m-a.m || a.k.localeCompare(b.k));
  const best = cands[0];
  const b = $('#best');
  if (best) {
    b.className = 'best';
    const conta = c => `${c.y} ${c.y===1 ? 'livre' : 'livres'}${c.m ? ` e ${c.m} talvez` : ''}`;
    b.innerHTML = `<h2 class="t"><span class="lbl">Melhor dia:</span> <a href="#d-${best.k}">${best.name}, ${fmt(best.d)}</a></h2>
      <p class="s">${conta(best)}, de ${grupo} ${grupo===1 ? 'pessoa' : 'pessoas'}.</p>
      ${cands.length > 1 ? `<div class="top3"><b>Top 3</b><ol>${cands.slice(0,3).map(c =>
        `<li><a href="#d-${c.k}">${c.name}, ${fmt(c.d)}</a> · ${conta(c)}</li>`).join('')}</ol></div>` : ''}`;
    const el = document.querySelector(`.day[data-k="${best.k}"]`); if (el) el.classList.add('top');
  } else {
    b.className = 'best empty';
    b.innerHTML = '<h2 class="t">Ainda ninguém está livre</h2><p class="s">Marca os dias em que podes e o melhor aparece aqui.</p>';
  }

  const sel = $('#claim'), cur = sel.value;
  sel.innerHTML = '<option value="">Escolhe o teu nome</option>' +
    Object.keys(pessoas).filter(id => id !== myId && pessoas[id].trim())
      .sort((a,b) => nameOf(a).localeCompare(nameOf(b)))
      .map(id => `<option value="${id}">${esc(nameOf(id))}</option>`).join('');
  sel.value = cur;
}

function status(t){ $('#status').textContent = t }

// Aviso curto em baixo do ecrã, perto de onde se toca
let toastTimer = null;
function toast(t, erro){
  const el = $('#toast');
  el.textContent = t; el.classList.toggle('erro', !!erro); el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), erro ? 6000 : 2200);
}
function erroPt(acao, e){
  console.error(acao, e);
  const m = String((e && e.message) || e);
  if (/fetch|network|Failed/i.test(m)) return `Sem ligação: não deu para ${acao}. Tenta outra vez.`;
  if (e && (e.code === '42501' || e.code === 'PGRST301')) return `Sem permissão para ${acao}.`;
  return `Não deu para ${acao}. Tenta outra vez.`;
}
function pedirNome(){
  const n = $('#nick');
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
  if (!$('#nick').value.trim()) { pedirNome(); return }   // sem nome, os outros não sabem quem marcou
  const antes = mine()[k];
  if (antes === v) delete mine()[k]; else mine()[k] = v;
  render();
  if (!sb) return;
  if (!(await ensurePessoa())) { if (antes) mine()[k] = antes; else delete mine()[k]; render(); return }
  const novo = mine()[k];
  const gravar = () => novo
    ? sb.from('disponibilidade').upsert({ pessoa_id: myId, dia: k, estado: novo, atualizado_em: new Date().toISOString() })
    : sb.from('disponibilidade').delete().eq('pessoa_id', myId).eq('dia', k);
  let { error } = await gravar();
  if (error && error.code === '23503') { // a linha em "pessoas" desapareceu (ex.: apagada no Supabase): recria e tenta de novo
    pessoaGuardada = false;
    if (await ensurePessoa()) ({ error } = await gravar());
  }
  if (error) { // repõe se falhou
    if (antes) mine()[k] = antes; else delete mine()[k];
    render(); toast(erroPt('guardar', error), true);
  } else toast(mine()[k] ? 'Guardado.' : 'Marcação removida.');
}

let nickTimer = null;
$('#nick').addEventListener('input', e => {
  const nome = e.target.value.slice(0,24);
  store.set('fds_nome', nome);
  if (nome.trim()) { $('#nickdica').hidden = true; e.target.removeAttribute('aria-invalid') }
  pessoas[myId] = nome.trim(); render();
  clearTimeout(nickTimer);
  nickTimer = setTimeout(async () => {
    if (!sb) return;
    const { error } = await sb.from('pessoas').upsert({ id: myId, nome: nome.trim() });
    if (error) toast(erroPt('guardar o teu nome', error), true);
    else { pessoaGuardada = true; toast('Nome guardado.') }
  }, 600);
});

$('#claim').addEventListener('change', e => {
  const id = e.target.value; if (!id) return;
  myId = id; store.set('fds_id', id); pessoaGuardada = true;
  $('#nick').value = pessoas[id] || ''; store.set('fds_nome', $('#nick').value);
  $('#nickdica').hidden = true; $('#nick').removeAttribute('aria-invalid');
  e.target.value = ''; render(); toast('Agora estás a marcar como '+nameOf(id)+'.');
});

document.addEventListener('click', e => {
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
    sb.from('disponibilidade').select('pessoa_id,dia,estado').gte('dia', desde)
  ]);
  if (p.error || d.error) throw (p.error || d.error);
  pessoas = {}; p.data.forEach(r => pessoas[r.id] = r.nome || '');
  disp = {}; d.data.forEach(r => (disp[r.pessoa_id] ||= {})[r.dia] = r.estado);
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
  carregar().catch(err => status('Erro a ligar ao Supabase: '+(err.message || err)));
  let t = null;
  const recarregar = () => { clearTimeout(t); t = setTimeout(() => carregar().catch(err => status('Erro a atualizar: '+(err.message || err))), 300) };
  sb.channel('fds')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilidade' }, recarregar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, recarregar)
    .subscribe((s, err) => {
      console.log('[tempo real]', s, err || '');
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') status('Tempo real indisponível ('+s+'). Recarrega a página para veres alterações dos outros.');
      if (s === 'SUBSCRIBED') recarregar();   // apanha o que mudou enquanto a ligação esteve em baixo
    });
}
}
