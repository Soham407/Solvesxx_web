-- 1. HARDEN Helper Functions with explicit search_path to ensure RLS bypass works correctly
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
DECLARE
    role_name_val public.user_role;
BEGIN
    SELECT r.role_name INTO role_name_val
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    LIMIT 1;
    RETURN role_name_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_user_role()::TEXT = required_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 2. CLEAN UP EMPLOYEES (Remove recursion link to users)
DROP POLICY IF EXISTS "Users can view their own employee record" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
DROP POLICY IF EXISTS "Guards and admins can view employees" ON public.employees;
DROP POLICY IF EXISTS "Guards can view employees" ON public.employees;
DROP POLICY IF EXISTS "Supervisors can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can view employees" ON public.employees;

-- Pure self-check on employees
CREATE POLICY "Employees self view" ON public.employees 
FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Employees self update" ON public.employees 
FOR UPDATE USING (auth_user_id = auth.uid());

-- Admin/Supervisor view (Safe because selecting FROM employees doesn't loop back to employees policy in has_role)
CREATE POLICY "Higher roles view employees" ON public.employees 
FOR SELECT USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager') OR has_role('company_hod'));

CREATE POLICY "Admins manage employees" ON public.employees 
FOR ALL USING (has_role('admin'));

-- 3. CLEAN UP USERS (Break the recursion loop)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Managers can view subordinate user records" ON public.users;
DROP POLICY IF EXISTS "Anyone can view supervisor contact info" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Public Users View" ON public.users;
DROP POLICY IF EXISTS "Public user directory" ON public.users;

-- Standard View (Keep it broad for now to ensure site works, then tighten)
CREATE POLICY "Site users view each other" ON public.users 
FOR SELECT USING (true);

-- Self Update (NO FUNCTION CALL)
CREATE POLICY "Users update own record" ON public.users 
FOR UPDATE USING (id = auth.uid());

-- Admin management (Avoid loop by using a non-recursive check if possible, or assume SELECT is enough for now)
-- The loop happens on ALL. Let's use INSERT, UPDATE, DELETE specifically.
CREATE POLICY "Admins insert users" ON public.users FOR INSERT WITH CHECK (has_role('admin'));
CREATE POLICY "Admins delete users" ON public.users FOR DELETE USING (has_role('admin'));
-- Note: Update is handled by 'Users update own' or we can add an Admin one.
CREATE POLICY "Admins update users" ON public.users FOR UPDATE USING (has_role('admin'));

-- 4. FIX SERVICE REQUESTS
DROP POLICY IF EXISTS "Update Assigned Requests" ON public.service_requests;
DROP POLICY IF EXISTS "View Assigned or Own Requests" ON public.service_requests;

CREATE POLICY "Users view relevant service requests" ON public.service_requests
FOR SELECT USING (
    (assigned_to IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())) OR 
    (requester_id = auth.uid()) OR 
    (has_role('admin') OR has_role('company_hod') OR has_role('society_manager'))
);

CREATE POLICY "Personnel update service requests" ON public.service_requests
FOR UPDATE USING (
    (assigned_to IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())) OR 
    (has_role('admin') OR has_role('company_hod') OR has_role('society_manager'))
);
;
