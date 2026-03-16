// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export type SpillKitStatus = "ok" | "needs_restock" | "expired" | "missing";

export interface SpillKitItem {
  item_name: string;
  quantity: number;
  unit: string;
  is_present: boolean;
}

export interface SpillKit {
  id: string;
  kit_code: string;
  location_id: string | null;
  items_json: SpillKitItem[];
  last_inspected_at: string | null;
  inspected_by: string | null;
  status: SpillKitStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  location_name?: string;
  inspector_name?: string;
}

export const SPILL_KIT_STATUS_CONFIG: Record<SpillKitStatus, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-success/10 text-success border-success/20" },
  needs_restock: { label: "Needs Restock", className: "bg-warning/10 text-warning border-warning/20" },
  expired: { label: "Expired", className: "bg-critical/10 text-critical border-critical/20" },
  missing: { label: "Missing", className: "bg-critical/10 text-critical border-critical/20" },
};

export function useSpillKits() {
  const { toast } = useToast();
  const [kits, setKits] = useState<SpillKit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKits = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("pest_control_spill_kits")
        .select(`
          *,
          locations!location_id (name),
          employees!inspected_by (first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((k: any) => ({
        ...k,
        location_name: k.locations?.name || "Unassigned",
        inspector_name: k.employees
          ? `${k.employees.first_name} ${k.employees.last_name}`.trim()
          : null,
      }));

      setKits(mapped);
    } catch (err) {
      console.error("Spill kit fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createKit = async (input: {
    kit_code: string;
    location_id?: string;
    items_json?: SpillKitItem[];
    notes?: string;
  }) => {
    try {
      const { error } = await supabase.from("pest_control_spill_kits").insert({
        kit_code: input.kit_code,
        location_id: input.location_id || null,
        items_json: input.items_json || [],
        notes: input.notes || null,
        status: "ok",
      });
      if (error) throw error;
      toast({ title: "Spill Kit Added", description: `Kit ${input.kit_code} registered.` });
      fetchKits();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add kit";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const recordInspection = async (
    kitId: string,
    status: SpillKitStatus,
    inspectedBy: string,
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from("pest_control_spill_kits")
        .update({
          status,
          last_inspected_at: new Date().toISOString(),
          inspected_by: inspectedBy,
          notes: notes || null,
        })
        .eq("id", kitId);
      if (error) throw error;
      toast({ title: "Inspection Recorded", description: `Kit status: ${status}.` });
      fetchKits();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record inspection";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  // Summary stats
  const stats = {
    total: kits.length,
    ok: kits.filter((k) => k.status === "ok").length,
    needsAttention: kits.filter((k) => k.status !== "ok").length,
  };

  useEffect(() => { fetchKits(); }, [fetchKits]);

  return { kits, isLoading, stats, createKit, recordInspection, refresh: fetchKits };
}
