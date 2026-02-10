-- Migration to create a resident auth user and link it to the existing resident record
-- This fixes the authentication loop issue on the resident dashboard

-- Step 1: Create a test resident user in auth.users
-- Note: In production, users should sign up through the normal auth flow
-- This is just for testing/development purposes

-- We'll use a function to create the user with a hashed password
-- Password will be: resident123

DO $$
DECLARE
  new_user_id uuid;
  resident_email text := 'resident@test.com';
  existing_resident_id uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = resident_email;

  -- If user doesn't exist, create it
  IF new_user_id IS NULL THEN
    -- Insert into auth.users
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
      -- Password hash for 'resident123' (you should change this in production)
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

    -- Also insert into auth.identities
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

  -- Step 2: Update the resident record to link it to the auth user
  UPDATE residents
  SET 
    auth_user_id = new_user_id,
    email = resident_email
  WHERE id = existing_resident_id;

  RAISE NOTICE 'Linked resident % to auth user %', existing_resident_id, new_user_id;
END $$;

-- Verify the update
SELECT 
  r.id,
  r.resident_code,
  r.full_name,
  r.email,
  r.auth_user_id,
  u.email as auth_email
FROM residents r
LEFT JOIN auth.users u ON r.auth_user_id = u.id
WHERE r.id = '22222222-2222-2222-2222-222222222222';
