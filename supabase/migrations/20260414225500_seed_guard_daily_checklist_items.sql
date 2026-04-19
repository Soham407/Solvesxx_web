-- Seed the default guard daily checklist items used by the mobile staging flow.
-- The linked staging project currently has checklist headers but zero checklist items,
-- which makes get_guard_checklist_items() return an empty array.

DO $$
DECLARE
  v_checklist_id UUID;
BEGIN
  SELECT dc.id
  INTO v_checklist_id
  FROM public.daily_checklists dc
  WHERE dc.checklist_code = 'SEC-CHK-001'
  LIMIT 1;

  IF v_checklist_id IS NULL THEN
    SELECT dc.id
    INTO v_checklist_id
    FROM public.daily_checklists dc
    WHERE dc.checklist_code = 'DC01'
    LIMIT 1;
  END IF;

  IF v_checklist_id IS NULL THEN
    RAISE NOTICE 'Skipping guard checklist item seed because no daily checklist header exists.';
    RETURN;
  END IF;

  INSERT INTO public.daily_checklist_items (
    checklist_id,
    task_name,
    category,
    priority,
    requires_photo,
    requires_signature,
    description,
    is_active,
    input_type,
    requires_supervisor_override
  )
  SELECT
    v_checklist_id,
    seeded.task_name,
    seeded.category,
    seeded.priority,
    seeded.requires_photo,
    FALSE,
    seeded.description,
    TRUE,
    'yes_no',
    FALSE
  FROM (
    VALUES
      (
        'Perimeter and gate lock check',
        'security',
        1,
        FALSE,
        'Verify that the main gate, side gate, and boom barrier are secure.'
      ),
      (
        'Fire panel and extinguisher inspection',
        'safety',
        2,
        TRUE,
        'Confirm the panel is normal and capture evidence for the red zone board.'
      ),
      (
        'CCTV wall live feed review',
        'security',
        3,
        FALSE,
        'Check all camera tiles and flag any blind spots before the first patrol.'
      ),
      (
        'Visitor desk readiness',
        'operations',
        4,
        FALSE,
        'Check register, intercom device, and visitor badges at the front desk.'
      ),
      (
        'Pump room and DG room patrol',
        'safety',
        5,
        TRUE,
        'Walk the service rooms and capture any leak, smoke, or noise issue immediately.'
      ),
      (
        'Shift handover log updated',
        'operations',
        6,
        FALSE,
        'Record the previous shift notes before switching into active duty mode.'
      )
  ) AS seeded(task_name, category, priority, requires_photo, description)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.daily_checklist_items existing
    WHERE existing.checklist_id = v_checklist_id
      AND existing.task_name = seeded.task_name
  );
END $$;
