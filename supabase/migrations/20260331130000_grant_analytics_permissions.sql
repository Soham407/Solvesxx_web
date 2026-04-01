-- Grant SELECT access to authenticated users for analytics views
-- This ensures the reporting module can display data for authorized staff

GRANT SELECT ON public.view_financial_monthly_trends TO authenticated;
GRANT SELECT ON public.view_financial_revenue_by_category TO authenticated;
GRANT SELECT ON public.view_attendance_by_dept TO authenticated;
GRANT SELECT ON public.view_inventory_velocity TO authenticated;
GRANT SELECT ON public.view_service_performance TO authenticated;

-- Ensure underlying tables are also readable (though RLS will still apply)
GRANT SELECT ON public.sale_bills TO authenticated;
GRANT SELECT ON public.purchase_bills TO authenticated;
GRANT SELECT ON public.sale_bill_items TO authenticated;
GRANT SELECT ON public.attendance_logs TO authenticated;
GRANT SELECT ON public.job_sessions TO authenticated;
GRANT SELECT ON public.stock_transactions TO authenticated;
GRANT SELECT ON public.inventory TO authenticated;
GRANT SELECT ON public.service_requests TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.employees TO authenticated;
GRANT SELECT ON public.shifts TO authenticated;
GRANT SELECT ON public.employee_shift_assignments TO authenticated;

COMMENT ON TABLE public.sale_bills IS 'Bills for services provided, used in financial reporting.';
