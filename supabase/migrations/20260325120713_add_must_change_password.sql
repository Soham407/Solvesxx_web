ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.must_change_password IS
  'When true, user must change their password before accessing any app route. Set to true when admin provisions a new account with a temporary password.';;
