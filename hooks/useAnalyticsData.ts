"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { type ChartRow, type FinancialSummary } from "@/src/lib/analytics/reportTransforms";
import {
  loadAttendanceAnalytics,
  loadFinancialAnalytics,
  loadInventoryAnalytics,
  loadServicesAnalytics,
  type AnalyticsReportResult,
} from "@/src/lib/analytics/reportLoaders";

export type ReportType = "financial" | "attendance" | "inventory" | "services";

const reportLoaders: Record<ReportType, (selectedDate: Date) => Promise<AnalyticsReportResult>> = {
  financial: loadFinancialAnalytics,
  attendance: loadAttendanceAnalytics,
  inventory: loadInventoryAnalytics,
  services: loadServicesAnalytics,
};

export function useAnalyticsData(reportType: ReportType, selectedDate: Date = new Date()) {
  const [data, setData] = useState<ChartRow[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [trends, setTrends] = useState<ChartRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setData([]);
    setSummary(null);
    setTrends([]);

    try {
      const result = await reportLoaders[reportType](selectedDate);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setData(result.data);
      setSummary(result.summary);
      setTrends(result.trends);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
      console.error("Error fetching analytics data:", err);
      setError(errorMessage);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [reportType, selectedDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    summary,
    trends,
    isLoading,
    error,
    refresh: fetchData,
  };
}

export function buildLateThreshold(shiftStart: Date, graceMinutes: number): Date {
  const lateThreshold = new Date(shiftStart.getTime() + graceMinutes * 60000);
  return lateThreshold;
}

export function countLateArrival(checkIn: Date, lateThreshold: Date): number {
  let lateCount = 0;
  if (checkIn > lateThreshold) lateCount++;
  return lateCount;
}

export function classifyStockMovement(type: string): { isReceived: boolean; isIssued: boolean } {
  const isReceived = ["IN", "RECEIVE", "GRN", "RETURN"].includes(type);
  const isIssued = ["OUT", "ISSUE", "DISPATCH", "WASTE"].includes(type);
  return { isReceived, isIssued };
}

type DateRangeQueryable = {
  gte: (col: string, val: string) => DateRangeQueryable;
  lte: (col: string, val: string) => DateRangeQueryable;
};

export function buildFinancialDateFilter(
  query: DateRangeQueryable,
  startDateStr: string,
  endDateStr: string
) {
  return query.gte("sale_bills.invoice_date", startDateStr).lte("sale_bills.invoice_date", endDateStr);
}

export function buildInvoiceDateFilter(
  query: DateRangeQueryable,
  startDateStr: string,
  endDateStr: string
) {
  return query.gte("invoice_date", startDateStr).lte("invoice_date", endDateStr);
}
