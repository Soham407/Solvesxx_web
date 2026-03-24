
-- Upgrade Service Performance View with SLA Breaches
CREATE OR REPLACE VIEW public.view_service_performance AS
 SELECT s.service_category,
    count(sr.id) AS total_jobs,
    round(avg(EXTRACT(epoch FROM sr.completed_at - sr.created_at) / 3600::numeric), 1) AS avg_response,
    round(avg(sf.score), 1) AS avg_rating,
    round(count(sr.id) FILTER (WHERE sr.status = 'completed'::service_request_status)::numeric / NULLIF(count(sr.id), 0)::numeric * 100::numeric, 1) AS resolution_rate,
    count(sr.id) FILTER (WHERE (sr.completed_at - sr.created_at > interval '24 hours') OR (sr.status != 'completed' AND now() - sr.created_at > interval '24 hours')) AS total_breaches
   FROM services s
     JOIN service_requests sr ON s.id = sr.service_id
     LEFT JOIN service_feedback sf ON sr.id = sf.service_request_id
  GROUP BY s.service_category;

-- Create Financial KPIs View
CREATE OR REPLACE VIEW public.view_financial_kpis AS
 SELECT 
    COALESCE(SUM(due_amount), 0) AS total_outstanding,
    COALESCE(SUM(paid_amount), 0) AS total_collected_ytd,
    COALESCE(SUM(total_amount), 0) AS total_billing_ytd
 FROM public.sale_bills;
;
