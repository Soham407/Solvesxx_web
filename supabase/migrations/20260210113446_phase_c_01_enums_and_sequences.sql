
-- ============================================
-- PHASE C MIGRATION 01: ENUMS
-- ============================================

-- Candidate status for recruitment workflow
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'candidate_status') THEN
        CREATE TYPE candidate_status AS ENUM (
            'screening', 'interviewing', 'background_check', 'offered', 'hired', 'rejected'
        );
    END IF;
END $$;

-- Document types for employee compliance
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'aadhar_card', 'pan_card', 'passport', 'driving_license', 'voter_id',
            'bank_passbook', 'education_certificate', 'experience_certificate',
            'offer_letter', 'relieving_letter', 'address_proof', 'police_verification',
            'medical_certificate', 'other'
        );
    END IF;
END $$;

-- Document verification status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM (
            'pending_upload', 'pending_review', 'verified', 'expired', 'rejected'
        );
    END IF;
END $$;

-- Reconciliation status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
        CREATE TYPE reconciliation_status AS ENUM (
            'pending', 'matched', 'discrepancy', 'resolved', 'disputed'
        );
    END IF;
END $$;

-- Payroll cycle status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_cycle_status') THEN
        CREATE TYPE payroll_cycle_status AS ENUM (
            'draft', 'processing', 'computed', 'approved', 'disbursed', 'cancelled'
        );
    END IF;
END $$;

-- Payslip status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payslip_status') THEN
        CREATE TYPE payslip_status AS ENUM (
            'draft', 'computed', 'approved', 'processed', 'disputed'
        );
    END IF;
END $$;

-- Indent status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'indent_status') THEN
        CREATE TYPE indent_status AS ENUM (
            'draft', 'pending_approval', 'approved', 'rejected', 'po_created', 'cancelled'
        );
    END IF;
END $$;

-- PO status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
        CREATE TYPE po_status AS ENUM (
            'draft', 'sent_to_vendor', 'acknowledged', 'partial_received', 'received', 'cancelled'
        );
    END IF;
END $$;

-- GRN status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grn_status') THEN
        CREATE TYPE grn_status AS ENUM (
            'draft', 'inspecting', 'accepted', 'partial_accepted', 'rejected'
        );
    END IF;
END $$;

-- ============================================
-- SEQUENCES
-- ============================================
CREATE SEQUENCE IF NOT EXISTS candidate_seq START 1;
CREATE SEQUENCE IF NOT EXISTS reconciliation_seq START 1;
CREATE SEQUENCE IF NOT EXISTS payslip_seq START 1;
CREATE SEQUENCE IF NOT EXISTS indent_seq START 1;
CREATE SEQUENCE IF NOT EXISTS po_seq START 1;
CREATE SEQUENCE IF NOT EXISTS grn_seq START 1;
CREATE SEQUENCE IF NOT EXISTS purchase_bill_seq START 1;
;
