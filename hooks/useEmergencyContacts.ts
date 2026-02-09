"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface EmergencyContact {
  id: string;
  contact_name: string;
  contact_type: string; // 'police', 'ambulance', 'fire', 'lift_support', 'other'
  phone_number: string;
  priority: number | null;
  description: string | null;
  is_active: boolean | null;
  society_id: string | null;
  created_at: string | null;
}

interface UseEmergencyContactsState {
  contacts: EmergencyContact[];
  isLoading: boolean;
  error: string | null;
}

export function useEmergencyContacts(societyId?: string) {
  const { toast } = useToast();
  const [state, setState] = useState<UseEmergencyContactsState>({
    contacts: [],
    isLoading: true,
    error: null,
  });

  const fetchContacts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from('emergency_contacts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .order('contact_name', { ascending: true });

      if (societyId) {
        // Filter by society OR global contacts (null society_id)
        // Note: OR syntax in Supabase client: .or(`society_id.eq.${societyId},society_id.is.null`)
        query = query.or(`society_id.eq.${societyId},society_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setState({
        contacts: (data || []) as EmergencyContact[],
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Error fetching emergency contacts:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to fetch contacts',
      }));
    }
  }, [societyId]);

  const addContact = async (contact: Omit<EmergencyContact, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert(contact)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        contacts: [...prev.contacts, data as EmergencyContact],
      }));

      toast({
        title: "Contact Added",
        description: `${contact.contact_name} has been added to emergency contacts.`,
      });

      return data;
    } catch (err: any) {
      console.error('Error adding contact:', err);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateContact = async (id: string, updates: Partial<EmergencyContact>) => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        contacts: prev.contacts.map(c => c.id === id ? (data as EmergencyContact) : c),
      }));

      toast({
        title: "Contact Updated",
        description: "Emergency contact details updated.",
      });

      return data;
    } catch (err: any) {
      console.error('Error updating contact:', err);
      toast({
        title: "Error",
        description: "Failed to update contact.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      // Soft delete by setting is_active = false
      const { error } = await supabase
        .from('emergency_contacts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        contacts: prev.contacts.filter(c => c.id !== id),
      }));

      toast({
        title: "Contact Removed",
        description: "Contact has been removed from the list.",
      });
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    ...state,
    fetchContacts,
    addContact,
    updateContact,
    deleteContact,
  };
}
