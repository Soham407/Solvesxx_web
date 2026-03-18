-- Waitlist table for FacilityPro early access sign-ups
-- Collected via the public landing page at /

create table if not exists public.waitlist (
  id          uuid        default gen_random_uuid() primary key,
  email       text        not null unique,
  name        text,
  company     text,
  source      text        default 'landing_page',
  created_at  timestamptz default now()
);

-- Index for dedup lookups
create index if not exists waitlist_email_idx on public.waitlist (email);

-- RLS enabled — only service_role can read/export entries
alter table public.waitlist enable row level security;

-- Anon users can INSERT (sign up) but cannot read other entries
create policy "Anyone can join waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Only service role can read, update, or delete waitlist entries
create policy "Service role manages waitlist"
  on public.waitlist
  for all
  to service_role
  using (true);

comment on table public.waitlist is 'Early access sign-ups from the FacilityPro landing page.';
