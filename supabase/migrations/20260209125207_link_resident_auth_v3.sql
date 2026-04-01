-- Dev/test fixture only: links the seeded resident row to a seeded auth user.
-- Real resident provisioning must happen through the application's admin API flow.
-- This migration now no-ops unless the known fixture resident row is present, so
-- environments without the demo resident do not get a stray resident@test.com account.

DO $$
DECLARE
  new_user_id uuid;
  resident_email text := 'resident@test.com';
  existing_resident_id uuid := '22222222-2222-2222-2222-222222222222';
  has_fixture_resident boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.residents
    WHERE id = existing_resident_id
  ) INTO has_fixture_resident;

  IF NOT has_fixture_resident THEN
    RAISE NOTICE 'Skipping resident test auth seed because fixture resident % is missing.', existing_resident_id;
    RETURN;
  END IF;

  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = resident_email;

  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      resident_email,
      crypt('resident123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Rajesh Kumar"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_user_id::text,
      new_user_id,
      jsonb_build_object(
        'sub', new_user_id::text,
        'email', resident_email
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created new auth user with ID: %', new_user_id;
  ELSE
    RAISE NOTICE 'User already exists with ID: %', new_user_id;
  END IF;

  UPDATE public.residents
  SET
    auth_user_id = new_user_id,
    email = resident_email
  WHERE id = existing_resident_id
    AND auth_user_id IS NULL;

  RAISE NOTICE 'Linked fixture resident % to auth user %', existing_resident_id, new_user_id;
END $$;

SELECT
  r.id,
  r.resident_code,
  r.full_name,
  r.email,
  r.auth_user_id,
  u.email AS auth_email
FROM public.residents r
LEFT JOIN auth.users u ON r.auth_user_id = u.id
WHERE r.id = '22222222-2222-2222-2222-222222222222';;
