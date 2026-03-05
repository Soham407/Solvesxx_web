export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_categories: {
        Row: {
          category_code: string
          category_name: string
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          maintenance_frequency_days: number | null
          parent_category_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          maintenance_frequency_days?: number | null
          parent_category_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          maintenance_frequency_days?: number | null
          parent_category_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_code: string
          category_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expected_life_years: number | null
          id: string
          location_id: string
          manufacturer: string | null
          model_number: string | null
          name: string
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          society_id: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["asset_status"] | null
          updated_at: string | null
          updated_by: string | null
          vendor_id: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_code: string
          category_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_life_years?: number | null
          id?: string
          location_id: string
          manufacturer?: string | null
          model_number?: string | null
          name: string
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          society_id?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_code?: string
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_life_years?: number | null
          id?: string
          location_id?: string
          manufacturer?: string | null
          model_number?: string | null
          name?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          society_id?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          check_in_latitude: number | null
          check_in_location_id: string | null
          check_in_longitude: number | null
          check_in_selfie_url: string | null
          check_in_time: string | null
          check_out_latitude: number | null
          check_out_location_id: string | null
          check_out_longitude: number | null
          check_out_time: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_auto_punch_out: boolean | null
          log_date: string
          status: string | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          check_in_latitude?: number | null
          check_in_location_id?: string | null
          check_in_longitude?: number | null
          check_in_selfie_url?: string | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_location_id?: string | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_auto_punch_out?: boolean | null
          log_date: string
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          check_in_latitude?: number | null
          check_in_location_id?: string | null
          check_in_longitude?: number | null
          check_in_selfie_url?: string | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_location_id?: string | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_auto_punch_out?: boolean | null
          log_date?: string
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_check_in_location_id_fkey"
            columns: ["check_in_location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_check_out_location_id_fkey"
            columns: ["check_out_location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          evidence_url: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      behaviour_tickets: {
        Row: {
          category: string
          created_at: string | null
          description: string
          employee_id: string
          evidence_photo_url: string | null
          id: string
          incident_date: string
          incident_time: string | null
          raised_by: string
          severity: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          employee_id: string
          evidence_photo_url?: string | null
          id?: string
          incident_date?: string
          incident_time?: string | null
          raised_by: string
          severity: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          employee_id?: string
          evidence_photo_url?: string | null
          id?: string
          incident_date?: string
          incident_time?: string | null
          raised_by?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "behaviour_tickets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviour_tickets_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_notified_at: string | null
          alert_threshold_percent: number | null
          allocated_amount: number
          budget_code: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          financial_period_id: string
          id: string
          name: string
          remaining_amount: number | null
          status: Database["public"]["Enums"]["budget_status"]
          updated_at: string | null
          used_amount: number | null
        }
        Insert: {
          alert_notified_at?: string | null
          alert_threshold_percent?: number | null
          allocated_amount: number
          budget_code?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          financial_period_id: string
          id?: string
          name: string
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string | null
          used_amount?: number | null
        }
        Update: {
          alert_notified_at?: string | null
          alert_threshold_percent?: number | null
          allocated_amount?: number
          budget_code?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          financial_period_id?: string
          id?: string
          name?: string
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string | null
          used_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_financial_period_id_fkey"
            columns: ["financial_period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          building_code: string
          building_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          society_id: string
          total_flats: number | null
          total_floors: number | null
        }
        Insert: {
          building_code: string
          building_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          society_id: string
          total_flats?: number | null
          total_floors?: number | null
        }
        Update: {
          building_code?: string
          building_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          society_id?: string
          total_flats?: number | null
          total_floors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_interviews: {
        Row: {
          cancellation_reason: string | null
          candidate_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duration_minutes: number | null
          feedback: string | null
          id: string
          interview_type: string
          interviewer_id: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          panel_members: Json | null
          rating: number | null
          recommendation: string | null
          round_number: number
          scheduled_at: string
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          candidate_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          interview_type: string
          interviewer_id?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          panel_members?: Json | null
          rating?: number | null
          recommendation?: string | null
          round_number: number
          scheduled_at: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          candidate_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          interview_type?: string
          interviewer_id?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          panel_members?: Json | null
          rating?: number | null
          recommendation?: string | null
          round_number?: number
          scheduled_at?: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address: string | null
          applied_position: string
          bgv_completed_at: string | null
          bgv_initiated_at: string | null
          bgv_notes: string | null
          bgv_status: string | null
          candidate_code: string | null
          city: string | null
          converted_at: string | null
          converted_employee_id: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          department: string | null
          designation_id: string | null
          email: string
          expected_salary: number | null
          first_name: string
          id: string
          interview_date: string | null
          interview_notes: string | null
          interview_rating: number | null
          interviewer_id: string | null
          joining_date: string | null
          last_name: string
          notes: string | null
          notice_period_days: number | null
          offer_accepted_at: string | null
          offer_date: string | null
          offered_salary: number | null
          phone: string
          pincode: string | null
          referred_by: string | null
          rejection_reason: string | null
          resume_url: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          applied_position: string
          bgv_completed_at?: string | null
          bgv_initiated_at?: string | null
          bgv_notes?: string | null
          bgv_status?: string | null
          candidate_code?: string | null
          city?: string | null
          converted_at?: string | null
          converted_employee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation_id?: string | null
          email: string
          expected_salary?: number | null
          first_name: string
          id?: string
          interview_date?: string | null
          interview_notes?: string | null
          interview_rating?: number | null
          interviewer_id?: string | null
          joining_date?: string | null
          last_name: string
          notes?: string | null
          notice_period_days?: number | null
          offer_accepted_at?: string | null
          offer_date?: string | null
          offered_salary?: number | null
          phone: string
          pincode?: string | null
          referred_by?: string | null
          rejection_reason?: string | null
          resume_url?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          applied_position?: string
          bgv_completed_at?: string | null
          bgv_initiated_at?: string | null
          bgv_notes?: string | null
          bgv_status?: string | null
          candidate_code?: string | null
          city?: string | null
          converted_at?: string | null
          converted_employee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation_id?: string | null
          email?: string
          expected_salary?: number | null
          first_name?: string
          id?: string
          interview_date?: string | null
          interview_notes?: string | null
          interview_rating?: number | null
          interviewer_id?: string | null
          joining_date?: string | null
          last_name?: string
          notes?: string | null
          notice_period_days?: number | null
          offer_accepted_at?: string | null
          offer_date?: string | null
          offered_salary?: number | null
          phone?: string
          pincode?: string | null
          referred_by?: string | null
          rejection_reason?: string | null
          resume_url?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_converted_employee_id_fkey"
            columns: ["converted_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_responses: {
        Row: {
          checklist_id: string
          created_at: string | null
          employee_id: string
          evidence_photos: Json | null
          id: string
          is_complete: boolean | null
          latitude: number | null
          location_id: string | null
          longitude: number | null
          response_date: string
          responses: Json
          submitted_at: string | null
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          employee_id: string
          evidence_photos?: Json | null
          id?: string
          is_complete?: boolean | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          response_date: string
          responses: Json
          submitted_at?: string | null
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          employee_id?: string
          evidence_photos?: Json | null
          id?: string
          is_complete?: boolean | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          response_date?: string
          responses?: Json
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_responses_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "daily_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_responses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_events: {
        Row: {
          attendees: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_code: string | null
          event_date: string
          event_name: string | null
          event_time: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          attendees?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_code?: string | null
          event_date: string
          event_name?: string | null
          event_time?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          attendees?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_code?: string | null
          event_date?: string
          event_name?: string | null
          event_time?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_locations: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          geo_fence_radius: number | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location_code: string
          location_name: string
          location_type: string | null
          longitude: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          geo_fence_radius?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_code: string
          location_name: string
          location_type?: string | null
          longitude?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          geo_fence_radius?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_code?: string
          location_name?: string
          location_type?: string | null
          longitude?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_payload: Json
          id: string
          is_locked: boolean | null
          period_id: string | null
          snapshot_date: string | null
          snapshot_name: string
          total_bills_amount: number
          total_collections_amount: number
          total_invoices_amount: number
          total_payouts_amount: number
          unresolved_reconciliations_count: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_payload?: Json
          id?: string
          is_locked?: boolean | null
          period_id?: string | null
          snapshot_date?: string | null
          snapshot_name: string
          total_bills_amount?: number
          total_collections_amount?: number
          total_invoices_amount?: number
          total_payouts_amount?: number
          unresolved_reconciliations_count?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_payload?: Json
          id?: string
          is_locked?: boolean | null
          period_id?: string | null
          snapshot_date?: string | null
          snapshot_name?: string
          total_bills_amount?: number
          total_collections_amount?: number
          total_invoices_amount?: number
          total_payouts_amount?: number
          unresolved_reconciliations_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "compliance_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_snapshots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_number: string
          contract_value: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_url: string | null
          end_date: string
          id: string
          is_active: boolean | null
          payment_terms: string | null
          society_id: string
          start_date: string
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          contract_number: string
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          payment_terms?: string | null
          society_id: string
          start_date: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          contract_number?: string
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          payment_terms?: string | null
          society_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checklist_items: {
        Row: {
          category: string
          checklist_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          priority: number
          requires_photo: boolean
          requires_signature: boolean
          shift_id: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          checklist_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          requires_photo?: boolean
          requires_signature?: boolean
          shift_id?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          checklist_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          requires_photo?: boolean
          requires_signature?: boolean
          shift_id?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "daily_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checklist_items_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checklists: {
        Row: {
          checklist_code: string
          checklist_name: string
          created_at: string | null
          created_by: string | null
          department: string
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          questions: Json
          updated_at: string | null
        }
        Insert: {
          checklist_code: string
          checklist_name: string
          created_at?: string | null
          created_by?: string | null
          department: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          questions: Json
          updated_at?: string | null
        }
        Update: {
          checklist_code?: string
          checklist_name?: string
          created_at?: string | null
          created_by?: string | null
          department?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          questions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      designations: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          designation_code: string
          designation_name: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          designation_code: string
          designation_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          designation_code?: string
          designation_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          contact_name: string
          contact_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          phone_number: string
          priority: number | null
          society_id: string | null
        }
        Insert: {
          contact_name: string
          contact_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          phone_number: string
          priority?: number | null
          society_id?: string | null
        }
        Update: {
          contact_name?: string
          contact_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string
          priority?: number | null
          society_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_behavior_tickets: {
        Row: {
          category: Database["public"]["Enums"]["behavior_category"]
          created_at: string | null
          description: string | null
          employee_id: string
          evidence_urls: Json | null
          id: string
          reported_by: string | null
          resolution: string | null
          severity: string
          status: string | null
          ticket_number: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["behavior_category"]
          created_at?: string | null
          description?: string | null
          employee_id: string
          evidence_urls?: Json | null
          id?: string
          reported_by?: string | null
          resolution?: string | null
          severity: string
          status?: string | null
          ticket_number?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["behavior_category"]
          created_at?: string | null
          description?: string | null
          employee_id?: string
          evidence_urls?: Json | null
          id?: string
          reported_by?: string | null
          resolution?: string | null
          severity?: string
          status?: string | null
          ticket_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_behavior_tickets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_behavior_tickets_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_code: string | null
          document_name: string
          document_number: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          expiry_date: string | null
          expiry_notified_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string | null
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_code?: string | null
          document_name: string
          document_number?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          expiry_date?: string | null
          expiry_notified_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string | null
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_code?: string | null
          document_name?: string
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          employee_id?: string
          expiry_date?: string | null
          expiry_notified_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string | null
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_structure: {
        Row: {
          amount: number
          component_id: string
          created_at: string | null
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          component_id: string
          created_at?: string | null
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          component_id?: string
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_structure_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_structure_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shift_assignments: {
        Row: {
          assigned_by: string | null
          assigned_from: string
          assigned_to: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_active: boolean | null
          shift_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_from: string
          assigned_to?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          shift_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_from?: string
          assigned_to?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shift_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          auth_user_id: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          date_of_joining: string
          department: string | null
          designation_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          photo_url: string | null
          pincode: string | null
          reporting_to: string | null
          state: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          date_of_joining: string
          department?: string | null
          designation_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          reporting_to?: string | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          date_of_joining?: string
          department?: string | null
          designation_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          reporting_to?: string | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          period_name: string
          period_type: Database["public"]["Enums"]["financial_period_type"]
          start_date: string
          status: Database["public"]["Enums"]["financial_period_status"]
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          period_name: string
          period_type: Database["public"]["Enums"]["financial_period_type"]
          start_date: string
          status?: Database["public"]["Enums"]["financial_period_status"]
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          period_name?: string
          period_type?: Database["public"]["Enums"]["financial_period_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["financial_period_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      flats: {
        Row: {
          area_sqft: number | null
          building_id: string
          created_at: string | null
          flat_number: string
          flat_type: string | null
          floor_number: number | null
          id: string
          is_active: boolean | null
          is_occupied: boolean | null
          ownership_type: string | null
        }
        Insert: {
          area_sqft?: number | null
          building_id: string
          created_at?: string | null
          flat_number: string
          flat_type?: string | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          is_occupied?: boolean | null
          ownership_type?: string | null
        }
        Update: {
          area_sqft?: number | null
          building_id?: string
          created_at?: string | null
          flat_number?: string
          flat_type?: string | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          is_occupied?: boolean | null
          ownership_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flats_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_tracking: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_tracking_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "security_guards"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_tracking_2026_02: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_03: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_04: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_05: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_06: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_07: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_08: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_09: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_10: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_11: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_2026_12: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      gps_tracking_default: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          employee_id: string
          heading_degrees: number | null
          id: string
          is_mock_location: boolean | null
          latitude: number
          longitude: number
          speed_kmh: number | null
          tracked_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude: number
          longitude: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          employee_id?: string
          heading_degrees?: number | null
          id?: string
          is_mock_location?: boolean | null
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
          tracked_at?: string
        }
        Relationships: []
      }
      guard_patrol_logs: {
        Row: {
          anomalies_found: string | null
          checkpoints_verified: number | null
          created_at: string | null
          guard_id: string
          id: string
          patrol_end_time: string | null
          patrol_route: Json | null
          patrol_start_time: string
          photos: Json | null
          total_checkpoints: number | null
        }
        Insert: {
          anomalies_found?: string | null
          checkpoints_verified?: number | null
          created_at?: string | null
          guard_id: string
          id?: string
          patrol_end_time?: string | null
          patrol_route?: Json | null
          patrol_start_time: string
          photos?: Json | null
          total_checkpoints?: number | null
        }
        Update: {
          anomalies_found?: string | null
          checkpoints_verified?: number | null
          created_at?: string | null
          guard_id?: string
          id?: string
          patrol_end_time?: string | null
          patrol_route?: Json | null
          patrol_start_time?: string
          photos?: Json | null
          total_checkpoints?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guard_patrol_logs_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "security_guards"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_master: {
        Row: {
          created_at: string | null
          description: string | null
          holiday_date: string
          holiday_name: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          holiday_date: string
          holiday_name: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          holiday_date?: string
          holiday_name?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          holiday_date: string
          holiday_name: string
          holiday_type: string | null
          id: string
          is_active: boolean | null
          payroll_impact: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          holiday_date: string
          holiday_name: string
          holiday_type?: string | null
          id?: string
          is_active?: boolean | null
          payroll_impact?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          holiday_date?: string
          holiday_name?: string
          holiday_type?: string | null
          id?: string
          is_active?: boolean | null
          payroll_impact?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      horticulture_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          frequency: string
          id: string
          last_completed_at: string | null
          next_due_date: string | null
          notes: string | null
          priority: string | null
          status: string | null
          task_type: string
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          frequency: string
          id?: string
          last_completed_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          task_type: string
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          frequency?: string
          id?: string
          last_completed_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          task_type?: string
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horticulture_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horticulture_tasks_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "horticulture_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      horticulture_zones: {
        Row: {
          area_sqft: number | null
          created_at: string | null
          description: string | null
          health_status: string | null
          id: string
          last_maintained_at: string | null
          society_id: string | null
          updated_at: string | null
          zone_name: string
        }
        Insert: {
          area_sqft?: number | null
          created_at?: string | null
          description?: string | null
          health_status?: string | null
          id?: string
          last_maintained_at?: string | null
          society_id?: string | null
          updated_at?: string | null
          zone_name: string
        }
        Update: {
          area_sqft?: number | null
          created_at?: string | null
          description?: string | null
          health_status?: string | null
          id?: string
          last_maintained_at?: string | null
          society_id?: string | null
          updated_at?: string | null
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "horticulture_zones_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      indent_items: {
        Row: {
          approved_quantity: number | null
          created_at: string | null
          estimated_total: number | null
          estimated_unit_price: number | null
          id: string
          indent_id: string
          item_description: string | null
          notes: string | null
          product_id: string | null
          requested_quantity: number
          specifications: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          approved_quantity?: number | null
          created_at?: string | null
          estimated_total?: number | null
          estimated_unit_price?: number | null
          id?: string
          indent_id: string
          item_description?: string | null
          notes?: string | null
          product_id?: string | null
          requested_quantity: number
          specifications?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_quantity?: number | null
          created_at?: string | null
          estimated_total?: number | null
          estimated_unit_price?: number | null
          id?: string
          indent_id?: string
          item_description?: string | null
          notes?: string | null
          product_id?: string | null
          requested_quantity?: number
          specifications?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indent_items_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indent_items_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indent_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indent_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "indent_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
        ]
      }
      indents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_notes: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          id: string
          indent_number: string | null
          linked_po_id: string | null
          location_id: string | null
          notes: string | null
          po_created_at: string | null
          priority: string | null
          purpose: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requester_id: string
          required_date: string | null
          society_id: string | null
          status: Database["public"]["Enums"]["indent_status"]
          submitted_at: string | null
          submitted_by: string | null
          title: string | null
          total_estimated_value: number | null
          total_items: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          indent_number?: string | null
          linked_po_id?: string | null
          location_id?: string | null
          notes?: string | null
          po_created_at?: string | null
          priority?: string | null
          purpose?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requester_id: string
          required_date?: string | null
          society_id?: string | null
          status?: Database["public"]["Enums"]["indent_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string | null
          total_estimated_value?: number | null
          total_items?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          indent_number?: string | null
          linked_po_id?: string | null
          location_id?: string | null
          notes?: string | null
          po_created_at?: string | null
          priority?: string | null
          purpose?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requester_id?: string
          required_date?: string | null
          society_id?: string | null
          status?: Database["public"]["Enums"]["indent_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string | null
          total_estimated_value?: number | null
          total_items?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indents_linked_po_fk"
            columns: ["linked_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_linked_po_fk"
            columns: ["linked_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string | null
          id: string
          last_stock_date: string | null
          location_id: string | null
          max_stock_level: number | null
          product_id: string
          quantity_on_hand: number
          reorder_level: number | null
          reserved_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_stock_date?: string | null
          location_id?: string | null
          max_stock_level?: number | null
          product_id: string
          quantity_on_hand?: number
          reorder_level?: number | null
          reserved_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_stock_date?: string | null
          location_id?: string | null
          max_stock_level?: number | null
          product_id?: string
          quantity_on_hand?: number
          reorder_level?: number | null
          reserved_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
        ]
      }
      job_materials_used: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          job_session_id: string
          notes: string | null
          product_id: string
          quantity: number
          stock_batch_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_session_id: string
          notes?: string | null
          product_id: string
          quantity: number
          stock_batch_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_session_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          stock_batch_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_materials_used_job_session_id_fkey"
            columns: ["job_session_id"]
            isOneToOne: false
            referencedRelation: "job_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_used_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_used_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "job_materials_used_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "job_materials_used_stock_batch_id_fkey"
            columns: ["stock_batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          captured_at: string | null
          id: string
          is_important: boolean | null
          job_session_id: string
          latitude: number | null
          longitude: number | null
          photo_type: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          captured_at?: string | null
          id?: string
          is_important?: boolean | null
          job_session_id: string
          latitude?: number | null
          longitude?: number | null
          photo_type: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          captured_at?: string | null
          id?: string
          is_important?: boolean | null
          job_session_id?: string
          latitude?: number | null
          longitude?: number | null
          photo_type?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_session_id_fkey"
            columns: ["job_session_id"]
            isOneToOne: false
            referencedRelation: "job_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sessions: {
        Row: {
          created_at: string | null
          end_latitude: number | null
          end_longitude: number | null
          end_time: string | null
          id: string
          remarks: string | null
          service_request_id: string
          start_latitude: number | null
          start_longitude: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["job_session_status"] | null
          technician_id: string
          updated_at: string | null
          work_performed: string | null
        }
        Insert: {
          created_at?: string | null
          end_latitude?: number | null
          end_longitude?: number | null
          end_time?: string | null
          id?: string
          remarks?: string | null
          service_request_id: string
          start_latitude?: number | null
          start_longitude?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["job_session_status"] | null
          technician_id: string
          updated_at?: string | null
          work_performed?: string | null
        }
        Update: {
          created_at?: string | null
          end_latitude?: number | null
          end_longitude?: number | null
          end_time?: string | null
          id?: string
          remarks?: string | null
          service_request_id?: string
          start_latitude?: number | null
          start_longitude?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["job_session_status"] | null
          technician_id?: string
          updated_at?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_sessions_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sessions_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sessions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          from_date: string
          id: string
          leave_type_id: string
          number_of_days: number
          reason: string
          rejection_reason: string | null
          status: string | null
          to_date: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          from_date: string
          id?: string
          leave_type_id: string
          number_of_days: number
          reason: string
          rejection_reason?: string | null
          status?: string | null
          to_date: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          from_date?: string
          id?: string
          leave_type_id?: string
          number_of_days?: number
          reason?: string
          rejection_reason?: string | null
          status?: string | null
          to_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          can_carry_forward: boolean | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          leave_name: string
          leave_type: Database["public"]["Enums"]["leave_type_enum"]
          max_carry_forward: number | null
          requires_approval: boolean | null
          updated_at: string | null
          yearly_quota: number
        }
        Insert: {
          can_carry_forward?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leave_name: string
          leave_type: Database["public"]["Enums"]["leave_type_enum"]
          max_carry_forward?: number | null
          requires_approval?: boolean | null
          updated_at?: string | null
          yearly_quota: number
        }
        Update: {
          can_carry_forward?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leave_name?: string
          leave_type?: Database["public"]["Enums"]["leave_type_enum"]
          max_carry_forward?: number | null
          requires_approval?: boolean | null
          updated_at?: string | null
          yearly_quota?: number
        }
        Relationships: []
      }
      login_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          first_attempt_at: string | null
          ip_address: unknown
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          ip_address: unknown
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          ip_address?: unknown
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_schedules: {
        Row: {
          asset_id: string
          assigned_to_employee: string | null
          assigned_to_role: string | null
          created_at: string | null
          created_by: string | null
          custom_interval_days: number | null
          frequency: Database["public"]["Enums"]["maintenance_frequency"]
          id: string
          is_active: boolean | null
          last_performed_date: string | null
          next_due_date: string
          reminder_days_before: number | null
          task_description: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          assigned_to_employee?: string | null
          assigned_to_role?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_interval_days?: number | null
          frequency: Database["public"]["Enums"]["maintenance_frequency"]
          id?: string
          is_active?: boolean | null
          last_performed_date?: string | null
          next_due_date: string
          reminder_days_before?: number | null
          task_description?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          assigned_to_employee?: string | null
          assigned_to_role?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_interval_days?: number | null
          frequency?: Database["public"]["Enums"]["maintenance_frequency"]
          id?: string
          is_active?: boolean | null
          last_performed_date?: string | null
          next_due_date?: string
          reminder_days_before?: number | null
          task_description?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_assigned_to_employee_fkey"
            columns: ["assigned_to_employee"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_assigned_to_role_fkey"
            columns: ["assigned_to_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_arrival_evidence: {
        Row: {
          arrival_status: string | null
          created_at: string | null
          driver_name: string | null
          gate_location: string | null
          id: string
          logged_by: string | null
          notes: string | null
          photo_url: string
          po_id: string | null
          signature_url: string | null
          vehicle_number: string | null
        }
        Insert: {
          arrival_status?: string | null
          created_at?: string | null
          driver_name?: string | null
          gate_location?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          photo_url: string
          po_id?: string | null
          signature_url?: string | null
          vehicle_number?: string | null
        }
        Update: {
          arrival_status?: string | null
          created_at?: string | null
          driver_name?: string | null
          gate_location?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          photo_url?: string
          po_id?: string | null
          signature_url?: string | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_arrival_evidence_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_arrival_evidence_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      material_arrival_logs: {
        Row: {
          arrival_photo_url: string
          arrival_signature_url: string | null
          created_at: string | null
          gate_location: string | null
          id: string
          logged_at: string | null
          logged_by: string
          notes: string | null
          po_id: string
          updated_at: string | null
          vehicle_number: string
        }
        Insert: {
          arrival_photo_url: string
          arrival_signature_url?: string | null
          created_at?: string | null
          gate_location?: string | null
          id?: string
          logged_at?: string | null
          logged_by: string
          notes?: string | null
          po_id: string
          updated_at?: string | null
          vehicle_number: string
        }
        Update: {
          arrival_photo_url?: string
          arrival_signature_url?: string | null
          created_at?: string | null
          gate_location?: string | null
          id?: string
          logged_at?: string | null
          logged_by?: string
          notes?: string | null
          po_id?: string
          updated_at?: string | null
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_arrival_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_arrival_logs_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_arrival_logs_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      material_receipt_items: {
        Row: {
          accepted_quantity: number | null
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          item_description: string | null
          line_total: number | null
          material_receipt_id: string
          notes: string | null
          ordered_quantity: number | null
          po_item_id: string | null
          product_id: string | null
          quality_status: string | null
          received_quantity: number
          rejected_quantity: number | null
          rejection_reason: string | null
          unit_price: number | null
          unmatched_amount: number | null
          unmatched_qty: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_description?: string | null
          line_total?: number | null
          material_receipt_id: string
          notes?: string | null
          ordered_quantity?: number | null
          po_item_id?: string | null
          product_id?: string | null
          quality_status?: string | null
          received_quantity: number
          rejected_quantity?: number | null
          rejection_reason?: string | null
          unit_price?: number | null
          unmatched_amount?: number | null
          unmatched_qty?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_description?: string | null
          line_total?: number | null
          material_receipt_id?: string
          notes?: string | null
          ordered_quantity?: number | null
          po_item_id?: string | null
          product_id?: string | null
          quality_status?: string | null
          received_quantity?: number
          rejected_quantity?: number | null
          rejection_reason?: string | null
          unit_price?: number | null
          unmatched_amount?: number | null
          unmatched_qty?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_receipt_items_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipt_items_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipt_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "material_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
        ]
      }
      material_receipts: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_challan_number: string | null
          grn_number: string | null
          id: string
          notes: string | null
          purchase_order_id: string | null
          quality_checked_at: string | null
          quality_checked_by: string | null
          received_by: string | null
          received_date: string
          status: Database["public"]["Enums"]["grn_status"]
          supplier_id: string | null
          total_received_value: number | null
          updated_at: string | null
          updated_by: string | null
          vehicle_number: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_challan_number?: string | null
          grn_number?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          quality_checked_at?: string | null
          quality_checked_by?: string | null
          received_by?: string | null
          received_date?: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id?: string | null
          total_received_value?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_challan_number?: string | null
          grn_number?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          quality_checked_at?: string | null
          quality_checked_by?: string | null
          received_by?: string | null
          received_date?: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id?: string | null
          total_received_value?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_quality_checked_by_fkey"
            columns: ["quality_checked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "material_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "material_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          recipient_phone: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          channel: string
          error_message?: string | null
          id?: string
          recipient_phone?: string | null
          sent_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          priority: string | null
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          priority?: string | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      panic_alerts: {
        Row: {
          alert_time: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string | null
          description: string | null
          guard_id: string
          id: string
          is_resolved: boolean | null
          latitude: number | null
          location_id: string | null
          longitude: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          alert_time?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          description?: string | null
          guard_id: string
          id?: string
          is_resolved?: boolean | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          alert_time?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          description?: string | null
          guard_id?: string
          id?: string
          is_resolved?: boolean | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panic_alerts_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "security_guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panic_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panic_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          config: Json | null
          created_at: string | null
          gateway: Database["public"]["Enums"]["payment_gateway"] | null
          id: string
          is_active: boolean | null
          method_name: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          gateway?: Database["public"]["Enums"]["payment_gateway"] | null
          id?: string
          is_active?: boolean | null
          method_name: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          gateway?: Database["public"]["Enums"]["payment_gateway"] | null
          id?: string
          is_active?: boolean | null
          method_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          evidence_url: string | null
          external_id: string | null
          failure_reason: string | null
          gateway_log: Json | null
          id: string
          notes: string | null
          payee_id: string | null
          payee_type: string | null
          payer_id: string | null
          payer_type: string | null
          payment_date: string
          payment_method_id: string | null
          payment_number: string | null
          payment_type: string
          processed_by: string | null
          reference_id: string | null
          reference_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          evidence_url?: string | null
          external_id?: string | null
          failure_reason?: string | null
          gateway_log?: Json | null
          id?: string
          notes?: string | null
          payee_id?: string | null
          payee_type?: string | null
          payer_id?: string | null
          payer_type?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_number?: string | null
          payment_type: string
          processed_by?: string | null
          reference_id?: string | null
          reference_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          evidence_url?: string | null
          external_id?: string | null
          failure_reason?: string | null
          gateway_log?: Json | null
          id?: string
          notes?: string | null
          payee_id?: string | null
          payee_type?: string | null
          payer_id?: string | null
          payer_type?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_number?: string | null
          payment_type?: string
          processed_by?: string | null
          reference_id?: string | null
          reference_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_cycles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          computed_at: string | null
          computed_by: string | null
          created_at: string | null
          created_by: string | null
          cycle_code: string
          disbursed_at: string | null
          disbursed_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_month: number
          period_start: string
          period_year: number
          status: Database["public"]["Enums"]["payroll_cycle_status"]
          total_deductions: number | null
          total_employees: number | null
          total_gross: number | null
          total_net: number | null
          total_working_days: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          computed_at?: string | null
          computed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle_code: string
          disbursed_at?: string | null
          disbursed_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_month: number
          period_start: string
          period_year: number
          status?: Database["public"]["Enums"]["payroll_cycle_status"]
          total_deductions?: number | null
          total_employees?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_working_days: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          computed_at?: string | null
          computed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle_code?: string
          disbursed_at?: string | null
          disbursed_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_month?: number
          period_start?: string
          period_year?: number
          status?: Database["public"]["Enums"]["payroll_cycle_status"]
          total_deductions?: number | null
          total_employees?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_working_days?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      payslips: {
        Row: {
          absent_days: number
          advance_recovery: number
          bank_account_number: string | null
          bank_ifsc: string | null
          basic_salary: number
          bonus: number
          created_at: string | null
          created_by: string | null
          employee_id: string
          employer_esic: number
          employer_pf: number
          esic_deduction: number
          gross_salary: number
          hra: number
          id: string
          leave_days: number
          loan_recovery: number
          medical_allowance: number
          net_payable: number
          notes: string | null
          other_deductions: number
          other_earnings: number
          overtime_amount: number
          overtime_hours: number
          paid_at: string | null
          payment_mode: string | null
          payment_reference: string | null
          payroll_cycle_id: string
          payslip_number: string | null
          pf_deduction: number
          present_days: number
          pro_rated_basic: number
          professional_tax: number
          special_allowance: number
          status: Database["public"]["Enums"]["payslip_status"]
          tds: number
          total_deductions: number
          travel_allowance: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          absent_days?: number
          advance_recovery?: number
          bank_account_number?: string | null
          bank_ifsc?: string | null
          basic_salary?: number
          bonus?: number
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          employer_esic?: number
          employer_pf?: number
          esic_deduction?: number
          gross_salary?: number
          hra?: number
          id?: string
          leave_days?: number
          loan_recovery?: number
          medical_allowance?: number
          net_payable?: number
          notes?: string | null
          other_deductions?: number
          other_earnings?: number
          overtime_amount?: number
          overtime_hours?: number
          paid_at?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          payroll_cycle_id: string
          payslip_number?: string | null
          pf_deduction?: number
          present_days?: number
          pro_rated_basic?: number
          professional_tax?: number
          special_allowance?: number
          status?: Database["public"]["Enums"]["payslip_status"]
          tds?: number
          total_deductions?: number
          travel_allowance?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          absent_days?: number
          advance_recovery?: number
          bank_account_number?: string | null
          bank_ifsc?: string | null
          basic_salary?: number
          bonus?: number
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          employer_esic?: number
          employer_pf?: number
          esic_deduction?: number
          gross_salary?: number
          hra?: number
          id?: string
          leave_days?: number
          loan_recovery?: number
          medical_allowance?: number
          net_payable?: number
          notes?: string | null
          other_deductions?: number
          other_earnings?: number
          overtime_amount?: number
          overtime_hours?: number
          paid_at?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          payroll_cycle_id?: string
          payslip_number?: string | null
          pf_deduction?: number
          present_days?: number
          pro_rated_basic?: number
          professional_tax?: number
          special_allowance?: number
          status?: Database["public"]["Enums"]["payslip_status"]
          tds?: number
          total_deductions?: number
          travel_allowance?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_cycle_id_fkey"
            columns: ["payroll_cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_control_chemicals: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_stock: number
          id: string
          is_active: boolean | null
          last_restocked_at: string | null
          product_id: string
          reorder_level: number
          unit: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean | null
          last_restocked_at?: string | null
          product_id: string
          reorder_level?: number
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean | null
          last_restocked_at?: string | null
          product_id?: string
          reorder_level?: number
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pest_control_chemicals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_control_chemicals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "pest_control_chemicals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pest_control_ppe_verifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          items_json: Json
          service_request_id: string | null
          site_readiness_report: string | null
          status: string
          technician_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          items_json: Json
          service_request_id?: string | null
          site_readiness_report?: string | null
          status?: string
          technician_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          items_json?: Json
          service_request_id?: string | null
          site_readiness_report?: string | null
          status?: string
          technician_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pest_control_ppe_verifications_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_control_ppe_verifications_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_control_ppe_verifications_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      printing_ad_spaces: {
        Row: {
          asset_id: string | null
          base_rate_paise: number
          created_at: string | null
          created_by: string | null
          dimensions: string | null
          id: string
          location_description: string | null
          space_name: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          asset_id?: string | null
          base_rate_paise?: number
          created_at?: string | null
          created_by?: string | null
          dimensions?: string | null
          id?: string
          location_description?: string | null
          space_name: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          asset_id?: string | null
          base_rate_paise?: number
          created_at?: string | null
          created_by?: string | null
          dimensions?: string | null
          id?: string
          location_description?: string | null
          space_name?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printing_ad_spaces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_ad_spaces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_code: string | null
          category_name: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          parent_category_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category_code?: string | null
          category_name: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category_code?: string | null
          category_name?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_subcategories: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          subcategory_code: string | null
          subcategory_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          subcategory_code?: string | null
          subcategory_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          subcategory_code?: string | null
          subcategory_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_rate: number | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          current_stock: number | null
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean | null
          min_stock_level: number | null
          product_code: string | null
          product_name: string
          specifications: Json | null
          status: string | null
          subcategory_id: string | null
          unit_of_measurement: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          base_rate?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          product_code?: string | null
          product_name: string
          specifications?: Json | null
          status?: string | null
          subcategory_id?: string | null
          unit_of_measurement?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          base_rate?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          product_code?: string | null
          product_name?: string
          specifications?: Json | null
          status?: string | null
          subcategory_id?: string | null
          unit_of_measurement?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "product_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bill_items: {
        Row: {
          billed_quantity: number
          created_at: string | null
          discount_amount: number | null
          grn_item_id: string | null
          id: string
          item_description: string | null
          line_total: number
          notes: string | null
          po_item_id: string | null
          product_id: string | null
          purchase_bill_id: string
          tax_amount: number | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number
          unmatched_amount: number | null
          unmatched_qty: number | null
          updated_at: string | null
        }
        Insert: {
          billed_quantity: number
          created_at?: string | null
          discount_amount?: number | null
          grn_item_id?: string | null
          id?: string
          item_description?: string | null
          line_total: number
          notes?: string | null
          po_item_id?: string | null
          product_id?: string | null
          purchase_bill_id: string
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price: number
          unmatched_amount?: number | null
          unmatched_qty?: number | null
          updated_at?: string | null
        }
        Update: {
          billed_quantity?: number
          created_at?: string | null
          discount_amount?: number | null
          grn_item_id?: string | null
          id?: string
          item_description?: string | null
          line_total?: number
          notes?: string | null
          po_item_id?: string | null
          product_id?: string | null
          purchase_bill_id?: string
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number
          unmatched_amount?: number | null
          unmatched_qty?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bill_items_grn_item_id_fkey"
            columns: ["grn_item_id"]
            isOneToOne: false
            referencedRelation: "material_receipt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bill_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_bill_items_purchase_bill_id_fkey"
            columns: ["purchase_bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bill_items_purchase_bill_id_fkey"
            columns: ["purchase_bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bills: {
        Row: {
          bill_date: string
          bill_number: string | null
          budget_id: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          due_amount: number | null
          due_date: string | null
          external_id: string | null
          failure_reason: string | null
          gateway_log: Json | null
          id: string
          is_reconciled: boolean | null
          last_payment_date: string | null
          match_status: string | null
          material_receipt_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_status: string | null
          purchase_order_id: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          supplier_invoice_number: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bill_date?: string
          bill_number?: string | null
          budget_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_amount?: number | null
          due_date?: string | null
          external_id?: string | null
          failure_reason?: string | null
          gateway_log?: Json | null
          id?: string
          is_reconciled?: boolean | null
          last_payment_date?: string | null
          match_status?: string | null
          material_receipt_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          purchase_order_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bill_date?: string
          bill_number?: string | null
          budget_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_amount?: number | null
          due_date?: string | null
          external_id?: string | null
          failure_reason?: string | null
          gateway_log?: Json | null
          id?: string
          is_reconciled?: boolean | null
          last_payment_date?: string | null
          match_status?: string | null
          material_receipt_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          purchase_order_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bills_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          indent_item_id: string | null
          item_description: string | null
          line_total: number
          notes: string | null
          ordered_quantity: number
          product_id: string | null
          purchase_order_id: string
          received_quantity: number | null
          specifications: string | null
          tax_amount: number | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number
          unmatched_amount: number | null
          unmatched_qty: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          indent_item_id?: string | null
          item_description?: string | null
          line_total: number
          notes?: string | null
          ordered_quantity: number
          product_id?: string | null
          purchase_order_id: string
          received_quantity?: number | null
          specifications?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price: number
          unmatched_amount?: number | null
          unmatched_qty?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          indent_item_id?: string | null
          item_description?: string | null
          line_total?: number
          notes?: string | null
          ordered_quantity?: number
          product_id?: string | null
          purchase_order_id?: string
          received_quantity?: number | null
          specifications?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number
          unmatched_amount?: number | null
          unmatched_qty?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_indent_item_id_fkey"
            columns: ["indent_item_id"]
            isOneToOne: false
            referencedRelation: "indent_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          billing_address: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          dispatch_notes: string | null
          dispatched_at: string | null
          expected_delivery_date: string | null
          grand_total: number | null
          id: string
          indent_id: string | null
          notes: string | null
          payment_terms: string | null
          po_date: string
          po_number: string | null
          sent_to_vendor_at: string | null
          shipping_address: string | null
          shipping_cost: number | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          terms_and_conditions: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_details: string | null
          vendor_acknowledged_at: string | null
        }
        Insert: {
          billing_address?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          dispatch_notes?: string | null
          dispatched_at?: string | null
          expected_delivery_date?: string | null
          grand_total?: number | null
          id?: string
          indent_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_date?: string
          po_number?: string | null
          sent_to_vendor_at?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_details?: string | null
          vendor_acknowledged_at?: string | null
        }
        Update: {
          billing_address?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          dispatch_notes?: string | null
          dispatched_at?: string | null
          expected_delivery_date?: string | null
          grand_total?: number | null
          id?: string
          indent_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_date?: string
          po_number?: string | null
          sent_to_vendor_at?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_details?: string | null
          vendor_acknowledged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          is_active: boolean | null
          last_used: string | null
          token: string
          token_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          token: string
          token_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          token?: string
          token_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_batch_logs: {
        Row: {
          batch_id: string
          count: number
          download_count: number | null
          downloaded_at: string | null
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          society_id: string
          warehouse_id: string | null
        }
        Insert: {
          batch_id: string
          count: number
          download_count?: number | null
          downloaded_at?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          society_id: string
          warehouse_id?: string | null
        }
        Update: {
          batch_id?: string
          count?: number
          download_count?: number | null
          downloaded_at?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          society_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_batch_logs_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_batch_logs_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_batch_logs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "qr_batch_logs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          asset_id: string | null
          batch_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_linked: boolean | null
          print_batch_id: string | null
          sequence_number: number | null
          society_id: string | null
          version: number | null
          warehouse_id: string | null
        }
        Insert: {
          asset_id?: string | null
          batch_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_linked?: boolean | null
          print_batch_id?: string | null
          sequence_number?: number | null
          society_id?: string | null
          version?: number | null
          warehouse_id?: string | null
        }
        Update: {
          asset_id?: string | null
          batch_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_linked?: boolean | null
          print_batch_id?: string | null
          sequence_number?: number | null
          society_id?: string | null
          version?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "qr_codes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          id: string
          ip_address: unknown
          latitude: number | null
          longitude: number | null
          qr_id: string
          scanned_at: string | null
          scanned_by: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          qr_id: string
          scanned_at?: string | null
          scanned_by?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          qr_id?: string
          scanned_at?: string | null
          scanned_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_qr_id_fkey"
            columns: ["qr_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_qr_id_fkey"
            columns: ["qr_id"]
            isOneToOne: false
            referencedRelation: "qr_codes_with_batch_info"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_lines: {
        Row: {
          bill_item_id: string | null
          bill_unit_price: number | null
          created_at: string | null
          grn_item_id: string | null
          grn_unit_price: number | null
          id: string
          match_type: string
          matched_amount: number
          matched_qty: number
          po_item_id: string | null
          po_unit_price: number | null
          product_id: string | null
          qty_billed: number | null
          qty_ordered: number | null
          qty_received: number | null
          qty_variance: number | null
          reconciliation_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          unit_price_variance: number | null
          updated_at: string | null
        }
        Insert: {
          bill_item_id?: string | null
          bill_unit_price?: number | null
          created_at?: string | null
          grn_item_id?: string | null
          grn_unit_price?: number | null
          id?: string
          match_type: string
          matched_amount?: number
          matched_qty?: number
          po_item_id?: string | null
          po_unit_price?: number | null
          product_id?: string | null
          qty_billed?: number | null
          qty_ordered?: number | null
          qty_received?: number | null
          qty_variance?: number | null
          reconciliation_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          unit_price_variance?: number | null
          updated_at?: string | null
        }
        Update: {
          bill_item_id?: string | null
          bill_unit_price?: number | null
          created_at?: string | null
          grn_item_id?: string | null
          grn_unit_price?: number | null
          id?: string
          match_type?: string
          matched_amount?: number
          matched_qty?: number
          po_item_id?: string | null
          po_unit_price?: number | null
          product_id?: string | null
          qty_billed?: number | null
          qty_ordered?: number | null
          qty_received?: number | null
          qty_variance?: number | null
          reconciliation_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          unit_price_variance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reconciliation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reconciliation_lines_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_lines_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "reconciliations_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          adjusted_amount: number | null
          adjustment_reason: string | null
          bill_amount: number | null
          bill_grn_variance: number | null
          bill_po_variance: number | null
          created_at: string | null
          created_by: string | null
          discrepancy_notes: string | null
          discrepancy_type: string | null
          grn_amount: number | null
          id: string
          material_receipt_id: string | null
          notes: string | null
          po_amount: number | null
          po_grn_variance: number | null
          purchase_bill_id: string | null
          purchase_order_id: string | null
          reconciliation_number: string | null
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["reconciliation_status"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          adjusted_amount?: number | null
          adjustment_reason?: string | null
          bill_amount?: number | null
          bill_grn_variance?: number | null
          bill_po_variance?: number | null
          created_at?: string | null
          created_by?: string | null
          discrepancy_notes?: string | null
          discrepancy_type?: string | null
          grn_amount?: number | null
          id?: string
          material_receipt_id?: string | null
          notes?: string | null
          po_amount?: number | null
          po_grn_variance?: number | null
          purchase_bill_id?: string | null
          purchase_order_id?: string | null
          reconciliation_number?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          adjusted_amount?: number | null
          adjustment_reason?: string | null
          bill_amount?: number | null
          bill_grn_variance?: number | null
          bill_po_variance?: number | null
          created_at?: string | null
          created_by?: string | null
          discrepancy_notes?: string | null
          discrepancy_type?: string | null
          grn_amount?: number | null
          id?: string
          material_receipt_id?: string | null
          notes?: string | null
          po_amount?: number | null
          po_grn_variance?: number | null
          purchase_bill_id?: string | null
          purchase_order_id?: string | null
          reconciliation_number?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_bill_id_fkey"
            columns: ["purchase_bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_bill_id_fkey"
            columns: ["purchase_bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      reorder_rules: {
        Row: {
          auto_reorder: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          max_stock_level: number | null
          preferred_supplier_id: string | null
          product_id: string
          reorder_level: number
          reorder_quantity: number
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          auto_reorder?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          max_stock_level?: number | null
          preferred_supplier_id?: string | null
          product_id: string
          reorder_level: number
          reorder_quantity: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          auto_reorder?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          max_stock_level?: number | null
          preferred_supplier_id?: string | null
          product_id?: string
          reorder_level?: number
          reorder_quantity?: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reorder_rules_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "reorder_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reorder_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reorder_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "reorder_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          request_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          request_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          request_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          buyer_id: string
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          indent_id: string | null
          location_id: string | null
          preferred_delivery_date: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_number: string | null
          status: Database["public"]["Enums"]["request_status"]
          supplier_id: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          buyer_id: string
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          indent_id?: string | null
          location_id?: string | null
          preferred_delivery_date?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          supplier_id?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          buyer_id?: string
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          indent_id?: string | null
          location_id?: string | null
          preferred_delivery_date?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          supplier_id?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      residents: {
        Row: {
          alternate_phone: string | null
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          flat_id: string
          full_name: string
          id: string
          is_active: boolean | null
          is_primary_contact: boolean | null
          move_in_date: string | null
          move_out_date: string | null
          phone: string | null
          relation: string | null
          resident_code: string
        }
        Insert: {
          alternate_phone?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          flat_id: string
          full_name: string
          id?: string
          is_active?: boolean | null
          is_primary_contact?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          phone?: string | null
          relation?: string | null
          resident_code: string
        }
        Update: {
          alternate_phone?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          flat_id?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_primary_contact?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          phone?: string | null
          relation?: string | null
          resident_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role_display_name: string
          role_name: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role_display_name: string
          role_name: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role_display_name?: string
          role_name?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      safety_equipment: {
        Row: {
          created_at: string | null
          equipment_name: string
          expiry_date: string | null
          id: string
          location: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_name: string
          expiry_date?: string | null
          id?: string
          location?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_name?: string
          expiry_date?: string | null
          id?: string
          location?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_components: {
        Row: {
          abbr: string
          created_at: string | null
          created_by: string | null
          default_amount: number | null
          depends_on_payment_days: boolean | null
          description: string | null
          formula: string | null
          id: string
          is_active: boolean | null
          is_tax_applicable: boolean | null
          name: string
          sort_order: number | null
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          abbr: string
          created_at?: string | null
          created_by?: string | null
          default_amount?: number | null
          depends_on_payment_days?: boolean | null
          description?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean | null
          is_tax_applicable?: boolean | null
          name: string
          sort_order?: number | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          abbr?: string
          created_at?: string | null
          created_by?: string | null
          default_amount?: number | null
          depends_on_payment_days?: boolean | null
          description?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean | null
          is_tax_applicable?: boolean | null
          name?: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sale_bill_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          id: string
          item_description: string | null
          line_total: number | null
          notes: string | null
          product_id: string | null
          quantity: number | null
          sale_bill_id: string
          service_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          item_description?: string | null
          line_total?: number | null
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_bill_id: string
          service_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          item_description?: string | null
          line_total?: number | null
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_bill_id?: string
          service_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_bill_items_sale_bill_id_fkey"
            columns: ["sale_bill_id"]
            isOneToOne: false
            referencedRelation: "sale_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_bill_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_bills: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          client_id: string
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          due_amount: number | null
          due_date: string | null
          external_id: string | null
          failure_reason: string | null
          gateway_log: Json | null
          id: string
          invoice_date: string
          invoice_number: string | null
          last_payment_date: string | null
          notes: string | null
          paid_amount: number | null
          payment_status: string
          status: string
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          client_id: string
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_amount?: number | null
          due_date?: string | null
          external_id?: string | null
          failure_reason?: string | null
          gateway_log?: Json | null
          id?: string
          invoice_date: string
          invoice_number?: string | null
          last_payment_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          client_id?: string
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_amount?: number | null
          due_date?: string | null
          external_id?: string | null
          failure_reason?: string | null
          gateway_log?: Json | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          last_payment_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_bills_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_bills_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_product_rates: {
        Row: {
          created_at: string | null
          effective_from: string
          id: string
          is_active: boolean | null
          product_id: string | null
          rate: number
        }
        Insert: {
          created_at?: string | null
          effective_from: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          rate: number
        }
        Update: {
          created_at?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_product_rates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_product_rates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_product_rates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
        ]
      }
      security_guards: {
        Row: {
          assigned_location_id: string | null
          created_at: string | null
          employee_id: string
          grade: Database["public"]["Enums"]["guard_grade"]
          guard_code: string
          id: string
          is_active: boolean | null
          is_armed: boolean | null
          license_expiry: string | null
          license_number: string | null
          shift_timing: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_location_id?: string | null
          created_at?: string | null
          employee_id: string
          grade: Database["public"]["Enums"]["guard_grade"]
          guard_code: string
          id?: string
          is_active?: boolean | null
          is_armed?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          shift_timing?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_location_id?: string | null
          created_at?: string | null
          employee_id?: string
          grade?: Database["public"]["Enums"]["guard_grade"]
          guard_code?: string
          id?: string
          is_active?: boolean | null
          is_armed?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          shift_timing?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_guards_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_guards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      service_feedback: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          photo_url: string | null
          resident_id: string | null
          score: number | null
          service_request_id: string | null
          society_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          photo_url?: string | null
          resident_id?: string | null
          score?: number | null
          service_request_id?: string | null
          society_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          photo_url?: string | null
          resident_id?: string | null
          score?: number | null
          service_request_id?: string | null
          society_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_feedback_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "resident_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_feedback_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_feedback_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_feedback_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_feedback_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          after_photo_url: string | null
          asset_id: string | null
          assigned_at: string | null
          assigned_to: string | null
          before_photo_url: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_signature_url: string | null
          created_at: string | null
          created_by: string | null
          description: string
          estimated_duration_minutes: number | null
          id: string
          location_id: string | null
          maintenance_schedule_id: string | null
          priority: Database["public"]["Enums"]["service_priority"] | null
          request_number: string
          requester_id: string | null
          requester_phone: string | null
          resolution_notes: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_id: string | null
          society_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["service_request_status"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          after_photo_url?: string | null
          asset_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          before_photo_url?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_signature_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          estimated_duration_minutes?: number | null
          id?: string
          location_id?: string | null
          maintenance_schedule_id?: string | null
          priority?: Database["public"]["Enums"]["service_priority"] | null
          request_number: string
          requester_id?: string | null
          requester_phone?: string | null
          resolution_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_id?: string | null
          society_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_request_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          after_photo_url?: string | null
          asset_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          before_photo_url?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_signature_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          estimated_duration_minutes?: number | null
          id?: string
          location_id?: string | null
          maintenance_schedule_id?: string | null
          priority?: Database["public"]["Enums"]["service_priority"] | null
          request_number?: string
          requester_id?: string | null
          requester_phone?: string | null
          resolution_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_id?: string | null
          society_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_request_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "due_maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          service_type: string
          task_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          service_type: string
          task_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          service_type?: string
          task_name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          service_category: string | null
          service_code: string
          service_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          service_category?: string | null
          service_code: string
          service_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          service_category?: string | null
          service_code?: string
          service_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services_wise_work: {
        Row: {
          created_at: string | null
          id: string
          service_type: string
          work_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          service_type: string
          work_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          service_type?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_wise_work_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "work_master"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_duration_minutes: number | null
          created_at: string | null
          duration_hours: number | null
          end_time: string
          grace_time_minutes: number | null
          id: string
          is_active: boolean | null
          is_night_shift: boolean | null
          shift_code: string
          shift_name: string
          start_time: string
        }
        Insert: {
          break_duration_minutes?: number | null
          created_at?: string | null
          duration_hours?: number | null
          end_time: string
          grace_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_night_shift?: boolean | null
          shift_code: string
          shift_name: string
          start_time: string
        }
        Update: {
          break_duration_minutes?: number | null
          created_at?: string | null
          duration_hours?: number | null
          end_time?: string
          grace_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_night_shift?: boolean | null
          shift_code?: string
          shift_name?: string
          start_time?: string
        }
        Relationships: []
      }
      societies: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          pincode: string | null
          society_code: string
          society_manager_id: string | null
          society_name: string
          state: string | null
          total_buildings: number | null
          total_flats: number | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pincode?: string | null
          society_code: string
          society_manager_id?: string | null
          society_name: string
          state?: string | null
          total_buildings?: number | null
          total_flats?: number | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pincode?: string | null
          society_code?: string
          society_manager_id?: string | null
          society_name?: string
          state?: string | null
          total_buildings?: number | null
          total_flats?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_societies_manager"
            columns: ["society_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          current_quantity: number
          expiry_date: string | null
          id: string
          initial_quantity: number
          manufacturing_date: string | null
          product_id: string
          status: string | null
          unit_cost: number | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          current_quantity: number
          expiry_date?: string | null
          id?: string
          initial_quantity: number
          manufacturing_date?: string | null
          product_id: string
          status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          initial_quantity?: number
          manufacturing_date?: string | null
          product_id?: string
          status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string | null
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_number: string
          transaction_type: string
          unit_of_measurement: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_date: string
          transaction_number: string
          transaction_type: string
          unit_of_measurement: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
          unit_of_measurement?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
        ]
      }
      storage_deletion_queue: {
        Row: {
          bucket_id: string
          file_path: string
          id: string
          metadata: Json | null
          processed_at: string | null
          scheduled_at: string | null
        }
        Insert: {
          bucket_id: string
          file_path: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          scheduled_at?: string | null
        }
        Update: {
          bucket_id?: string
          file_path?: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          scheduled_at?: string | null
        }
        Relationships: []
      }
      supplier_products: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          supplier_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_rates: {
        Row: {
          created_at: string | null
          effective_from: string
          id: string
          is_active: boolean | null
          rate: number
          supplier_product_id: string | null
        }
        Insert: {
          created_at?: string | null
          effective_from: string
          id?: string
          is_active?: boolean | null
          rate: number
          supplier_product_id?: string | null
        }
        Update: {
          created_at?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          supplier_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rates_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          supplier_name: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          supplier_name: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          supplier_name?: string
        }
        Relationships: []
      }
      technician_profiles: {
        Row: {
          certifications: string[] | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          is_active: boolean | null
          skills: string[] | null
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          skills?: string[] | null
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          certifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          skills?: string[] | null
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          phone: string | null
          preferences: Json | null
          role_id: string
          supplier_id: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          preferences?: Json | null
          role_id: string
          supplier_id?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          preferences?: Json | null
          role_id?: string
          supplier_id?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      vendor_wise_services: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          service_type: string
          supplier_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_type: string
          supplier_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_type?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_wise_services_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_wise_services_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      visitors: {
        Row: {
          approved_by_resident: boolean | null
          bypass_reason: string | null
          created_at: string | null
          entry_guard_id: string | null
          entry_location_id: string | null
          entry_time: string | null
          exit_guard_id: string | null
          exit_time: string | null
          flat_id: string | null
          id: string
          is_frequent_visitor: boolean | null
          phone: string | null
          photo_url: string | null
          purpose: string | null
          rejection_reason: string | null
          resident_id: string | null
          vehicle_number: string | null
          visitor_name: string
          visitor_pass_number: string | null
          visitor_type: string | null
        }
        Insert: {
          approved_by_resident?: boolean | null
          bypass_reason?: string | null
          created_at?: string | null
          entry_guard_id?: string | null
          entry_location_id?: string | null
          entry_time?: string | null
          exit_guard_id?: string | null
          exit_time?: string | null
          flat_id?: string | null
          id?: string
          is_frequent_visitor?: boolean | null
          phone?: string | null
          photo_url?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          resident_id?: string | null
          vehicle_number?: string | null
          visitor_name: string
          visitor_pass_number?: string | null
          visitor_type?: string | null
        }
        Update: {
          approved_by_resident?: boolean | null
          bypass_reason?: string | null
          created_at?: string | null
          entry_guard_id?: string | null
          entry_location_id?: string | null
          entry_time?: string | null
          exit_guard_id?: string | null
          exit_time?: string | null
          flat_id?: string | null
          id?: string
          is_frequent_visitor?: boolean | null
          phone?: string | null
          photo_url?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          resident_id?: string | null
          vehicle_number?: string | null
          visitor_name?: string
          visitor_pass_number?: string | null
          visitor_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_entry_guard_id_fkey"
            columns: ["entry_guard_id"]
            isOneToOne: false
            referencedRelation: "security_guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_entry_location_id_fkey"
            columns: ["entry_location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_exit_guard_id_fkey"
            columns: ["exit_guard_id"]
            isOneToOne: false
            referencedRelation: "security_guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "resident_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          manager_id: string | null
          phone: string | null
          society_id: string | null
          updated_at: string | null
          warehouse_code: string
          warehouse_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          manager_id?: string | null
          phone?: string | null
          society_id?: string | null
          updated_at?: string | null
          warehouse_code: string
          warehouse_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          manager_id?: string | null
          phone?: string | null
          society_id?: string | null
          updated_at?: string | null
          warehouse_code?: string
          warehouse_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      work_master: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          work_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          work_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          work_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      assets_with_details: {
        Row: {
          asset_code: string | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expected_life_years: number | null
          id: string | null
          location_code: string | null
          location_id: string | null
          location_name: string | null
          manufacturer: string | null
          model_number: string | null
          name: string | null
          purchase_cost: number | null
          purchase_date: string | null
          qr_id: string | null
          serial_number: string | null
          society_id: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["asset_status"] | null
          updated_at: string | null
          updated_by: string | null
          vendor_id: string | null
          vendor_name: string | null
          warranty_expiry: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      candidate_interviews_with_details: {
        Row: {
          applied_position: string | null
          cancellation_reason: string | null
          candidate_code: string | null
          candidate_id: string | null
          candidate_name: string | null
          candidate_status:
            | Database["public"]["Enums"]["candidate_status"]
            | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duration_minutes: number | null
          feedback: string | null
          id: string | null
          interview_type: string | null
          interviewer_email: string | null
          interviewer_id: string | null
          interviewer_name: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          panel_members: Json | null
          rating: number | null
          recommendation: string | null
          round_number: number | null
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates_with_details: {
        Row: {
          address: string | null
          applied_position: string | null
          bgv_completed_at: string | null
          bgv_initiated_at: string | null
          bgv_notes: string | null
          bgv_status: string | null
          candidate_code: string | null
          city: string | null
          converted_at: string | null
          converted_employee_code: string | null
          converted_employee_id: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          department: string | null
          designation_id: string | null
          designation_name: string | null
          email: string | null
          expected_salary: number | null
          first_name: string | null
          id: string | null
          interview_date: string | null
          interview_notes: string | null
          interview_rating: number | null
          interviewer_id: string | null
          interviewer_name: string | null
          joining_date: string | null
          last_name: string | null
          notes: string | null
          notice_period_days: number | null
          offer_accepted_at: string | null
          offer_date: string | null
          offered_salary: number | null
          phone: string | null
          pincode: string | null
          referred_by: string | null
          referred_by_name: string | null
          rejection_reason: string | null
          resume_url: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["candidate_status"] | null
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_converted_employee_id_fkey"
            columns: ["converted_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      due_maintenance_schedules: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          assigned_to_employee: string | null
          assigned_to_role: string | null
          created_at: string | null
          created_by: string | null
          custom_interval_days: number | null
          frequency: Database["public"]["Enums"]["maintenance_frequency"] | null
          id: string | null
          is_active: boolean | null
          last_performed_date: string | null
          location_id: string | null
          location_name: string | null
          next_due_date: string | null
          reminder_days_before: number | null
          task_description: string | null
          task_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_assigned_to_employee_fkey"
            columns: ["assigned_to_employee"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_assigned_to_role_fkey"
            columns: ["assigned_to_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents_with_details: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          document_code: string | null
          document_name: string | null
          document_number: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          employee_code: string | null
          employee_id: string | null
          employee_name: string | null
          expiry_date: string | null
          expiry_notified_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string | null
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
          verified_by_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_structure_with_details: {
        Row: {
          amount: number | null
          component_abbr: string | null
          component_formula: string | null
          component_id: string | null
          component_name: string | null
          component_type: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          depends_on_payment_days: boolean | null
          effective_from: string | null
          effective_to: string | null
          employee_code: string | null
          employee_id: string | null
          employee_name: string | null
          id: string | null
          notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_structure_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_structure_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      expiry_tracking: {
        Row: {
          category: string | null
          expiry_date: string | null
          item_id: string | null
          item_name: string | null
          item_type: string | null
        }
        Relationships: []
      }
      indents_with_details: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_notes: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          id: string | null
          indent_number: string | null
          item_count: number | null
          linked_po_id: string | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          po_created_at: string | null
          priority: string | null
          purpose: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requester_code: string | null
          requester_id: string | null
          requester_name: string | null
          required_date: string | null
          society_id: string | null
          society_name: string | null
          status: Database["public"]["Enums"]["indent_status"] | null
          submitted_at: string | null
          submitted_by: string | null
          title: string | null
          total_estimated_value: number | null
          total_items: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indents_linked_po_fk"
            columns: ["linked_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_linked_po_fk"
            columns: ["linked_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indents_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      material_receipts_with_details: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_challan_number: string | null
          grn_number: string | null
          id: string | null
          item_count: number | null
          notes: string | null
          po_number: string | null
          purchase_order_id: string | null
          quality_checked_at: string | null
          quality_checked_by: string | null
          received_by: string | null
          received_by_name: string | null
          received_date: string | null
          status: Database["public"]["Enums"]["grn_status"] | null
          supplier_id: string | null
          supplier_name: string | null
          total_received_value: number | null
          updated_at: string | null
          updated_by: string | null
          vehicle_number: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_quality_checked_by_fkey"
            columns: ["quality_checked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "material_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "material_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips_with_details: {
        Row: {
          absent_days: number | null
          advance_recovery: number | null
          bank_account_number: string | null
          bank_ifsc: string | null
          basic_salary: number | null
          bonus: number | null
          created_at: string | null
          created_by: string | null
          cycle_code: string | null
          department: string | null
          employee_code: string | null
          employee_id: string | null
          employee_name: string | null
          employer_esic: number | null
          employer_pf: number | null
          esic_deduction: number | null
          gross_salary: number | null
          hra: number | null
          id: string | null
          leave_days: number | null
          loan_recovery: number | null
          medical_allowance: number | null
          net_payable: number | null
          notes: string | null
          other_deductions: number | null
          other_earnings: number | null
          overtime_amount: number | null
          overtime_hours: number | null
          paid_at: string | null
          payment_mode: string | null
          payment_reference: string | null
          payroll_cycle_id: string | null
          payslip_number: string | null
          period_month: number | null
          period_year: number | null
          pf_deduction: number | null
          present_days: number | null
          pro_rated_basic: number | null
          professional_tax: number | null
          special_allowance: number | null
          status: Database["public"]["Enums"]["payslip_status"] | null
          tds: number | null
          total_deductions: number | null
          total_working_days: number | null
          travel_allowance: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_cycle_id_fkey"
            columns: ["payroll_cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bills_with_details: {
        Row: {
          bill_date: string | null
          bill_number: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          due_amount: number | null
          due_date: string | null
          grn_number: string | null
          id: string | null
          last_payment_date: string | null
          material_receipt_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_status: string | null
          po_number: string | null
          purchase_order_id: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          supplier_invoice_number: string | null
          supplier_name: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bills_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      purchase_orders_with_details: {
        Row: {
          billing_address: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          expected_delivery_date: string | null
          grand_total: number | null
          id: string | null
          indent_id: string | null
          indent_number: string | null
          item_count: number | null
          notes: string | null
          payment_terms: string | null
          po_date: string | null
          po_number: string | null
          sent_to_vendor_at: string | null
          shipping_address: string | null
          shipping_cost: number | null
          status: Database["public"]["Enums"]["po_status"] | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          tax_amount: number | null
          terms_and_conditions: string | null
          updated_at: string | null
          updated_by: string | null
          vendor_acknowledged_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      qr_codes_with_batch_info: {
        Row: {
          asset_id: string | null
          batch_count: number | null
          batch_generated_at: string | null
          batch_generated_by: string | null
          batch_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          created_by: string | null
          generated_by_name: string | null
          id: string | null
          is_active: boolean | null
          is_linked: boolean | null
          linked_asset_name: string | null
          linked_asset_tag: string | null
          print_batch_id: string | null
          sequence_number: number | null
          society_id: string | null
          version: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_batch_logs_generated_by_fkey"
            columns: ["batch_generated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "qr_codes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_lines_with_details: {
        Row: {
          bill_item_id: string | null
          bill_unit_price: number | null
          created_at: string | null
          grn_item_id: string | null
          grn_unit_price: number | null
          id: string | null
          match_type: string | null
          matched_amount: number | null
          matched_qty: number | null
          po_item_id: string | null
          po_unit_price: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          qty_billed: number | null
          qty_ordered: number | null
          qty_received: number | null
          qty_variance: number | null
          reconciliation_id: string | null
          reconciliation_number: string | null
          reconciliation_status:
            | Database["public"]["Enums"]["reconciliation_status"]
            | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          unit_price_variance: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reconciliation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_inventory_velocity"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reconciliation_lines_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_lines_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "reconciliations_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations_with_details: {
        Row: {
          adjusted_amount: number | null
          adjustment_reason: string | null
          bill_amount: number | null
          bill_date: string | null
          bill_grn_variance: number | null
          bill_number: string | null
          bill_po_variance: number | null
          created_at: string | null
          created_by: string | null
          discrepancy_notes: string | null
          discrepancy_type: string | null
          grn_amount: number | null
          grn_number: string | null
          id: string | null
          material_receipt_id: string | null
          notes: string | null
          po_amount: number | null
          po_date: string | null
          po_grn_variance: number | null
          po_number: string | null
          purchase_bill_id: string | null
          purchase_order_id: string | null
          received_date: string | null
          reconciliation_number: string | null
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["reconciliation_status"] | null
          supplier_name: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_material_receipt_id_fkey"
            columns: ["material_receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_bill_id_fkey"
            columns: ["purchase_bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_bill_id_fkey"
            columns: ["purchase_bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_directory: {
        Row: {
          building_name: string | null
          flat_number: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          is_primary_contact: boolean | null
          masked_email: string | null
          masked_phone: string | null
        }
        Relationships: []
      }
      service_requests_with_details: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          assigned_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string | null
          location_id: string | null
          location_name: string | null
          maintenance_schedule_id: string | null
          priority: Database["public"]["Enums"]["service_priority"] | null
          request_number: string | null
          requester_id: string | null
          requester_phone: string | null
          resolution_notes: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_id: string | null
          service_name: string | null
          society_id: string | null
          status: Database["public"]["Enums"]["service_request_status"] | null
          technician_name: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "due_maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          needs_reorder: boolean | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          reorder_level: number | null
          total_quantity: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: []
      }
      vendor_scorecards: {
        Row: {
          average_rating: number | null
          critical_feedbacks: number | null
          performance_status: string | null
          service_type: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_feedbacks: number | null
        }
        Relationships: []
      }
      view_attendance_by_dept: {
        Row: {
          attendance_rate: number | null
          avg_late_minutes: number | null
          department: string | null
          total_absent: number | null
          total_present: number | null
        }
        Relationships: []
      }
      view_financial_kpis: {
        Row: {
          total_billing_ytd: number | null
          total_collected_ytd: number | null
          total_outstanding: number | null
        }
        Relationships: []
      }
      view_financial_monthly_trends: {
        Row: {
          expense: number | null
          month: string | null
          net_margin: number | null
          revenue: number | null
        }
        Relationships: []
      }
      view_financial_revenue_by_category: {
        Row: {
          category: string | null
          revenue: number | null
        }
        Relationships: []
      }
      view_inventory_velocity: {
        Row: {
          category: string | null
          consumption_rate: number | null
          days_to_stockout: number | null
          item_name: string | null
          product_id: string | null
          stock_level: number | null
        }
        Relationships: []
      }
      view_service_performance: {
        Row: {
          avg_rating: number | null
          avg_response: number | null
          resolution_rate: number | null
          service_category: string | null
          total_breaches: number | null
          total_jobs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_visitor: {
        Args: { p_user_id: string; p_visitor_id: string }
        Returns: Json
      }
      auto_exit_stale_visitors: { Args: never; Returns: undefined }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_employee_salary: {
        Args: {
          p_employee_id: string
          p_period_end: string
          p_period_start: string
          p_total_working_days: number
        }
        Returns: Json
      }
      check_compliance: { Args: never; Returns: undefined }
      check_geofence: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_meters: number
          p_site_lat: number
          p_site_lng: number
        }
        Returns: boolean
      }
      checkout_visitor: {
        Args: { p_user_id: string; p_visitor_id: string }
        Returns: Json
      }
      complete_service_task: {
        Args: {
          p_after_photo_url: string
          p_completion_notes?: string
          p_request_id: string
          p_signature_url?: string
        }
        Returns: boolean
      }
      deny_visitor: {
        Args: { p_reason: string; p_user_id: string; p_visitor_id: string }
        Returns: Json
      }
      detect_expiring_items: {
        Args: { p_days_ahead?: number }
        Returns: {
          days_left: number
          item_id: string
          item_name: string
          item_type: string
          severity: string
        }[]
      }
      detect_geofence_breaches: { Args: never; Returns: undefined }
      detect_inactive_guards: {
        Args: { p_threshold_minutes?: number }
        Returns: {
          alert_created: boolean
          error_message: string
          guard_id: string
          guard_name: string
          minutes_inactive: number
        }[]
      }
      detect_incomplete_checklists:
        | {
            Args: never
            Returns: {
              out_alert_created: boolean
              out_employee_id: string
            }[]
          }
        | {
            Args: {
              p_completion_threshold?: number
              p_only_past_midpoint?: boolean
            }
            Returns: {
              alert_created: boolean
              completed_items: number
              completion_percentage: number
              error_message: string
              guard_id: string
              guard_name: string
              minutes_remaining: number
              shift_name: string
              total_items: number
            }[]
          }
      detect_stationary_guards: { Args: never; Returns: undefined }
      execute_reconciliation_match: {
        Args: { p_reconciliation_id: string; p_user_id: string }
        Returns: Json
      }
      force_match_bill: {
        Args: { p_bill_id: string; p_evidence_url?: string; p_reason: string }
        Returns: boolean
      }
      generate_daily_compliance_snapshot: { Args: never; Returns: Json }
      generate_payroll_cycle: {
        Args: { p_cycle_id: string; p_user_id: string }
        Returns: Json
      }
      get_clocked_in_guards: {
        Args: never
        Returns: {
          employee_id: string
          first_name: string
          guard_code: string
          guard_id: string
          last_name: string
          location_id: string
          shift_id: string
        }[]
      }
      get_employee_id: { Args: never; Returns: string }
      get_guard_checklist_completion: {
        Args: { p_checklist_date: string; p_guard_id: string }
        Returns: {
          completed_items: number
          completion_percentage: number
          last_updated: string
          pending_items: Json
          total_items: number
        }[]
      }
      get_guard_id: { Args: never; Returns: string }
      get_guard_last_position: {
        Args: { p_guard_id: string }
        Returns: {
          latitude: number
          longitude: number
          minutes_ago: number
          tracked_at: string
        }[]
      }
      get_guard_movement_variance: {
        Args: { p_duration_minutes?: number; p_guard_id: string }
        Returns: number
      }
      get_qr_batch_statistics: {
        Args: { p_society_id: string }
        Returns: {
          latest_batch_date: string
          linked_qr_codes: number
          total_batches: number
          total_qr_codes: number
          unlinked_qr_codes: number
        }[]
      }
      get_resident_id: { Args: never; Returns: string }
      get_shift_checklist_items: {
        Args: { p_shift_id: string }
        Returns: {
          category: string
          item_id: string
          priority: number
          requires_photo: boolean
          requires_signature: boolean
          task_name: string
        }[]
      }
      get_shift_time_info: {
        Args: { p_shift_id: string }
        Returns: {
          end_time: string
          is_past_midpoint: boolean
          midpoint: string
          minutes_remaining: number
          shift_name: string
          start_time: string
        }[]
      }
      get_unlinked_qr_codes: {
        Args: { p_limit?: number; p_society_id: string }
        Returns: {
          batch_id: string
          created_at: string
          id: string
          sequence_number: number
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_active_checklist_alert: {
        Args: { p_date: string; p_guard_id: string }
        Returns: boolean
      }
      has_active_inactivity_alert: {
        Args: { p_guard_id: string }
        Returns: boolean
      }
      has_role: { Args: { required_role: string }; Returns: boolean }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_employee: { Args: never; Returns: boolean }
      is_financial_manager: { Args: never; Returns: boolean }
      is_guard: { Args: never; Returns: boolean }
      is_period_closed: { Args: { p_date: string }; Returns: boolean }
      is_resident: { Args: never; Returns: boolean }
      log_gate_entry:
        | {
            Args: {
              p_photo_url: string
              p_po_id: string
              p_signature_url?: string
              p_vehicle_number?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_driver_name?: string
              p_photo_url: string
              p_po_id: string
              p_signature_url?: string
              p_vehicle_number?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_gate_location?: string
              p_notes?: string
              p_photo_url: string
              p_po_id: string
              p_signature_url?: string
              p_vehicle_number?: string
            }
            Returns: string
          }
      log_material_arrival: {
        Args: {
          p_arrival_photo_url: string
          p_arrival_signature_url?: string
          p_gate_location?: string
          p_notes?: string
          p_po_id: string
          p_vehicle_number: string
        }
        Returns: string
      }
      proc_check_login_blocked: {
        Args: { p_ip: unknown }
        Returns: {
          blocked_until_time: string
          is_blocked: boolean
        }[]
      }
      proc_enqueue_old_photos: { Args: never; Returns: number }
      proc_handle_login_attempt: {
        Args: { p_ip: unknown; p_is_failure?: boolean }
        Returns: {
          blocked_until_time: string
          is_blocked: boolean
          remaining_attempts: number
        }[]
      }
      process_overdue_alerts: { Args: never; Returns: undefined }
      search_residents: {
        Args: { p_query: string; p_society_id?: string }
        Returns: {
          flat_number: string
          full_name: string
          id: string
          is_owner: boolean
          masked_phone: string
          move_in_date: string
          profile_photo_url: string
        }[]
      }
      start_service_task: {
        Args: { p_before_photo_url?: string; p_request_id: string }
        Returns: boolean
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      transition_po_status: {
        Args: { p_new_status: string; p_po_id: string; p_user_id: string }
        Returns: Json
      }
      trigger_checklist_check: { Args: never; Returns: undefined }
      trigger_inactivity_check: { Args: never; Returns: undefined }
      update_po_receipt_status: {
        Args: { p_po_id: string; p_user_id: string }
        Returns: Json
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_bill_for_payout: {
        Args: { p_bill_id: string }
        Returns: {
          bill_total: number
          grn_total: number
          is_valid: boolean
          match_status: string
          message: string
          po_total: number
        }[]
      }
    }
    Enums: {
      alert_type:
        | "panic"
        | "inactivity"
        | "geo_fence_breach"
        | "checklist_incomplete"
        | "routine"
      asset_status:
        | "functional"
        | "under_maintenance"
        | "faulty"
        | "decommissioned"
      behavior_category:
        | "sleeping_on_duty"
        | "rudeness"
        | "absence"
        | "uniform_issue"
        | "unauthorized_entry"
        | "late_arrival"
        | "mobile_use"
        | "other"
      budget_status: "draft" | "active" | "exhausted" | "expired"
      candidate_status:
        | "screening"
        | "interviewing"
        | "background_check"
        | "offered"
        | "hired"
        | "rejected"
      document_status:
        | "pending_upload"
        | "pending_review"
        | "verified"
        | "expired"
        | "rejected"
      document_type:
        | "aadhar_card"
        | "pan_card"
        | "passport"
        | "driving_license"
        | "voter_id"
        | "bank_passbook"
        | "education_certificate"
        | "experience_certificate"
        | "offer_letter"
        | "relieving_letter"
        | "address_proof"
        | "police_verification"
        | "medical_certificate"
        | "other"
      financial_period_status: "open" | "closing" | "closed"
      financial_period_type: "monthly" | "quarterly" | "yearly"
      grn_status:
        | "draft"
        | "inspecting"
        | "accepted"
        | "partial_accepted"
        | "rejected"
      guard_grade: "A" | "B" | "C" | "D"
      indent_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "po_created"
        | "cancelled"
      job_session_status: "started" | "paused" | "completed" | "cancelled"
      leave_type_enum:
        | "sick_leave"
        | "casual_leave"
        | "paid_leave"
        | "unpaid_leave"
        | "emergency_leave"
      maintenance_frequency:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "half_yearly"
        | "yearly"
      material_condition:
        | "good"
        | "damaged"
        | "expired"
        | "leaking"
        | "defective"
      payment_gateway: "razorpay" | "stripe" | "paypal" | "manual"
      payroll_cycle_status:
        | "draft"
        | "processing"
        | "computed"
        | "approved"
        | "disbursed"
        | "cancelled"
      payslip_status:
        | "draft"
        | "computed"
        | "approved"
        | "processed"
        | "disputed"
      po_status:
        | "draft"
        | "sent_to_vendor"
        | "acknowledged"
        | "partial_received"
        | "received"
        | "cancelled"
        | "dispatched"
      reconciliation_status:
        | "pending"
        | "matched"
        | "discrepancy"
        | "resolved"
        | "disputed"
      request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "indent_generated"
        | "indent_forwarded"
        | "indent_accepted"
        | "indent_rejected"
        | "po_issued"
        | "po_received"
        | "po_dispatched"
        | "material_received"
        | "material_acknowledged"
        | "bill_generated"
        | "paid"
        | "feedback_pending"
        | "completed"
      service_category:
        | "security_services"
        | "ac_services"
        | "plantation_services"
        | "printing_advertising"
        | "pest_control"
        | "housekeeping"
        | "pantry_services"
        | "general_maintenance"
      service_priority: "low" | "normal" | "high" | "urgent"
      service_request_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
      ticket_type: "quality_check" | "quantity_check" | "material_return"
      user_role:
        | "admin"
        | "company_md"
        | "company_hod"
        | "account"
        | "delivery_boy"
        | "buyer"
        | "supplier"
        | "vendor"
        | "security_guard"
        | "security_supervisor"
        | "society_manager"
        | "service_boy"
        | "resident"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_type: [
        "panic",
        "inactivity",
        "geo_fence_breach",
        "checklist_incomplete",
        "routine",
      ],
      asset_status: [
        "functional",
        "under_maintenance",
        "faulty",
        "decommissioned",
      ],
      behavior_category: [
        "sleeping_on_duty",
        "rudeness",
        "absence",
        "uniform_issue",
        "unauthorized_entry",
        "late_arrival",
        "mobile_use",
        "other",
      ],
      budget_status: ["draft", "active", "exhausted", "expired"],
      candidate_status: [
        "screening",
        "interviewing",
        "background_check",
        "offered",
        "hired",
        "rejected",
      ],
      document_status: [
        "pending_upload",
        "pending_review",
        "verified",
        "expired",
        "rejected",
      ],
      document_type: [
        "aadhar_card",
        "pan_card",
        "passport",
        "driving_license",
        "voter_id",
        "bank_passbook",
        "education_certificate",
        "experience_certificate",
        "offer_letter",
        "relieving_letter",
        "address_proof",
        "police_verification",
        "medical_certificate",
        "other",
      ],
      financial_period_status: ["open", "closing", "closed"],
      financial_period_type: ["monthly", "quarterly", "yearly"],
      grn_status: [
        "draft",
        "inspecting",
        "accepted",
        "partial_accepted",
        "rejected",
      ],
      guard_grade: ["A", "B", "C", "D"],
      indent_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "po_created",
        "cancelled",
      ],
      job_session_status: ["started", "paused", "completed", "cancelled"],
      leave_type_enum: [
        "sick_leave",
        "casual_leave",
        "paid_leave",
        "unpaid_leave",
        "emergency_leave",
      ],
      maintenance_frequency: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "half_yearly",
        "yearly",
      ],
      material_condition: [
        "good",
        "damaged",
        "expired",
        "leaking",
        "defective",
      ],
      payment_gateway: ["razorpay", "stripe", "paypal", "manual"],
      payroll_cycle_status: [
        "draft",
        "processing",
        "computed",
        "approved",
        "disbursed",
        "cancelled",
      ],
      payslip_status: [
        "draft",
        "computed",
        "approved",
        "processed",
        "disputed",
      ],
      po_status: [
        "draft",
        "sent_to_vendor",
        "acknowledged",
        "partial_received",
        "received",
        "cancelled",
        "dispatched",
      ],
      reconciliation_status: [
        "pending",
        "matched",
        "discrepancy",
        "resolved",
        "disputed",
      ],
      request_status: [
        "pending",
        "accepted",
        "rejected",
        "indent_generated",
        "indent_forwarded",
        "indent_accepted",
        "indent_rejected",
        "po_issued",
        "po_received",
        "po_dispatched",
        "material_received",
        "material_acknowledged",
        "bill_generated",
        "paid",
        "feedback_pending",
        "completed",
      ],
      service_category: [
        "security_services",
        "ac_services",
        "plantation_services",
        "printing_advertising",
        "pest_control",
        "housekeeping",
        "pantry_services",
        "general_maintenance",
      ],
      service_priority: ["low", "normal", "high", "urgent"],
      service_request_status: [
        "open",
        "assigned",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
      ticket_type: ["quality_check", "quantity_check", "material_return"],
      user_role: [
        "admin",
        "company_md",
        "company_hod",
        "account",
        "delivery_boy",
        "buyer",
        "supplier",
        "vendor",
        "security_guard",
        "security_supervisor",
        "society_manager",
        "service_boy",
        "resident",
      ],
    },
  },
} as const
