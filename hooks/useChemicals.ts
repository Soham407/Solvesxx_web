"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface ChemicalProduct {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  category_name: string;
  current_stock: number;
  unit: string;
  expiry_date: string | null;
  batch_number: string | null;
  severity: 'expired' | 'critical' | 'warning' | 'healthy';
  days_left: number | null;
  source?: string;
}

interface ChemicalExpiryRow {
  id: string;
  product_id: string;
  product_name: string;
  expiry_date: string | null;
  batch_number: string | null;
  days_left: number | null;
  severity: ChemicalProduct["severity"];
  source: string | null;
}

export function validateChemicalExpiry(chem: { product_name: string, expiry_date: string | null }) {
  if (chem.expiry_date && new Date(chem.expiry_date) < new Date()) {
    return { 
      isValid: false, 
      error: `Cannot issue expired chemical: ${chem.product_name} expired on ${new Date(chem.expiry_date).toLocaleDateString()}` 
    };
  }
  return { isValid: true };
}

export function useChemicals() {
  const { toast } = useToast();
  const [chemicals, setChemicals] = useState<ChemicalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChemicals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Using the RPC function we created in the migration
      const { data, error: rpcError } = await (supabase as any).rpc('get_expiring_chemicals', {
        p_days_ahead: 365 // Get all with expiry in next year
      });

      if (rpcError) throw rpcError;

      const normalizedChemicals: ChemicalProduct[] = ((data || []) as ChemicalExpiryRow[]).map((chemical) => ({
        id: chemical.id,
        product_id: chemical.product_id,
        product_name: chemical.product_name,
        product_code: "",
        category_name: "",
        current_stock: 0,
        unit: "unit",
        expiry_date: chemical.expiry_date,
        batch_number: chemical.batch_number,
        severity: chemical.severity,
        days_left: chemical.days_left,
        source: chemical.source || undefined,
      }));

      setChemicals(normalizedChemicals);
    } catch (err: any) {
      console.error("Error fetching chemicals:", err);
      setError(err.message || "Failed to fetch chemical inventory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const issueChemical = useCallback(async (input: {
    productId: string;
    batchNumber?: string;
    quantity: number;
    notes?: string;
  }) => {
    try {
      // 1. Find the chemical in our local state to check expiry
      const chem = chemicals.find(c => c.product_id === input.productId && (!input.batchNumber || c.batch_number === input.batchNumber));
      
      // 2. Pre-flight check: Expiry
      if (chem) {
        const validation = validateChemicalExpiry(chem);
        if (!validation.isValid) {
          toast({
            title: "Issuance Blocked",
            description: validation.error,
            variant: "destructive"
          });
          return { success: false, error: validation.error };
        }
      }

      // 3. Record Stock Transaction (the DB trigger will also catch this)
      const { error: txError } = await supabase
        .from("stock_transactions")
        .insert({
          product_id: input.productId,
          transaction_type: "issue",
          quantity: -Math.abs(input.quantity),
          unit_of_measurement: chem?.unit || "unit",
          batch_number: input.batchNumber,
          notes: input.notes || "Manual issuance",
          transaction_date: new Date().toISOString().split('T')[0],
          transaction_number: `TX-CHEM-${Date.now()}`
        });

      if (txError) {
        // If the DB trigger blocked it, txError will contain the exception message
        toast({
          title: "Error",
          description: txError.message,
          variant: "destructive"
        });
        return { success: false, error: txError.message };
      }

      toast({
        title: "Success",
        description: "Chemical issued successfully",
      });

      await fetchChemicals();
      return { success: true };
    } catch (err: any) {
      console.error("Error issuing chemical:", err);
      return { success: false, error: err.message || "Failed to issue chemical" };
    }
  }, [chemicals, fetchChemicals, toast]);

  const updateExpiry = useCallback(async (productId: string, batchNumber: string, expiryDate: string) => {
    try {
      // Update in stock_batches (general inventory)
      const { error: batchError } = await supabase
        .from("stock_batches")
        .update({ expiry_date: expiryDate })
        .eq("product_id", productId)
        .eq("batch_number", batchNumber);

      if (batchError) throw batchError;

      // Also try updating in pest_control_chemicals (domain specific)
      await supabase
        .from("pest_control_chemicals")
        .update({ expiry_date: expiryDate })
        .eq("product_id", productId)
        .eq("batch_number", batchNumber);

      toast({
        title: "Expiry Updated",
        description: "Chemical expiry information has been updated",
      });

      await fetchChemicals();
      return { success: true };
    } catch (err: any) {
      console.error("Error updating expiry:", err);
      return { success: false, error: err.message || "Failed to update expiry" };
    }
  }, [fetchChemicals, toast]);

  useEffect(() => {
    fetchChemicals();
  }, [fetchChemicals]);

  const expiringChemicals = chemicals.filter(c => c.severity === 'warning' || c.severity === 'critical');
  const blockedChemicals = chemicals.filter(c => c.severity === 'expired');

  return {
    chemicals,
    expiringChemicals,
    blockedChemicals,
    isLoading,
    error,
    fetchChemicals,
    issueChemical,
    updateExpiry,
    refresh: fetchChemicals
  };
}
