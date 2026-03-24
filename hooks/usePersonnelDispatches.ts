// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export type DispatchStatus = "dispatched" | "confirmed" | "active" | "withdrawn";

export interface PersonnelMember {
  name: string;
  id_proof_type: string;
  id_proof_number: string;
  qualification: string;
  contact: string;
}

export interface PersonnelDispatch {
  id: string;
  dispatch_number: string;
  service_po_id: string;
  supplier_id: string;
  personnel_json: PersonnelMember[];
  dispatch_date: string;
  deployment_site_id: string | null;
  status: DispatchStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  po_number?: string;
  supplier_name?: string;
  site_name?: string;
}

export const DISPATCH_STATUS_CONFIG: Record<DispatchStatus, { label: string; className: string }> = {
  dispatched: { label: "Dispatched", className: "bg-info/10 text-info border-info/20" },
  confirmed: { label: "Confirmed", className: "bg-primary/10 text-primary border-primary/20" },
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  withdrawn: { label: "Withdrawn", className: "bg-muted/50 text-muted-foreground border-border" },
};

export function usePersonnelDispatches(poId?: string) {
  const { toast } = useToast();
  const [dispatches, setDispatches] = useState<PersonnelDispatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDispatches = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("personnel_dispatches")
        .select(`
          *,
          purchase_orders!service_po_id (po_number),
          suppliers!supplier_id (supplier_name),
          company_locations!deployment_site_id (name)
        `)
        .order("created_at", { ascending: false });

      if (poId) {
        query = query.eq("service_po_id", poId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((d: any) => ({
        ...d,
        po_number: d.purchase_orders?.po_number,
        supplier_name: d.suppliers?.supplier_name,
        site_name: d.locations?.name,
      }));

      setDispatches(mapped);
    } catch (err) {
      console.error("Personnel dispatches fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [poId]);

  const createDispatch = async (input: {
    service_po_id: string;
    supplier_id: string;
    personnel: PersonnelMember[];
    dispatch_date?: string;
    deployment_site_id?: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("personnel_dispatches").insert({
        service_po_id: input.service_po_id,
        supplier_id: input.supplier_id,
        personnel_json: input.personnel,
        dispatch_date: input.dispatch_date || new Date().toISOString().split("T")[0],
        deployment_site_id: input.deployment_site_id || null,
        status: "dispatched",
        notes: input.notes || null,
        created_by: user?.id,
        dispatch_number: "",
      });
      if (error) throw error;
      toast({ title: "Dispatch Created", description: `${input.personnel.length} personnel dispatched.` });
      fetchDispatches();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create dispatch";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const confirmDeployment = async (dispatchId: string, confirmerId: string) => {
    try {
      const { error } = await supabase
        .from("personnel_dispatches")
        .update({
          status: "confirmed",
          confirmed_by: confirmerId,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", dispatchId);
      if (error) throw error;
      toast({ title: "Deployment Confirmed", description: "Personnel deployment confirmed." });
      fetchDispatches();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to confirm";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  // Realtime subscription + initial fetch
  useEffect(() => {
    fetchDispatches();

    const channel = supabase
      .channel("personnel-dispatches-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "personnel_dispatches" }, () => {
        fetchDispatches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDispatches]);

  return { dispatches, isLoading, createDispatch, confirmDeployment, refresh: fetchDispatches };
}
