-- ============================================
-- Migration: reconcile_waitlist_table
-- Description: Restore the public.waitlist table and policies when the linked
-- test project drifted out of sync with recorded migration history.
-- ============================================

create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  name text,
  company text,
  source text default 'landing_page',
  created_at timestamptz default now()
);

create unique index if not exists waitlist_email_key on public.waitlist (email);
create index if not exists waitlist_email_idx on public.waitlist (email);

alter table public.waitlist enable row level security;

drop policy if exists "Anyone can join waitlist" on public.waitlist;
create policy "Anyone can join waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Service role manages waitlist" on public.waitlist;
create policy "Service role manages waitlist"
  on public.waitlist
  for all
  to service_role
  using (true);

comment on table public.waitlist is 'Early access sign-ups from the FacilityPro landing page.';
