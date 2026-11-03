-- Base privada do Lectio: cada pessoa só enxerga e altera as próprias linhas (RLS).
-- JÁ APLICADA no projeto lectio-enchei-vos (dzmhpfzheojmljxlgigp). Não reaplicar.
-- Este arquivo foi conferido com o banco (tabelas, políticas RLS, funções e permissões).
-- Diferença em relação à versão original: o gatilho cria o perfil só com o id (apelido fica vazio
-- até a pessoa escolher um apelido no primeiro acesso).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  apelido text check (char_length(apelido) <= 40),
  stats jsonb not null default '{"voz":0,"quizzes":0,"perfect":0}'::jsonb,
  horas jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create table public.estudos (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia_id text not null,
  passos jsonb not null default '{}'::jsonb,
  resumo jsonb,
  data date,
  atualizado timestamptz not null default now(),
  primary key (user_id, dia_id)
);
create table public.passagens_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  semana text not null, tema text, titulo text not null, ref text, texto text,
  criado_em timestamptz not null default now()
);
create index passagens_custom_user_idx on public.passagens_custom (user_id);
create table public.medalhas (
  user_id uuid not null references auth.users (id) on delete cascade,
  medalha_id text not null,
  ganha_em date not null default current_date,
  primary key (user_id, medalha_id)
);
create table public.atividade (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  primary key (user_id, dia)
);

alter table public.profiles enable row level security;
alter table public.estudos enable row level security;
alter table public.passagens_custom enable row level security;
alter table public.medalhas enable row level security;
alter table public.atividade enable row level security;

create policy "dono_ve_perfil" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "dono_cria_perfil" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "dono_edita_perfil" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "dono_apaga_perfil" on public.profiles for delete to authenticated using ((select auth.uid()) = id);
create policy "dono_ve_estudos" on public.estudos for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono_cria_estudos" on public.estudos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono_edita_estudos" on public.estudos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono_apaga_estudos" on public.estudos for delete to authenticated using ((select auth.uid()) = user_id);
create policy "dono_ve_passagens" on public.passagens_custom for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono_cria_passagens" on public.passagens_custom for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono_edita_passagens" on public.passagens_custom for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono_apaga_passagens" on public.passagens_custom for delete to authenticated using ((select auth.uid()) = user_id);
create policy "dono_ve_medalhas" on public.medalhas for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono_cria_medalhas" on public.medalhas for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono_apaga_medalhas" on public.medalhas for delete to authenticated using ((select auth.uid()) = user_id);
create policy "dono_ve_atividade" on public.atividade for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono_cria_atividade" on public.atividade for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono_apaga_atividade" on public.atividade for delete to authenticated using ((select auth.uid()) = user_id);

create function public.cria_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
revoke execute on function public.cria_perfil() from public, anon, authenticated;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.cria_perfil();

create function public.apagar_meus_dados() returns void
language sql security invoker set search_path = '' as $$
  delete from public.estudos where user_id = (select auth.uid());
  delete from public.passagens_custom where user_id = (select auth.uid());
  delete from public.medalhas where user_id = (select auth.uid());
  delete from public.atividade where user_id = (select auth.uid());
  update public.profiles set stats = '{"voz":0,"quizzes":0,"perfect":0}'::jsonb, horas = '{}'::jsonb where id = (select auth.uid());
$$;
revoke execute on function public.apagar_meus_dados() from public, anon;
grant execute on function public.apagar_meus_dados() to authenticated;
