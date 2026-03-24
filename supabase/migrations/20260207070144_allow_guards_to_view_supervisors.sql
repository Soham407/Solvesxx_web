-- Allow guards and other users to view supervisor contact info in the users table
DROP POLICY IF EXISTS "Anyone can view supervisor contact info" ON users;
CREATE POLICY "Anyone can view supervisor contact info" ON users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM roles r 
        WHERE r.id = users.role_id 
        AND r.role_name IN ('security_supervisor', 'society_manager', 'admin')
    )
);;
