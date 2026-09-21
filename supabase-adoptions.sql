-- HUELLITAS - modulo de ADOPCIONES
-- Ejecuta este SQL UNA VEZ en Supabase > SQL Editor.
-- No reemplaza el SQL anterior de reports: agrega las tablas/bucket necesarios para Adopta.

create extension if not exists pgcrypto;

create table if not exists public.adoptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null check (species in ('Perro','Gato','Otro')),
  age text not null,
  size text not null check (size in ('Pequeño','Mediano','Grande','No indicado')),
  district text not null,
  description text not null,
  contact text not null,
  publisher_name text,
  photo_url text,
  status text not null default 'available' check (status in ('available','adopted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adoptions_status_idx on public.adoptions(status);
create index if not exists adoptions_created_at_idx on public.adoptions(created_at desc);
create index if not exists adoptions_user_id_idx on public.adoptions(user_id);

alter table public.adoptions enable row level security;

drop policy if exists "adoptions_select_authenticated" on public.adoptions;
drop policy if exists "adoptions_insert_own" on public.adoptions;
drop policy if exists "adoptions_update_own" on public.adoptions;
drop policy if exists "adoptions_delete_own" on public.adoptions;

create policy "adoptions_select_authenticated"
on public.adoptions for select
to authenticated
using (true);

create policy "adoptions_insert_own"
on public.adoptions for insert
to authenticated
with check (user_id = auth.uid());

create policy "adoptions_update_own"
on public.adoptions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "adoptions_delete_own"
on public.adoptions for delete
to authenticated
using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.adoptions to authenticated;

-- Solicitudes de adopción
create table if not exists public.adoption_requests (
  id uuid primary key default gen_random_uuid(),
  adoption_id uuid not null references public.adoptions(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(adoption_id, applicant_user_id)
);

create index if not exists adoption_requests_adoption_idx on public.adoption_requests(adoption_id);
create index if not exists adoption_requests_applicant_idx on public.adoption_requests(applicant_user_id);

alter table public.adoption_requests enable row level security;

drop policy if exists "adoption_requests_select_related" on public.adoption_requests;
drop policy if exists "adoption_requests_insert_own" on public.adoption_requests;
drop policy if exists "adoption_requests_update_owner" on public.adoption_requests;
drop policy if exists "adoption_requests_delete_related" on public.adoption_requests;

create policy "adoption_requests_select_related"
on public.adoption_requests for select
to authenticated
using (
  applicant_user_id = auth.uid()
  or exists (
    select 1 from public.adoptions a
    where a.id = adoption_id
      and a.user_id = auth.uid()
  )
);

create policy "adoption_requests_insert_own"
on public.adoption_requests for insert
to authenticated
with check (
  applicant_user_id = auth.uid()
  and exists (
    select 1 from public.adoptions a
    where a.id = adoption_id
      and a.status = 'available'
  )
);

create policy "adoption_requests_update_owner"
on public.adoption_requests for update
to authenticated
using (
  exists (
    select 1 from public.adoptions a
    where a.id = adoption_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.adoptions a
    where a.id = adoption_id
      and a.user_id = auth.uid()
  )
);

create policy "adoption_requests_delete_related"
on public.adoption_requests for delete
to authenticated
using (
  applicant_user_id = auth.uid()
  or exists (
    select 1 from public.adoptions a
    where a.id = adoption_id
      and a.user_id = auth.uid()
  )
);

grant select, insert, update, delete on table public.adoption_requests to authenticated;

-- Fotos de adopción
insert into storage.buckets (id, name, public)
values ('adoption-photos', 'adoption-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "adoption_photos_insert" on storage.objects;
drop policy if exists "adoption_photos_select" on storage.objects;
drop policy if exists "adoption_photos_update" on storage.objects;
drop policy if exists "adoption_photos_delete" on storage.objects;

create policy "adoption_photos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'adoption-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "adoption_photos_select"
on storage.objects for select
to public
using (bucket_id = 'adoption-photos');

create policy "adoption_photos_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'adoption-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'adoption-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "adoption_photos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'adoption-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Realtime para adopciones
alter table public.adoptions replica identity full;
alter table public.adoption_requests replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.adoptions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.adoption_requests;
exception
  when duplicate_object then null;
end $$;
