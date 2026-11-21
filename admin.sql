-- Página de admin (admin.html). Corre isto no Supabase DEPOIS do supabase.sql.
--
-- Antes de correr:
--   1. Authentication → Users → Add user → Create new user: o teu email + password
--      (marca "Auto Confirm User").
--   2. Authentication → Sign In / Providers: desliga "Allow new users to sign up",
--      para ninguém criar contas (mesmo que crie, não é admin; é só para não haver lixo).
--   3. Troca O-TEU-EMAIL abaixo pelo email do passo 1.
-- Depois: SQL Editor → New query → cola tudo → Run. Pode correr-se mais do que uma vez.
--
-- O que muda: só o utilizador com login cujo email está em "admins" pode ler, mudar e
-- apagar pessoas e marcações como "authenticated". A anon key (o site) fica igual:
-- continua sem poder apagar pessoas.

-- Quem é admin. RLS ligado e sem políticas: nenhum cliente a lê nem a altera.
create table if not exists admins (email text primary key);
alter table admins enable row level security;
revoke all on admins from anon, authenticated;
insert into admins (email) values (lower('O-TEU-EMAIL')) on conflict do nothing;

-- Verdadeiro se quem faz o pedido tem login e o email está em "admins".
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = lower(auth.jwt() ->> 'email'));
$$;
revoke execute on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- Permissões do admin (com login). Sem política de insert: o admin não cria pessoas.
grant usage on schema public to authenticated;
grant select, update, delete on pessoas, disponibilidade to authenticated;

drop policy if exists "admin ler pessoas"    on pessoas;
drop policy if exists "admin editar pessoas" on pessoas;
drop policy if exists "admin apagar pessoas" on pessoas;
drop policy if exists "admin ler disp"       on disponibilidade;
drop policy if exists "admin editar disp"    on disponibilidade;
drop policy if exists "admin apagar disp"    on disponibilidade;

create policy "admin ler pessoas"    on pessoas for select to authenticated using (is_admin());
create policy "admin editar pessoas" on pessoas for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin apagar pessoas" on pessoas for delete to authenticated using (is_admin());

create policy "admin ler disp"       on disponibilidade for select to authenticated using (is_admin());
create policy "admin editar disp"    on disponibilidade for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin apagar disp"    on disponibilidade for delete to authenticated using (is_admin());

-- Junta "origem" em "destino": as marcações passam para o destino (no mesmo dia fica a
-- do destino) e a origem é apagada. Uma função corre numa só transação: ou faz tudo ou nada.
-- Devolve quantas marcações passaram.
create or replace function juntar_pessoas(origem uuid, destino uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  passadas integer;
begin
  if not is_admin() then
    raise exception 'Só o admin pode juntar pessoas.' using errcode = '42501';
  end if;
  if origem is null or destino is null or origem = destino then
    raise exception 'Escolhe duas pessoas diferentes.';
  end if;
  -- trancar as duas linhas para ninguém as mudar a meio
  perform 1 from pessoas where id = destino for update;
  if not found then raise exception 'A pessoa de destino já não existe.'; end if;
  perform 1 from pessoas where id = origem for update;
  if not found then raise exception 'A pessoa de origem já não existe.'; end if;

  insert into disponibilidade (pessoa_id, dia, estado, atualizado_em)
    select destino, d.dia, d.estado, d.atualizado_em
    from disponibilidade d where d.pessoa_id = origem
  on conflict (pessoa_id, dia) do nothing;
  get diagnostics passadas = row_count;

  delete from pessoas where id = origem;   -- as marcações da origem saem em cascata
  return passadas;
end;
$$;
revoke execute on function juntar_pessoas(uuid, uuid) from public, anon;
grant execute on function juntar_pessoas(uuid, uuid) to authenticated;
