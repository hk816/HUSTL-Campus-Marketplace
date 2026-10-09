create or replace function private.is_hustl_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.beta_invites i
    where i.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

create policy "Active invite required"
on public.student_profiles as restrictive for all to authenticated
using ((select private.is_hustl_member()))
with check ((select private.is_hustl_member()));

create policy "Active invite required"
on public.gigs as restrictive for all to authenticated
using ((select private.is_hustl_member()))
with check ((select private.is_hustl_member()));

create policy "Active invite required"
on public.gig_applications as restrictive for all to authenticated
using ((select private.is_hustl_member()))
with check ((select private.is_hustl_member()));

create policy "Active invite required"
on public.saved_gigs as restrictive for all to authenticated
using ((select private.is_hustl_member()))
with check ((select private.is_hustl_member()));

create policy "Active invite required"
on public.direct_messages as restrictive for all to authenticated
using ((select private.is_hustl_member()))
with check ((select private.is_hustl_member()));

create policy "Active invite required"
on public.notifications as restrictive for all to authenticated
using ((select private.is_hustl_member()))
with check ((select private.is_hustl_member()));
