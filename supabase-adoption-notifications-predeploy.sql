-- Huellitas: solicitudes de adopción, notificaciones y contactos privados.
-- Etapa de compatibilidad: ejecutar antes de desplegar la nueva app.
-- No elimina publicaciones ni solicitudes. Copia los teléfonos existentes a una
-- tabla con RLS; los permisos del campo legado se retiran en la etapa final.
-- Para recuperar una cuenta en otros dispositivos, habilita manual identity linking
-- (Authentication > Sign In / Providers > Allow manual linking) y Email/Password.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Conserva la columna de contacto legada para la versión actual del sitio.
-- En adoption_requests se restringen los permisos de columna para proteger los
-- datos personales; las políticas de lectura/actualización/eliminación se recrean
-- con el mismo alcance de propietario/solicitante. La política de inserción actual
-- se deja durante esta etapa de compatibilidad y se endurece en lockdown.

-- Copia los teléfonos actuales para que la nueva app los lea desde una tabla privada.
-- The base adoption migration predates the private contact table and required
-- adoptions.contact. The new app writes contact data to adoption_contacts, so
-- allow that insert shape; the final stage locks down the legacy column access.
alter table public.adoptions alter column contact drop not null;

create table if not exists public.adoption_contacts (
  adoption_id uuid primary key references public.adoptions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.adoption_contacts (adoption_id, owner_id, contact)
select id, user_id, contact
from public.adoptions
where nullif(trim(contact), '') is not null
on conflict (adoption_id) do nothing;

alter table public.adoption_contacts enable row level security;
revoke all on public.adoption_contacts from public, anon, authenticated;
grant select, insert, update, delete on public.adoption_contacts to authenticated;

drop policy if exists adoption_contacts_select_related on public.adoption_contacts;
drop policy if exists adoption_contacts_insert_owner on public.adoption_contacts;
drop policy if exists adoption_contacts_update_owner on public.adoption_contacts;
drop policy if exists adoption_contacts_delete_owner on public.adoption_contacts;

create policy adoption_contacts_select_related
on public.adoption_contacts for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.adoption_requests r
    where r.adoption_id = adoption_contacts.adoption_id
      and r.applicant_user_id = (select auth.uid())
      and r.status = 'approved'
  )
);

create policy adoption_contacts_insert_owner
on public.adoption_contacts for insert to authenticated
with check (
  (select auth.jwt()->>'is_anonymous') is distinct from 'true'
  and
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adoptions a
    where a.id = adoption_contacts.adoption_id
      and a.user_id = (select auth.uid())
  )
);

create policy adoption_contacts_update_owner
on public.adoption_contacts for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adoptions a
    where a.id = adoption_contacts.adoption_id
      and a.user_id = (select auth.uid())
  )
);

create policy adoption_contacts_delete_owner
on public.adoption_contacts for delete to authenticated
using (owner_id = (select auth.uid()));


-- Solicitudes: el solicitante crea y ve las propias; el responsable las ve
-- y solo puede actualizar estado/fecha. Los datos personales quedan inmutables.
revoke all on public.adoption_requests from public, anon, authenticated;
grant select on public.adoption_requests to authenticated;
grant insert (adoption_id, applicant_user_id, name, phone, reason)
on public.adoption_requests to authenticated;
grant update (status, updated_at) on public.adoption_requests to authenticated;
grant delete on public.adoption_requests to authenticated;

drop policy if exists adoption_requests_select_related on public.adoption_requests;
drop policy if exists adoption_requests_update_owner on public.adoption_requests;
drop policy if exists adoption_requests_delete_related on public.adoption_requests;

create policy adoption_requests_select_related
on public.adoption_requests for select to authenticated
using (
  applicant_user_id = (select auth.uid())
  or exists (
    select 1 from public.adoptions a
    where a.id = adoption_requests.adoption_id
      and a.user_id = (select auth.uid())
  )
);



create policy adoption_requests_update_owner
on public.adoption_requests for update to authenticated
using (
  exists (
    select 1 from public.adoptions a
    where a.id = adoption_requests.adoption_id
      and a.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.adoptions a
    where a.id = adoption_requests.adoption_id
      and a.user_id = (select auth.uid())
  )
);

create policy adoption_requests_delete_related
on public.adoption_requests for delete to authenticated
using (
  applicant_user_id = (select auth.uid())
  or exists (
    select 1 from public.adoptions a
    where a.id = adoption_requests.adoption_id
      and a.user_id = (select auth.uid())
  )
);

-- Bandeja privada por usuario. No duplica teléfono ni razón de la solicitud.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.adoption_requests(id) on delete cascade,
  adoption_id uuid not null references public.adoptions(id) on delete cascade,
  kind text not null check (kind in ('request_received', 'request_approved', 'request_rejected')),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);
create unique index if not exists notifications_request_kind_uidx
  on public.notifications (request_id, kind);
create index if not exists adoption_requests_applicant_created_idx
  on public.adoption_requests (applicant_user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

drop policy if exists notifications_select_recipient on public.notifications;
drop policy if exists notifications_update_recipient on public.notifications;
create policy notifications_select_recipient
on public.notifications for select to authenticated
using (recipient_user_id = (select auth.uid()));
create policy notifications_update_recipient
on public.notifications for update to authenticated
using (recipient_user_id = (select auth.uid()))
with check (recipient_user_id = (select auth.uid()));

-- DB-owned notifications run atomically with request creation/status changes.
-- The trigger function lives in a non-exposed schema and cannot be called directly.
create or replace function private.notify_adoption_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  pet_name text;
begin
  select a.user_id, a.name into owner_id, pet_name
  from public.adoptions a where a.id = new.adoption_id;

  if tg_op = 'INSERT' then
    insert into public.notifications
      (recipient_user_id, request_id, adoption_id, kind, title, body)
    values
      (owner_id, new.id, new.adoption_id, 'request_received',
       'Nueva solicitud de adopción',
       'Recibiste una solicitud para ' || coalesce(pet_name, 'una mascota') || '.');
  elsif new.status is distinct from old.status then
    insert into public.notifications
      (recipient_user_id, request_id, adoption_id, kind, title, body)
    values
      (new.applicant_user_id, new.id, new.adoption_id,
       case new.status when 'approved' then 'request_approved' else 'request_rejected' end,
       case new.status when 'approved' then 'Tu solicitud fue aceptada' else 'Tu solicitud fue rechazada' end,
       'El responsable respondió a tu solicitud para ' || coalesce(pet_name, 'una mascota') || '.');
  end if;
  return new;
end;
$$;
revoke all on function private.notify_adoption_request() from public, anon, authenticated;

create or replace function private.guard_adoption_request_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' then
    raise exception 'Only pending adoption requests can be answered';
  end if;
  if new.status not in ('approved', 'rejected') then
    raise exception 'A pending adoption request can only be approved or rejected';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.guard_adoption_request_update() from public, anon, authenticated;

drop trigger if exists guard_adoption_request_update on public.adoption_requests;
create trigger guard_adoption_request_update
before update of status on public.adoption_requests
for each row execute function private.guard_adoption_request_update();

drop trigger if exists notify_adoption_request_change on public.adoption_requests;
create trigger notify_adoption_request_change
after insert or update on public.adoption_requests
for each row execute function private.notify_adoption_request();

alter table public.notifications replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- Backfill only the notifications that are knowable from current data: existing
-- pending requests notify the pet's owner once. Existing statuses are preserved.
insert into public.notifications
  (recipient_user_id, request_id, adoption_id, kind, title, body)
select a.user_id, r.id, r.adoption_id, 'request_received',
  'Solicitud de adopción pendiente',
  'Tienes una solicitud pendiente para ' || a.name || '.'
from public.adoption_requests r
join public.adoptions a on a.id = r.adoption_id
where r.status = 'pending'
  and not exists (
    select 1 from public.notifications n
    where n.request_id = r.id and n.kind = 'request_received'
  );

insert into public.notifications
  (recipient_user_id, request_id, adoption_id, kind, title, body)
select r.applicant_user_id, r.id, r.adoption_id,
  case r.status when 'approved' then 'request_approved' else 'request_rejected' end,
  case r.status when 'approved' then 'Tu solicitud fue aceptada' else 'Tu solicitud fue rechazada' end,
  'El responsable respondió a tu solicitud para ' || a.name || '.'
from public.adoption_requests r
join public.adoptions a on a.id = r.adoption_id
where r.status in ('approved', 'rejected')
  and not exists (
    select 1 from public.notifications n
    where n.request_id = r.id
      and n.kind = case r.status when 'approved' then 'request_approved' else 'request_rejected' end
  );

commit;

