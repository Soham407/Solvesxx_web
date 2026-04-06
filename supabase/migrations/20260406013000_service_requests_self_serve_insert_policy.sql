DROP POLICY IF EXISTS "Users create own service requests" ON public.service_requests;

CREATE POLICY "Users create own service requests" ON public.service_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND requester_id = auth.uid()
);
