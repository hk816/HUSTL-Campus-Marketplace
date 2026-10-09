drop policy if exists "Signed-in students can view profiles" on public.student_profiles;
create policy "Signed-in students can view profiles"
on public.student_profiles for select to authenticated
using (true);

drop policy if exists "Students create their own profile" on public.student_profiles;
create policy "Students create their own profile"
on public.student_profiles for insert to authenticated
with check (
  user_id = (select auth.uid())
  and university = 'Woxsen University'
);

drop policy if exists "Students update their own profile" on public.student_profiles;
create policy "Students update their own profile"
on public.student_profiles for update to authenticated
using (
  user_id = (select auth.uid())
  and university = 'Woxsen University'
)
with check (
  user_id = (select auth.uid())
  and university = 'Woxsen University'
);

drop policy if exists "Students view open gigs on their campus" on public.gigs;
create policy "Students view open gigs on their campus"
on public.gigs for select to authenticated
using (
  owner_id = (select auth.uid())
  or (
    status = 'open'
    and exists (
      select 1
      from public.student_profiles p
      where p.user_id = (select auth.uid())
        and p.university = gigs.campus
    )
  )
);

drop policy if exists "Applicants and gig owners view pitches" on public.gig_applications;
create policy "Applicants and gig owners view pitches"
on public.gig_applications for select to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1 from public.gigs g
    where g.id = gig_applications.gig_id
      and g.owner_id = (select auth.uid())
  )
);

drop policy if exists "Students view their saved gigs" on public.saved_gigs;
create policy "Students view their saved gigs"
on public.saved_gigs for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Students save gigs on their campus" on public.saved_gigs;
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

drop policy if exists "Students remove their saved gigs" on public.saved_gigs;
create policy "Students remove their saved gigs"
on public.saved_gigs for delete to authenticated
using (user_id = (select auth.uid()));
