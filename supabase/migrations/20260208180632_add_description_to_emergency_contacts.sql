-- Add description column to emergency_contacts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emergency_contacts' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE emergency_contacts ADD COLUMN description TEXT;
  END IF;
END $$;;
