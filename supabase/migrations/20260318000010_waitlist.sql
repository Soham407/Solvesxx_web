-- Waitlist table for FacilityPro early access sign-ups
-- Collected via the public landing page at /

create table if not exists public.waitlist (
  id          uuid        default gen_random_uuid() primary key,
  email       text        not null unique,
  name        text,
  company     text,
  status      text        not null default 'pending',
  source      text        default 'landing_page',
  created_at  timestamptz default now(),
  constraint waitlist_status_check check (status in ('pending', 'approved', 'rejected'))
);

alter table public.waitlist
  add column if not exists status text not null default 'pending';

update public.waitlist
set status = 'pending'
where status is null;

alter table public.waitlist
  drop constraint if exists waitlist_status_check;

alter table public.waitlist
  add constraint waitlist_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Index for dedup lookups
create index if not exists waitlist_email_idx on public.waitlist (email);

-- RLS enabled — public sign-ups can insert, admins can review, service role can manage.
alter table public.waitlist enable row level security;

drop policy if exists "Anyone can join waitlist" on public.waitlist;
drop policy if exists "Service role manages waitlist" on public.waitlist;
drop policy if exists "Admins can read waitlist" on public.waitlist;
drop policy if exists "Admins can update waitlist" on public.waitlist;

-- Anon users can INSERT (sign up) but cannot read other entries
create policy "Anyone can join waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

create policy "Admins can read waitlist"
  on public.waitlist
  for select
  to authenticated
  using (public.get_my_app_role() in ('admin', 'super_admin'));

create policy "Admins can update waitlist"
  on public.waitlist
  for update
  to authenticated
  using (public.get_my_app_role() in ('admin', 'super_admin'))
  with check (public.get_my_app_role() in ('admin', 'super_admin'));

-- Only service role can read, update, or delete waitlist entries
create policy "Service role manages waitlist"
  on public.waitlist
  for all
  to service_role
  using (true);

comment on table public.waitlist is 'Early access sign-ups from the FacilityPro landing page.';
