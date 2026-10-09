create table if not exists public.beta_invites (
  email text primary key check (email = lower(btrim(email)) and email like '%@%'),
  invited_at timestamptz not null default now()
);

alter table public.beta_invites enable row level security;
revoke all on public.beta_invites from public, anon, authenticated;
grant select on public.beta_invites to authenticated;

create policy "Invitees can verify their own invitation"
on public.beta_invites for select to authenticated
using (email = lower(coalesce((select auth.jwt() ->> 'email'), '')));

insert into public.beta_invites (email)
select distinct lower(u.email)
from public.student_profiles p
join auth.users u on u.id = p.user_id
where u.email is not null
on conflict (email) do nothing;

create or replace function public.is_hustl_member()
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

revoke all on function public.is_hustl_member() from public, anon;
grant execute on function public.is_hustl_member() to authenticated;

drop policy if exists "Signed-in students can view profiles" on public.student_profiles;
drop policy if exists "Students create their own profile" on public.student_profiles;
drop policy if exists "Students update their own profile" on public.student_profiles;

create policy "HUSTL members view campus profiles"
on public.student_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_hustl_member()));

create policy "Invited students create their own profile"
on public.student_profiles for insert to authenticated
with check (
  user_id = (select auth.uid())
  and university = 'Woxsen University'
  and exists (
    select 1 from public.beta_invites i
    where i.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy "Invited students update their own profile"
on public.student_profiles for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.beta_invites i
    where i.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
)
with check (
  user_id = (select auth.uid())
  and university = 'Woxsen University'
  and exists (
    select 1 from public.beta_invites i
    where i.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);
