create table if not exists public.saved_gigs (
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  gig_id uuid not null references public.gigs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, gig_id)
);

alter table public.saved_gigs enable row level security;

grant select, insert, delete on public.saved_gigs to authenticated;

create policy "Students view their saved gigs"
on public.saved_gigs for select to authenticated
using (
  user_id = (select auth.uid())
);

create policy "Students save gigs on their campus"
on public.saved_gigs for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.student_profiles p
    join public.gigs g on g.id = saved_gigs.gig_id
    where p.user_id = (select auth.uid())
      and p.university = 'Woxsen University'
      and p.university = g.campus
      and g.status = 'open'
  )
);

create policy "Students remove their saved gigs"
on public.saved_gigs for delete to authenticated
using (
  user_id = (select auth.uid())
);
