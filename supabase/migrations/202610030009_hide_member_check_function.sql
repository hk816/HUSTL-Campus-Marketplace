create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_hustl_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_profiles p
    where p.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_hustl_member() from public, anon;
grant execute on function private.is_hustl_member() to authenticated;

drop policy if exists "HUSTL members view campus profiles" on public.student_profiles;
create policy "HUSTL members view campus profiles"
on public.student_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_hustl_member()));

revoke all on function public.is_hustl_member() from public, anon, authenticated;
drop function public.is_hustl_member();
