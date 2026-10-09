create index if not exists gigs_owner_id_idx on public.gigs (owner_id);
create index if not exists gig_applications_applicant_id_idx on public.gig_applications (applicant_id);
create index if not exists saved_gigs_gig_id_idx on public.saved_gigs (gig_id);
