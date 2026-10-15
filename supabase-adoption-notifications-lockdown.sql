-- Huellitas production rollout, final stage.
-- Run only after the updated app from PR #2 is live and verified.
-- Restricts the legacy contact column while retaining all adoption rows.

begin;

-- Catch contacts from any publication created by the old app during the
-- compatibility window. Existing private contacts are kept as-is.
insert into public.adoption_contacts (adoption_id, owner_id, contact)
select id, user_id, contact
from public.adoptions
where nullif(trim(contact), '') is not null
on conflict (adoption_id) do nothing;

revoke all on public.adoptions from public, anon, authenticated;
grant select (id, user_id, name, species, age, size, district, description,
  publisher_name, photo_url, status, created_at, updated_at)
on public.adoptions to authenticated;
grant insert (user_id, name, species, age, size, district, description,
  publisher_name, photo_url, status)
on public.adoptions to authenticated;
grant update (name, species, age, size, district, description,
  publisher_name, photo_url, status, updated_at)
on public.adoptions to authenticated;
grant delete on public.adoptions to authenticated;

drop policy if exists adoptions_insert_own on public.adoptions;
create policy adoptions_insert_own
on public.adoptions for insert to authenticated
with check (
  (select auth.jwt()->>'is_anonymous') is distinct from 'true'
  and user_id = (select auth.uid())
);

drop policy if exists adoption_requests_insert_own on public.adoption_requests;
create policy adoption_requests_insert_own
on public.adoption_requests for insert to authenticated
with check (
  (select auth.jwt()->>'is_anonymous') is distinct from 'true'
  and applicant_user_id = (select auth.uid())
  and exists (
    select 1 from public.adoptions a
    where a.id = adoption_requests.adoption_id
      and a.status = 'available'
      and a.user_id <> (select auth.uid())
  )
);

commit;
