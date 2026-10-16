-- Huellitas production rollout, compatibility-stage recovery.
-- Use only if the updated app has NOT been deployed yet and the old app is being
-- restored. This script preserves all adoption rows, requests, private contacts,
-- and notifications created before or after the predeploy migration.
-- It deliberately keeps the new tables and their rows, but disables notification
-- triggers and restores the legacy required contact column for the old app.

begin;

-- Copy a private contact back only when the legacy value is absent. Never erase
-- a value that the old app may have written while the compatibility stage ran.
update public.adoptions a
set contact = c.contact
from public.adoption_contacts c
where c.adoption_id = a.id
  and nullif(trim(a.contact), '') is null
  and nullif(trim(c.contact), '') is not null;

-- Stop safely if any listing has no contact to restore. The transaction then
-- rolls back without changing the database; an administrator must resolve it.
do $$
begin
  if exists (
    select 1 from public.adoptions
    where nullif(trim(contact), '') is null
  ) then
    raise exception 'Rollback stopped: one or more adoption listings have no legacy or private contact to restore';
  end if;
end $$;

alter table public.adoptions alter column contact set not null;

drop trigger if exists notify_adoption_request_change on public.adoption_requests;
drop trigger if exists guard_adoption_request_update on public.adoption_requests;
drop function if exists private.notify_adoption_request();
drop function if exists private.guard_adoption_request_update();

-- Restore the predeploy table-level grants. Existing row policies remain in
-- place, so this restores the old app's SQL permissions without bypassing RLS.
grant select, insert, update, delete on table public.adoption_requests to authenticated;

-- Keep the new private data, but stop exposing either table to API roles while
-- the old app is active. Re-running the predeploy migration grants access again.
revoke all on table public.adoption_contacts from public, anon, authenticated;
revoke all on table public.notifications from public, anon, authenticated;

-- Remove the Realtime subscription only; the notifications and their history
-- remain in the table and can be re-enabled by re-running the predeploy script.
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime drop table public.notifications';
  end if;
end $$;

commit;

