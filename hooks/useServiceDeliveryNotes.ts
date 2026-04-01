"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const supabase = supabaseClient as any;

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
          service_purchase_order:service_purchase_orders!service_delivery_notes_po_id_fkey (
            spo_number,
            supplier:vendor_id (supplier_name)
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
        po_number: row.service_purchase_order?.spo_number,
        supplier_name: row.service_purchase_order?.supplier?.supplier_name,
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

      const { data: transitionResult, error: transitionError } = await supabase.rpc(
        "supplier_transition_service_po_status",
        {
          p_spo_id: dto.po_id,
          p_new_status: "delivery_note_uploaded",
        }
      );

      if (transitionError) throw transitionError;

      const rpcResult = transitionResult as any;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || "Failed to advance service order after delivery note upload");
      }

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
