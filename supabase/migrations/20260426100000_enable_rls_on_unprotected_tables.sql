-- Two problems fixed here:
-- 1. RLS was never enabled on these 4 tables (anon could read all rows)
-- 2. Old "Anyone can view X" policies with TO public / USING (true) overrode
--    all the targeted policies added in later migrations.

ALTER TABLE public.security_guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view security guards" ON public.security_guards;
DROP POLICY IF EXISTS "Anyone can view attendance logs"  ON public.attendance_logs;
DROP POLICY IF EXISTS "Anyone can view residents"        ON public.residents;
DROP POLICY IF EXISTS "Anyone can view visitors"         ON public.visitors;
