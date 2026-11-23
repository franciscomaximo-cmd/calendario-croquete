-- Motivo opcional para "Ocupado" (ex.: "exame"). Corre isto no Supabase DEPOIS do
-- supabase.sql e do admin.sql: SQL Editor → New query → cola tudo → Run.
-- Pode correr-se mais do que uma vez. As permissões não mudam: o site já pode inserir
-- e alterar linhas em "disponibilidade", e isso inclui a coluna nova.

alter table disponibilidade add column if not exists nota text;

-- A nota é opcional; quando existe: 1 a 40 caracteres, sem espaços nas pontas nem
-- repetidos, e só em "Ocupado" (estado 'n'). Vale mesmo para quem fale com a API diretamente.
alter table disponibilidade drop constraint if exists nota_valida;
alter table disponibilidade add constraint nota_valida check (
  nota is null or (
    estado = 'n'
    and char_length(nota) between 1 and 40
    and nota = btrim(regexp_replace(nota, '\s+', ' ', 'g'))
  )
);

-- Igual à do admin.sql, mas também copia a nota ao juntar pessoas.
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

  insert into disponibilidade (pessoa_id, dia, estado, atualizado_em, nota)
    select destino, d.dia, d.estado, d.atualizado_em, d.nota
    from disponibilidade d where d.pessoa_id = origem
  on conflict (pessoa_id, dia) do nothing;
  get diagnostics passadas = row_count;

  delete from pessoas where id = origem;   -- as marcações da origem saem em cascata
  return passadas;
end;
$$;
revoke execute on function juntar_pessoas(uuid, uuid) from public, anon;
grant execute on function juntar_pessoas(uuid, uuid) to authenticated;
