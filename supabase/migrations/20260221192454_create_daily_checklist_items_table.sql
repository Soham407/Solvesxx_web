
CREATE TABLE IF NOT EXISTS public.daily_checklist_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    checklist_id UUID REFERENCES public.daily_checklists(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    task_name VARCHAR NOT NULL,
    category VARCHAR NOT NULL DEFAULT 'general',
    priority INTEGER NOT NULL DEFAULT 1,
    requires_photo BOOLEAN NOT NULL DEFAULT false,
    requires_signature BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.daily_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read checklist items"
  ON public.daily_checklist_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage checklist items"
  ON public.daily_checklist_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
        AND r.role_name IN ('admin','company_md','company_hod','society_manager','security_supervisor')
    )
  );
;
