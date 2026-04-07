ALTER TABLE public.panic_alerts
DROP CONSTRAINT IF EXISTS panic_alerts_resolved_by_fkey;

UPDATE public.panic_alerts pa
SET resolved_by = e.id
FROM public.employees e
WHERE pa.resolved_by IS NOT NULL
  AND pa.resolved_by = e.auth_user_id;

UPDATE public.panic_alerts pa
SET resolved_by = NULL
WHERE pa.resolved_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = pa.resolved_by
  );

ALTER TABLE public.panic_alerts
ADD CONSTRAINT panic_alerts_resolved_by_fkey
FOREIGN KEY (resolved_by) REFERENCES public.employees(id);

COMMENT ON COLUMN public.panic_alerts.resolved_by IS 'Employee ID who resolved this alert';
