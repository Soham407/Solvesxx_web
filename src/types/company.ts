import { Database } from './supabase';

export type Designation = Database['public']['Tables']['designations']['Row'] & {
  level?: 'junior' | 'senior' | 'lead' | 'head' | null;
};

export type DesignationInsert = Database['public']['Tables']['designations']['Insert'] & {
  level?: 'junior' | 'senior' | 'lead' | 'head' | null;
};

export type DesignationUpdate = Database['public']['Tables']['designations']['Update'] & {
  level?: 'junior' | 'senior' | 'lead' | 'head' | null;
};

export interface CreateDesignationForm {
  designation_name: string;
  designation_code: string;
  department?: string;
  level: 'junior' | 'senior' | 'lead' | 'head';
  description?: string;
  is_active?: boolean;
}
