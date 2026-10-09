create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.student_profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.student_profiles(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint direct_messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists direct_messages_sender_created_idx
  on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_recipient_created_idx
  on public.direct_messages (recipient_id, created_at desc);

alter table public.direct_messages enable row level security;
grant select, insert on public.direct_messages to authenticated;

create policy "Participants view direct messages"
on public.direct_messages for select to authenticated
using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create policy "Students message campus members"
on public.direct_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and sender_id <> recipient_id
  and exists (
    select 1
    from public.student_profiles sender
    join public.student_profiles recipient on recipient.user_id = direct_messages.recipient_id
    where sender.user_id = (select auth.uid())
      and sender.university = recipient.university
  )
);
