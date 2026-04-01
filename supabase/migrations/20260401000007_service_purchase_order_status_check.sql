-- =============================================================================
-- Migration: 20260401000007_service_purchase_order_status_check.sql
-- Purpose:
--   Add a CHECK constraint to service_purchase_orders.status to enforce 
--   valid status transitions at the DB level.
-- =============================================================================

ALTER TABLE public.service_purchase_orders
  ADD CONSTRAINT service_purchase_orders_status_check
  CHECK (status IN (
    'draft',
    'sent_to_vendor',
    'acknowledged',
    'in_progress',
    'delivery_note_uploaded',
    'deployment_confirmed',
    'completed',
    'cancelled'
  ));
