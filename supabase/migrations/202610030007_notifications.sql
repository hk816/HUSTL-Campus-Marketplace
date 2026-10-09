create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  kind text not null check (kind in ('pitch', 'message')),
  title text not null check (char_length(title) between 1 and 120),
  detail text not null check (char_length(detail) between 1 and 500),
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
grant select, update(read_at) on public.notifications to authenticated;

create policy "Students view their notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "Students mark their notifications read"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.notify_gig_owner_of_pitch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  gig_owner uuid;
  gig_title text;
  applicant_name text;
begin
  select g.owner_id, g.title into gig_owner, gig_title
  from public.gigs g where g.id = new.gig_id;
  select p.name into applicant_name
  from public.student_profiles p where p.user_id = new.applicant_id;
  if gig_owner is not null then
    insert into public.notifications (user_id, kind, title, detail, related_id)
    values (gig_owner, 'pitch', 'A new pitch came in', coalesce(applicant_name, 'A campus member') || ' applied to “' || gig_title || '”.', new.id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_name text;
begin
  select p.name into sender_name
  from public.student_profiles p where p.user_id = new.sender_id;
  insert into public.notifications (user_id, kind, title, detail, related_id)
  values (new.recipient_id, 'message', 'New message from ' || coalesce(sender_name, 'a campus member'), left(new.body, 240), new.id);
  return new;
end;
$$;

revoke all on function public.notify_gig_owner_of_pitch() from public, anon, authenticated;
revoke all on function public.notify_message_recipient() from public, anon, authenticated;

drop trigger if exists notify_gig_owner_on_pitch on public.gig_applications;
create trigger notify_gig_owner_on_pitch
after insert on public.gig_applications
for each row execute function public.notify_gig_owner_of_pitch();

drop trigger if exists notify_recipient_on_message on public.direct_messages;
create trigger notify_recipient_on_message
after insert on public.direct_messages
for each row execute function public.notify_message_recipient();
