{
// Página de admin: só funciona depois de correr admin.sql (ver README). Usa a mesma anon key
// pública do site; o que o admin pode fazer decide-se no Supabase (RLS + is_admin()).
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s).trim().toLocaleLowerCase('pt').normalize('NFD').replace(/\p{M}/gu, '');
const data = t => { const d = new Date(t); return d.getDate()+' '+MES[d.getMonth()]+(d.getFullYear() !== new Date().getFullYear() ? ' '+d.getFullYear() : '') };
const marc = n => n+' '+(n === 1 ? 'marcação' : 'marcações');
const nomeDe = p => p.nome.trim() || 'Sem nome';

let sb = null, pessoas = [];

function status(t, erro){ const el = $('#status'); if (el.textContent !== t) el.textContent = t; el.classList.toggle('erro', !!erro) }
let toastTimer = null;
function toast(t, erro){
  const el = $('#toast');
  el.textContent = t; el.classList.toggle('erro', !!erro); el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), erro ? 6000 : 2500);
}
function erroPt(acao, e){
  const m = String((e && e.message) || e);
  if (/fetch|network|Failed/i.test(m)) return `Sem ligação: não deu para ${acao}.`;
  if (e && e.code === '42501') return `Sem permissão para ${acao}.`;
  return `Não deu para ${acao}: ${m}`;
}

function mostrarLogin(){ $('#login').hidden = false; $('#painel').hidden = true; status(''); $('#email').focus() }
async function mostrarPainel(sessao){
  $('#login').hidden = true; $('#painel').hidden = false;
  $('#quem').textContent = 'Entraste como '+sessao.user.email+'.';
  const { data: admin, error } = await sb.rpc('is_admin');
  if (error) return status('Falta correr o admin.sql no Supabase ('+error.message+').', true);
  if (!admin) { $('#lista').innerHTML = ''; return status('Esta conta não é admin: o email não está na tabela admins.', true) }
  carregar();
}

async function carregar(){
  status('A carregar…');
  // contagem e última marcação feitas no Supabase: não traz as marcações todas (o limite é 1000 linhas por pedido)
  const { data: rows, error } = await sb.from('pessoas')
    .select('id,nome,criado_em,marcas:disponibilidade(count),ultima:disponibilidade(atualizado_em)')
    .order('atualizado_em', { referencedTable: 'ultima', ascending: false })
    .limit(1, { referencedTable: 'ultima' });
  if (error) return status(erroPt('carregar as pessoas', error), true);
  pessoas = rows.map(r => ({ id: r.id, nome: r.nome || '', criado_em: r.criado_em,
    n: (r.marcas[0] && r.marcas[0].count) || 0, ultima: r.ultima[0] && r.ultima[0].atualizado_em }));
  // nomes iguais (sem maiúsculas nem acentos) ficam juntos e destacados
  pessoas.sort((a,b) => norm(a.nome).localeCompare(norm(b.nome)) || a.criado_em.localeCompare(b.criado_em));
  const conta = {}; pessoas.forEach(p => conta[norm(p.nome)] = (conta[norm(p.nome)] || 0) + 1);
  const reps = pessoas.filter(p => conta[norm(p.nome)] > 1).length;
  render(conta);
  status(`${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'}${reps ? ` · ${reps} com nome repetido` : ''}.`);
}

function render(conta){
  $('#lista').innerHTML = pessoas.map(p => {
    const rep = conta[norm(p.nome)] > 1;
    const outros = pessoas.filter(o => o.id !== p.id)
      .map(o => `<option value="${o.id}">${esc(nomeDe(o))} (${marc(o.n)}, criada a ${data(o.criado_em)})</option>`).join('');
    return `<li class="pessoa${rep ? ' rep' : ''}" data-id="${p.id}">
      <form class="linha renomear">
        <label class="campo">Nome<input type="text" name="nome" maxlength="24" value="${esc(p.nome)}" required></label>
        <button class="sec" type="submit">Guardar</button>
      </form>
      <p class="meta">${rep ? '<b class="tag">repetido</b> ' : ''}criada a ${data(p.criado_em)} · ${marc(p.n)}${p.ultima ? ' · última a '+data(p.ultima) : ''}</p>
      <div class="linha">
        ${outros ? `<label class="campo">Juntar em<select name="destino"><option value="">Escolhe…</option>${outros}</select></label>
        <button class="sec" type="button" data-a="juntar">Juntar</button>` : ''}
        <button class="sec perigo" type="button" data-a="apagar">Apagar</button>
      </div>
    </li>`;
  }).join('') || '<li class="pessoa">Ainda não há pessoas.</li>';
}

// Pedidos que o RLS recusa não dão erro: devolvem 0 linhas. Por isso pede-se a linha de volta.
async function renomear(p, nome){
  const { data: r, error } = await sb.from('pessoas').update({ nome }).eq('id', p.id).select('id');
  if (error || !r.length) return toast(error ? erroPt('mudar o nome', error) : 'Sem permissão para mudar o nome.', true);
  toast(`Nome mudado para ${nome}.`); carregar();
}
async function apagar(p){
  if (!confirm(`Apagar ${nomeDe(p)}? Perde ${marc(p.n)}. Não dá para desfazer.`)) return;
  const { data: r, error } = await sb.from('pessoas').delete().eq('id', p.id).select('id');
  if (error || !r.length) return toast(error ? erroPt('apagar', error) : 'Sem permissão para apagar.', true);
  toast(`${nomeDe(p)} apagada.`); carregar();
}
async function juntar(p, d){
  if (!confirm(`Juntar ${nomeDe(p)} (${marc(p.n)}) em ${nomeDe(d)} (${marc(d.n)})?\n\nAs marcações passam para ${nomeDe(d)}; nos dias em comum fica a de ${nomeDe(d)}. Depois ${nomeDe(p)} é apagada.`)) return;
  const { data: passadas, error } = await sb.rpc('juntar_pessoas', { origem: p.id, destino: d.id });
  if (error) return toast(erroPt('juntar', error), true);
  toast(`Juntado: passaram ${marc(passadas)} para ${nomeDe(d)}.`); carregar();
}

$('#lista').addEventListener('submit', e => {
  e.preventDefault();
  const p = pessoas.find(x => x.id === e.target.closest('.pessoa').dataset.id);
  const nome = e.target.nome.value.trim();
  if (p && nome && nome !== p.nome) renomear(p, nome);
});
$('#lista').addEventListener('click', e => {
  const bt = e.target.closest('button[data-a]'); if (!bt) return;
  const li = bt.closest('.pessoa'), p = pessoas.find(x => x.id === li.dataset.id);
  if (bt.dataset.a === 'apagar') return apagar(p);
  const d = pessoas.find(x => x.id === li.querySelector('select[name=destino]').value);
  if (!d) return toast('Escolhe primeiro em quem juntar.', true);
  juntar(p, d);
});

// ---- Password (nunca guardada nem escrita na consola: só passa dos campos para o Supabase) ----
function validarNova(nova, rep){
  if (nova.length < 8) return 'A nova password tem de ter pelo menos 8 caracteres.';
  if (nova !== rep) return 'As duas passwords novas não coincidem.';
  return '';
}
function erroPw(e){
  const m = String((e && e.message) || '');
  if (e && (e.code === 'same_password' || /different from the old/i.test(m))) return 'A nova password tem de ser diferente da atual.';
  if (e && e.code === 'weak_password') return 'O Supabase achou a nova password demasiado fraca. Escolhe outra mais longa.';
  if (/fetch|network|Failed/i.test(m)) return 'Sem ligação: a password não foi mudada.';
  return 'Não deu para mudar a password. Tenta outra vez.';
}
function erroEm(id, t){ const el = $(id); el.textContent = t; el.hidden = !t }
// Desativa o botão enquanto grava e repõe-no no fim, mesmo com erro
async function aGravar(form, fn){
  const bt = form.querySelector('button[type=submit]'), txt = bt.textContent;
  bt.disabled = true; bt.textContent = 'A guardar…';
  try { await fn() } finally { bt.disabled = false; bt.textContent = txt }
}

$('#mudarpw').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target, atual = $('#pwatual').value, nova = $('#pwnova').value;
  erroEm('#pwerro', '');
  if (!atual) return erroEm('#pwerro', 'Escreve a password atual.');
  const invalida = validarNova(nova, $('#pwrep').value);
  if (invalida) return erroEm('#pwerro', invalida);
  aGravar(form, async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return mostrarLogin();
    // o updateUser não pede a password atual: confirma-se primeiro com um login
    const { error: e1 } = await sb.auth.signInWithPassword({ email: session.user.email, password: atual });
    if (e1) return erroEm('#pwerro', e1.status === 400 ? 'A password atual não está certa.' : erroPw(e1));
    const { error: e2 } = await sb.auth.updateUser({ password: nova });
    if (e2) return erroEm('#pwerro', erroPw(e2));
    form.reset(); toast('Password mudada.');
  });
});

$('#login').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#loginerro'); erro.hidden = true;
  const { data: r, error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#pass').value });
  if (error) { erro.textContent = error.status === 400 ? 'Email ou password errados.' : erroPt('entrar', error); erro.hidden = false; return }
  $('#pass').value = ''; mostrarPainel(r.session);
});
$('#sair').addEventListener('click', async () => { await sb.auth.signOut(); pessoas = []; $('#lista').innerHTML = ''; mostrarLogin() });

if (!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.includes('O-TEU-PROJETO')) {
  $('#warn').innerHTML = '<div class="warn">Falta configurar o Supabase em <b>config.js</b>.</div>';
  status('');
} else {
  // sessão guardada com outro nome: o calendário, no mesmo browser, tem de continuar a fazer pedidos anónimos
  sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, { auth: { storageKey: 'croquete-admin' } });
  sb.auth.getSession().then(({ data: { session } }) => session ? mostrarPainel(session) : mostrarLogin());
}
}
