-- Corre isto no Supabase: SQL Editor → New query → Run

create table if not exists pessoas (
  id uuid primary key,
  nome text not null default '' check (char_length(nome) <= 24),
  criado_em timestamptz not null default now()
);

create table if not exists disponibilidade (
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  dia date not null,
  estado text not null check (estado in ('y','m','n')),  -- y = livre, m = talvez, n = ocupado
  atualizado_em timestamptz not null default now(),
  primary key (pessoa_id, dia)
);

grant usage on schema public to anon;
grant select, insert, update on pessoas to anon;
grant select, insert, update, delete on disponibilidade to anon;

-- Segurança: sem contas, qualquer pessoa com o link pode ler e marcar.
alter table pessoas enable row level security;
alter table disponibilidade enable row level security;

create policy "ler pessoas"      on pessoas for select to anon using (true);
create policy "criar pessoas"    on pessoas for insert to anon with check (true);
create policy "editar pessoas"   on pessoas for update to anon using (true) with check (true);

create policy "ler disp"         on disponibilidade for select to anon using (true);
create policy "criar disp"       on disponibilidade for insert to anon with check (dia >= current_date - 7);
create policy "editar disp"      on disponibilidade for update to anon using (true) with check (dia >= current_date - 7);
create policy "apagar disp"      on disponibilidade for delete to anon using (true);

-- Atualizações em tempo real (a página muda sozinha quando alguém marca)
alter publication supabase_realtime add table pessoas, disponibilidade;
