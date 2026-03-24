CREATE POLICY "Authenticated users can update checklist responses"
ON checklist_responses
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');;
