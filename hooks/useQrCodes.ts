"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  QrCode,
  QrScan,
  QrScanInsert,
  QrScanResult,
  AssetWithDetails,
} from "@/src/types/operations";
import { QR_CODE_CONFIG } from "@/src/lib/constants";

interface UseQrCodesState {
  qrCodes: QrCode[];
  isLoading: boolean;
  error: string | null;
  scanResult: QrScanResult | null;
  isScanning: boolean;
}

interface UseQrCodesReturn extends UseQrCodesState {
  getQrByAssetId: (assetId: string) => Promise<QrCode | null>;
  scanQrCode: (qrId: string, location?: { latitude: number; longitude: number }) => Promise<QrScanResult>;
  recordScan: (scanData: QrScanInsert) => Promise<{ success: boolean; error?: string }>;
  getScanHistory: (qrId: string) => Promise<QrScan[]>;
  generateBatch: (input: {
    count: number;
    societyId: string;
    warehouseId?: string | null;
    prefix?: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    data?: {
      batchId: string;
      count: number;
      qrCodes: QrCode[];
      downloadUrl: string;
    };
  }>;
  generateQrUrl: (qrId: string) => string;
  clearScanResult: () => void;
  refresh: () => void;
}

/**
 * Hook for managing QR codes and scan operations
 * Used for asset identification and tracking
 */
export function useQrCodes(societyId?: string): UseQrCodesReturn {
  const [state, setState] = useState<UseQrCodesState>({
    qrCodes: [],
    isLoading: true,
    error: null,
    scanResult: null,
    isScanning: false,
  });

  // Fetch QR codes (optionally filtered by society)
  const fetchQrCodes = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("qr_codes")
        .select("*")
        .eq("is_active", true);

      if (societyId) {
        query = query.eq("society_id", societyId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      setState({
        qrCodes: data || [],
        isLoading: false,
        error: null,
        scanResult: null,
        isScanning: false,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch QR codes";
      console.error("Error fetching QR codes:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [societyId]);

  // Get QR code by asset ID
  const getQrByAssetId = useCallback(
    async (assetId: string): Promise<QrCode | null> => {
      try {
        const { data, error } = await supabase
          .from("qr_codes")
          .select("*")
          .eq("asset_id", assetId)
          .eq("is_active", true)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        return data;
      } catch (err: unknown) {
        console.error("Error fetching QR by asset ID:", err);
        return null;
      }
    },
    []
  );

  // Scan QR code and retrieve associated asset
  const scanQrCode = useCallback(
    async (
      qrId: string,
      location?: { latitude: number; longitude: number }
    ): Promise<QrScanResult> => {
      setState((prev) => ({ ...prev, isScanning: true }));

      try {
        // Validate QR code exists and is active
        const { data: qrCode, error: qrError } = await supabase
          .from("qr_codes")
          .select("*, assets_with_details!qr_codes_asset_id_fkey(*)")
          .eq("id", qrId)
          .single();

        if (qrError) {
          if (qrError.code === "PGRST116") {
            const result: QrScanResult = {
              qrId,
              isValid: false,
              errorMessage: "QR code not found",
            };
            setState((prev) => ({ ...prev, scanResult: result, isScanning: false }));
            return result;
          }
          throw qrError;
        }

        if (!qrCode.is_active) {
          const result: QrScanResult = {
            qrId,
            isValid: false,
            errorMessage: "QR code is inactive",
          };
          setState((prev) => ({ ...prev, scanResult: result, isScanning: false }));
          return result;
        }

        // Record the scan
        await supabase.from("qr_scans").insert({
          qr_id: qrId,
          scanned_at: new Date().toISOString(),
          latitude: location?.latitude,
          longitude: location?.longitude,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });

        const asset = qrCode.assets_with_details as AssetWithDetails | null;

        const result: QrScanResult = {
          qrId,
          asset: asset || undefined,
          isValid: true,
        };

        setState((prev) => ({ ...prev, scanResult: result, isScanning: false }));
        return result;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to scan QR code";
        console.error("Error scanning QR code:", err);
        
        const result: QrScanResult = {
          qrId,
          isValid: false,
          errorMessage,
        };
        
        setState((prev) => ({ ...prev, scanResult: result, isScanning: false }));
        return result;
      }
    },
    []
  );

  // Record a scan manually
  const recordScan = useCallback(
    async (scanData: QrScanInsert): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("qr_scans").insert(scanData);

        if (error) throw error;

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to record scan";
        console.error("Error recording scan:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Get scan history for a QR code
  const getScanHistory = useCallback(
    async (qrId: string): Promise<QrScan[]> => {
      try {
        const { data, error } = await supabase
          .from("qr_scans")
          .select("*")
          .eq("qr_id", qrId)
          .order("scanned_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        return data || [];
      } catch (err: unknown) {
        console.error("Error fetching scan history:", err);
        return [];
      }
    },
    []
  );

  const generateBatch = useCallback(
    async (input: {
      count: number;
      societyId: string;
      warehouseId?: string | null;
      prefix?: string;
    }) => {
      try {
        const response = await fetch("/api/assets/generate-qr-batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            count: input.count,
            societyId: input.societyId,
            warehouseId: input.warehouseId || undefined,
            prefix: input.prefix,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to generate QR codes");
        }

        setState((prev) => ({
          ...prev,
          qrCodes: [...(payload.qrCodes || []), ...prev.qrCodes],
        }));

        return {
          success: true as const,
          data: {
            batchId: payload.batchId,
            count: payload.count,
            qrCodes: payload.qrCodes || [],
            downloadUrl: payload.downloadUrl,
          },
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate QR codes";
        console.error("Error generating QR batch:", err);
        return { success: false as const, error: errorMessage };
      }
    },
    []
  );

  // Generate QR code URL for scanning
  const generateQrUrl = useCallback((qrId: string): string => {
    const baseUrl = QR_CODE_CONFIG.BASE_URL || "";
    return `${baseUrl}${QR_CODE_CONFIG.SCAN_PATH}/${qrId}`;
  }, []);

  // Clear scan result
  const clearScanResult = useCallback(() => {
    setState((prev) => ({ ...prev, scanResult: null }));
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    fetchQrCodes();
  }, [fetchQrCodes]);

  // Initialize on mount
  useEffect(() => {
    fetchQrCodes();
  }, [fetchQrCodes]);

  return {
    ...state,
    getQrByAssetId,
    scanQrCode,
    recordScan,
    getScanHistory,
    generateBatch,
    generateQrUrl,
    clearScanResult,
    refresh,
  };
}
