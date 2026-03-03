-- Fix missing foreign key relationship error for PostgREST
-- This points the resolved_by column to public.users instead of auth.users
-- allowing Supabase client to join the tables via resolver:users(full_name)

DO $$
BEGIN
    -- Drop the existing constraint if it exists
    BEGIN
        ALTER TABLE public.panic_alerts DROP CONSTRAINT panic_alerts_resolved_by_fkey;
    EXCEPTION
        WHEN undefined_object THEN
            -- Ignore if it doesn't exist
    END;

    -- Add the correct constraint pointing to public.users
    ALTER TABLE public.panic_alerts 
    ADD CONSTRAINT panic_alerts_resolved_by_fkey 
    FOREIGN KEY (resolved_by) 
    REFERENCES public.users(id);
END $$;
