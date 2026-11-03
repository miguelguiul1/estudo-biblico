-- Conta completa: configurações (com a chave da IA criptografada no aparelho) e fotos do caderno.
-- AINDA NÃO APLICADA. Para aplicar: Supabase > SQL Editor > colar este arquivo inteiro > Run.
--
-- Chave da IA: o navegador criptografa a chave com uma "senha de proteção" que só a pessoa conhece
-- (AES-GCM, chave derivada por PBKDF2). O banco guarda só o texto embaralhado (ciphertext). A senha
-- de proteção e a chave em texto puro nunca saem do aparelho.

-- ---------- Configurações da conta ----------
create table public.configuracoes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tema text check (tema in ('auto', 'light', 'dark')),
  modelo text check (char_length(modelo) <= 80),
  chave_ia_cifrada jsonb,
  atualizado timestamptz not null default now()
);
alter table public.configuracoes enable row level security;
create policy "dono_ve_config" on public.configuracoes for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono_cria_config" on public.configuracoes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono_edita_config" on public.configuracoes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono_apaga_config" on public.configuracoes for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Fotos do caderno: lista (metadados) ----------
create table public.fotos (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  dia_id text not null,
  caminho text not null unique,
  criado_em timestamptz not null default now(),
  -- o arquivo precisa estar dentro da pasta do próprio dono
  constraint fotos_caminho_do_dono check (caminho like user_id::text || '/%')
);
create index fotos_user_idx on public.fotos (user_id);
alter table public.fotos enable row level security;
create policy "dono_ve_fotos" on public.fotos for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono_cria_fotos" on public.fotos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono_apaga_fotos" on public.fotos for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Fotos do caderno: arquivos (espaço privado) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- Cada pessoa só enxerga e mexe na própria pasta: fotos/<id-da-conta>/<arquivo>.jpg
create policy "dono_ve_arquivos_fotos" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dono_envia_arquivos_fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dono_apaga_arquivos_fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- "Apagar meus dados" passa a limpar também fotos (lista) e configurações ----------
-- Os arquivos das fotos são removidos pelo aplicativo (API de arquivos) antes de chamar esta função.
create or replace function public.apagar_meus_dados() returns void
language sql security invoker set search_path = '' as $$
  delete from public.estudos where user_id = (select auth.uid());
  delete from public.passagens_custom where user_id = (select auth.uid());
  delete from public.medalhas where user_id = (select auth.uid());
  delete from public.atividade where user_id = (select auth.uid());
  delete from public.fotos where user_id = (select auth.uid());
  delete from public.configuracoes where user_id = (select auth.uid());
  update public.profiles set stats = '{"voz":0,"quizzes":0,"perfect":0}'::jsonb, horas = '{}'::jsonb where id = (select auth.uid());
$$;
revoke execute on function public.apagar_meus_dados() from public, anon;
grant execute on function public.apagar_meus_dados() to authenticated;
