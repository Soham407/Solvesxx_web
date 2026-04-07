"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const supabase = supabaseClient as any;

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
  employee_id?: string | null;
  personnel_json: PersonnelMember[];
  dispatch_date: string;
  start_date: string;
  end_date: string | null;
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
  employee_name?: string;
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
          supplier:suppliers!supplier_id (supplier_name),
          deployment_site:company_locations!deployment_site_id (location_name),
          employee:employees!employee_id (first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (poId) {
        query = query.eq("service_po_id", poId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const servicePoIds = Array.from(
        new Set((data || []).map((dispatch: any) => dispatch.service_po_id).filter(Boolean))
      );
      const servicePoNumberById = new Map<string, string | null>();

      if (servicePoIds.length > 0) {
        const { data: serviceOrders, error: serviceOrdersError } = await supabase
          .from("service_purchase_orders")
          .select("id, spo_number")
          .in("id", servicePoIds);

        if (serviceOrdersError) throw serviceOrdersError;

        (serviceOrders || []).forEach((serviceOrder: any) => {
          servicePoNumberById.set(serviceOrder.id, serviceOrder.spo_number ?? null);
        });
      }

      const mapped = (data || []).map((d: any) => ({
        ...d,
        po_number: servicePoNumberById.get(d.service_po_id) ?? null,
        supplier_name: d.supplier?.supplier_name,
        site_name: d.deployment_site?.location_name,
        employee_name: d.employee ? `${d.employee.first_name} ${d.employee.last_name}` : null,
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
    employee_id: string;
    start_date: string;
    end_date?: string | null;
    personnel?: PersonnelMember[];
    deployment_site_id?: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const overlapEndDate = input.end_date || "9999-12-31";

      // Pre-flight overlap check
      const { data: overlaps, error: checkError } = await supabase
        .from("personnel_dispatches")
        .select(`
          id, 
          start_date, 
          end_date, 
          deployment_site:company_locations!deployment_site_id (location_name),
          employee:employees!employee_id (first_name, last_name)
        `)
        .eq("employee_id", input.employee_id)
        .in("status", ["dispatched", "confirmed", "active"])
        .lte("start_date", overlapEndDate)
        .or(`end_date.gte.${input.start_date},end_date.is.null`)
        .limit(1);

      if (checkError) throw checkError;

      if (overlaps && overlaps.length > 0) {
        const o = overlaps[0];
        const empName = o.employee ? `${o.employee.first_name} ${o.employee.last_name}` : "Employee";
        const siteName = o.deployment_site?.location_name || "another site";
        const msg = `${empName} is already deployed from ${o.start_date} to ${o.end_date || 'Open'} at ${siteName}`;
        toast({ title: "Deployment Conflict", description: msg, variant: "destructive" });
        return { success: false, error: msg };
      }

      const { error } = await supabase.from("personnel_dispatches").insert({
        service_po_id: input.service_po_id,
        supplier_id: input.supplier_id,
        employee_id: input.employee_id,
        personnel_json: input.personnel || [],
        dispatch_date: input.start_date,
        start_date: input.start_date,
        end_date: input.end_date || null,
        deployment_site_id: input.deployment_site_id || null,
        status: "dispatched",
        notes: input.notes || null,
        created_by: user?.id,
        dispatch_number: "",
      });
      if (error) throw error;
      toast({ title: "Dispatch Created", description: "Personnel deployment scheduled." });
      fetchDispatches();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create dispatch";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false, error: msg };
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
