drop policy if exists "Higher roles view employees" on public.employees;

create policy "Higher roles view employees"
on public.employees
for select
using (
  has_role('admin')
  or has_role('super_admin')
  or has_role('account')
  or has_role('security_supervisor')
  or has_role('society_manager')
  or has_role('company_hod')
);
