"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface MDStats {
  activeSocieties: number;
  totalEmployees: number;
  guardStrength: number;
  totalRevenue: number | null; // Will be null until financial tables exist
  clientRetention: number | null;
}

interface UseMDStatsReturn {
  stats: MDStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMDStats(): UseMDStatsReturn {
  const [stats, setStats] = useState<MDStats>({
    activeSocieties: 0,
    totalEmployees: 0,
    guardStrength: 0,
    totalRevenue: null,
    clientRetention: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get active societies count
      const { count: activeSocieties, error: societiesError } = await supabase
        .from("societies")
        .select("id", { count: "exact" })
        .eq("is_active", true);

      if (societiesError) throw societiesError;

      // Get total active employees
      const { count: totalEmployees, error: empError } = await supabase
        .from("employees")
        .select("id", { count: "exact" })
        .eq("is_active", true);

      if (empError) throw empError;

      // Get security guards count
      const { count: guardStrength, error: guardError } = await supabase
        .from("security_guards")
        .select("id", { count: "exact" });

      if (guardError) throw guardError;

      // Note: Revenue and retention will be null until financial tables are created
      // These will be populated in a future phase

      setStats({
        activeSocieties: activeSocieties || 0,
        totalEmployees: totalEmployees || 0,
        guardStrength: guardStrength || 0,
        totalRevenue: null,
        clientRetention: null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch MD stats";
      setError(errorMessage);
      console.error("Error fetching MD stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}
