// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface PersonnelDetail {
  name: string;
  id_proof_type: string;
  id_proof_number: string;
  qualification: string;
  contact: string;
  photo_url?: string;
}

export interface ServiceDeliveryNote {
  id: string;
  delivery_note_number: string;
  po_id: string;
  delivery_date: string;
  personnel_details: PersonnelDetail[];
  verified_by: string | null;
  verified_at: string | null;
  status: "pending" | "verified" | "rejected";
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  po_number?: string;
  supplier_name?: string;
}

export interface CreateDeliveryNoteDTO {
  po_id: string;
  delivery_date: string;
  personnel_details: PersonnelDetail[];
  remarks?: string;
}

export function useServiceDeliveryNotes(poId?: string) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<ServiceDeliveryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("service_delivery_notes")
        .select(`
          *,
          purchase_orders!po_id (
            po_number,
            suppliers:supplier_id (supplier_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (poId) {
        query = query.eq("po_id", poId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mapped = (data || []).map((row: any) => ({
        ...row,
        po_number: row.purchase_orders?.po_number,
        supplier_name: row.purchase_orders?.suppliers?.supplier_name,
      }));

      setNotes(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load delivery notes";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [poId]);

  const createNote = async (dto: CreateDeliveryNoteDTO) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: insertError } = await supabase
        .from("service_delivery_notes")
        .insert({
          po_id: dto.po_id,
          delivery_date: dto.delivery_date,
          personnel_details: dto.personnel_details,
          remarks: dto.remarks || null,
          status: "pending",
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({ title: "Delivery Note Submitted", description: "Awaiting admin verification." });
      fetchNotes();
      return { success: true, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create delivery note";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false, error: msg };
    }
  };

  const verifyNote = async (noteId: string, remarks?: string) => {
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error: updateError } = await supabase
        .from("service_delivery_notes")
        .update({
          status: "verified",
          verified_by: empData?.id,
          verified_at: new Date().toISOString(),
          remarks: remarks || null,
        })
        .eq("id", noteId);

      if (updateError) throw updateError;

      toast({ title: "Delivery Note Verified", description: "Deployment confirmed." });
      fetchNotes();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to verify note";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false, error: msg };
    }
  };

  const rejectNote = async (noteId: string, reason: string) => {
    try {
      const { error: updateError } = await supabase
        .from("service_delivery_notes")
        .update({ status: "rejected", remarks: reason })
        .eq("id", noteId);

      if (updateError) throw updateError;

      toast({ title: "Delivery Note Rejected", description: "Supplier notified.", variant: "destructive" });
      fetchNotes();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reject note";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false, error: msg };
    }
  };

  // Realtime subscription + initial fetch
  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel("delivery-notes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_delivery_notes" }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotes]);

  return { notes, isLoading, error, createNote, verifyNote, rejectNote, refresh: fetchNotes };
}
