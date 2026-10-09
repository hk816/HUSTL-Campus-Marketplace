grant update(status) on public.gig_applications to authenticated;

create policy "Gig owners review pitches"
on public.gig_applications for update to authenticated
using (
  exists (
    select 1 from public.gigs g
    where g.id = gig_applications.gig_id
      and g.owner_id = (select auth.uid())
  )
)
with check (
  status in ('pending', 'accepted', 'declined')
  and exists (
    select 1 from public.gigs g
    where g.id = gig_applications.gig_id
      and g.owner_id = (select auth.uid())
  )
);
