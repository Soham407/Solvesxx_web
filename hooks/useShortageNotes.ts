// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export type ShortageNoteStatus = "open" | "acknowledged" | "resolved" | "disputed";

export interface ShortageNoteItem {
  id: string;
  shortage_note_id: string;
  product_id: string | null;
  product_name: string | null;
  ordered_quantity: number;
  received_quantity: number;
  shortage_quantity: number;
  unit: string | null;
  rate: number | null;
  shortage_value: number;
  notes: string | null;
}

export interface ShortageNote {
  id: string;
  note_number: string;
  grn_id: string | null;
  po_id: string;
  supplier_id: string;
  status: ShortageNoteStatus;
  total_shortage_value: number;
  resolution: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  po_number?: string;
  supplier_name?: string;
  items?: ShortageNoteItem[];
}

export const SHORTAGE_STATUS_CONFIG: Record<ShortageNoteStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-warning/10 text-warning border-warning/20" },
  acknowledged: { label: "Acknowledged", className: "bg-info/10 text-info border-info/20" },
  resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
};

export interface CreateShortageNoteDTO {
  po_id: string;
  supplier_id: string;
  grn_id?: string;
  items: Array<{
    product_name: string;
    ordered_quantity: number;
    received_quantity: number;
    unit?: string;
    rate?: number;
    notes?: string;
  }>;
}

export function useShortageNotes() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<ShortageNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("shortage_notes")
        .select(`
          *,
          purchase_orders!po_id (po_number),
          suppliers!supplier_id (supplier_name),
          shortage_note_items (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((n: any) => ({
        ...n,
        po_number: n.purchase_orders?.po_number,
        supplier_name: n.suppliers?.supplier_name,
        items: n.shortage_note_items || [],
      }));

      setNotes(mapped);
    } catch (err) {
      console.error("Shortage notes fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNote = async (dto: CreateShortageNoteDTO) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate total value
      const totalValue = dto.items.reduce((sum, item) => {
        const shortage = item.ordered_quantity - item.received_quantity;
        return sum + shortage * (item.rate || 0);
      }, 0);

      const { data: note, error: noteError } = await supabase
        .from("shortage_notes")
        .insert({
          po_id: dto.po_id,
          supplier_id: dto.supplier_id,
          grn_id: dto.grn_id || null,
          status: "open",
          total_shortage_value: totalValue,
          created_by: user?.id,
          note_number: "",
        })
        .select()
        .single();

      if (noteError) throw noteError;

      // Insert items
      const itemsToInsert = dto.items.map((item) => ({
        shortage_note_id: note.id,
        product_name: item.product_name,
        ordered_quantity: item.ordered_quantity,
        received_quantity: item.received_quantity,
        unit: item.unit || null,
        rate: item.rate || null,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from("shortage_note_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Shortage Note Created",
        description: `${note.note_number} raised for supplier.`,
      });
      fetchNotes();
      return { success: true, note };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create shortage note";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const resolveNote = async (noteId: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from("shortage_notes")
        .update({ status: "resolved", resolution })
        .eq("id", noteId);
      if (error) throw error;
      toast({ title: "Shortage Note Resolved", description: resolution });
      fetchNotes();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resolve";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const stats = {
    total: notes.length,
    open: notes.filter((n) => n.status === "open").length,
    totalValue: notes.reduce((sum, n) => sum + (n.total_shortage_value || 0), 0),
  };

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  return { notes, isLoading, stats, createNote, resolveNote, refresh: fetchNotes };
}
