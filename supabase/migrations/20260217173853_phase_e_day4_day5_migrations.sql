
-- DAY 4: Resident Directory Search (Privacy Safe)
CREATE OR REPLACE FUNCTION search_residents(p_query text, p_society_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  full_name text,
  flat_number text,
  profile_photo_url text,
  masked_phone text,
  is_owner boolean,
  move_in_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    (r.first_name || ' ' || r.last_name) as full_name,
    f.flat_number,
    r.profile_photo_url,
    -- Mask phone: *****6789
    CASE 
      WHEN length(r.phone_number) >= 10 THEN
        repeat('*', 6) || substring(r.phone_number from length(r.phone_number)-3)
      ELSE
        '*****'
    END as masked_phone,
    r.is_owner,
    r.move_in_date
  FROM residents r
  JOIN flats f ON r.flat_id = f.id
  WHERE 
    (p_society_id IS NULL OR f.society_id = p_society_id)
    AND (
      r.first_name ILIKE '%' || p_query || '%' OR
      r.last_name ILIKE '%' || p_query || '%' OR
      f.flat_number ILIKE '%' || p_query || '%'
    )
    AND r.status = 'active'
  LIMIT 50;
END;
$$;

-- DAY 5: BGV Trigger
CREATE OR REPLACE FUNCTION update_bgv_docs_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE employees
    SET bgv_completed_docs = (
        SELECT COUNT(*)
        FROM employee_documents
        WHERE employee_id = NEW.employee_id
        AND document_type IN ('police_verification', 'address_proof', 'id_proof')
        AND document_url IS NOT NULL
        AND status = 'approved'
    ),
    is_bgv_compliant = (
        SELECT COUNT(*) >= 2
        FROM employee_documents
        WHERE employee_id = NEW.employee_id
        AND document_type IN ('police_verification', 'address_proof', 'id_proof')
        AND document_url IS NOT NULL
        AND status = 'approved'
    )
    WHERE id = NEW.employee_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_bgv_docs_count ON employee_documents;
CREATE TRIGGER trigger_update_bgv_docs_count
AFTER INSERT OR UPDATE ON employee_documents
FOR EACH ROW
EXECUTE FUNCTION update_bgv_docs_count();
;
