-- HUELLITAS - base de datos compartida
-- Ejecuta este SQL en Supabase > SQL Editor.
-- Antes de usar la app, habilita Authentication > Sign In / Providers > Anonymous Sign-Ins.

create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('lost','found')),
  name text not null,
  species text not null check (species in ('Perro','Gato')),
  district text not null,
  date date not null,
  contact text not null,
  description text not null,
  photo_url text,
  status text not null default 'active' check (status in ('active','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists reports_user_id_idx on public.reports(user_id);

alter table public.reports enable row level security;

drop policy if exists "reports_select_authenticated" on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_update_own" on public.reports;
drop policy if exists "reports_delete_own" on public.reports;

create policy "reports_select_authenticated"
on public.reports for select
to authenticated
using (true);

create policy "reports_insert_own"
on public.reports for insert
to authenticated
with check (user_id = auth.uid());

create policy "reports_update_own"
on public.reports for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "reports_delete_own"
on public.reports for delete
to authenticated
using (user_id = auth.uid());

-- Fotos
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "report_photos_insert" on storage.objects;
drop policy if exists "report_photos_select" on storage.objects;
drop policy if exists "report_photos_update" on storage.objects;
drop policy if exists "report_photos_delete" on storage.objects;

create policy "report_photos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "report_photos_select"
on storage.objects for select
to public
using (bucket_id = 'report-photos');

create policy "report_photos_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "report_photos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Realtime para que altas, cambios y eliminaciones se propaguen a otros celulares.
alter table public.reports replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.reports;
exception
  when duplicate_object then null;
end $$;
