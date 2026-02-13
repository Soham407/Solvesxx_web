"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { SupplierRateDisplay } from "@/src/types/phaseD";

/**
 * Rate Change Notification Interface
 */
interface RateChangeNotification {
  id: string;
  rateId: string;
  productId: string;
  supplierId: string;
  productName: string;
  supplierName: string;
  type: "rate_created" | "rate_updated" | "rate_expired" | "rate_deactivated";
  oldRate?: number;
  newRate: number;
  changePercentage?: number;
  read: boolean;
  createdAt: string;
  metadata?: {
    effectiveFrom?: string;
    effectiveTo?: string;
    discount?: number;
    gst?: number;
  };
}

interface UseSupplierRateSubscriptionState {
  notifications: RateChangeNotification[];
  unreadCount: number;
  lastChange: SupplierRateDisplay | null;
  isConnected: boolean;
}

interface UseSupplierRateSubscriptionReturn extends UseSupplierRateSubscriptionState {
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for real-time supplier rate change subscriptions
 * Listens for new rates, rate updates, and expirations
 */
export function useSupplierRateSubscription(
  options?: {
    autoConnect?: boolean;
    supplierId?: string;
    productId?: string;
    supplierProductId?: string;
  }
): UseSupplierRateSubscriptionReturn {
  const [state, setState] = useState<UseSupplierRateSubscriptionState>({
    notifications: [],
    unreadCount: 0,
    lastChange: null,
    isConnected: false,
  });

  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Add notification helper
  const addNotification = useCallback((notification: RateChangeNotification) => {
    setState((prev) => ({
      ...prev,
      notifications: [notification, ...prev.notifications].slice(0, 50), // Keep last 50
      unreadCount: prev.unreadCount + 1,
    }));
  }, []);

  // Format currency for notifications
  const formatRate = (rate: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(rate);
  };

  // Calculate change percentage
  const calculateChangePercent = (oldRate: number, newRate: number): number => {
    if (oldRate === 0) return 0;
    return Math.round(((newRate - oldRate) / oldRate) * 100 * 10) / 10;
  };

  // Connect to real-time subscriptions
  const connect = useCallback(() => {
    // Disconnect existing channel if any
    if (channel) channel.unsubscribe();

    // Build filter based on options
    let filter: string | undefined;
    if (options?.supplierProductId) {
      filter = `supplier_product_id=eq.${options.supplierProductId}`;
    }

    // Supplier Rates Channel
    const newChannel = supabase
      .channel(`supplier-rates-${options?.supplierProductId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "supplier_rates",
          filter,
        },
        async (payload) => {
          const newRate = payload.new as any;

          // Fetch supplier product details with supplier and product names
          const { data: sp } = await supabase
            .from("supplier_products")
            .select(`
              id,
              supplier_id,
              product_id,
              supplier:suppliers(id, supplier_name),
              product:products(id, product_name)
            `)
            .eq("id", newRate.supplier_product_id)
            .single();

          if (!sp) return;

          // Check if we should filter by supplier or product
          if (options?.supplierId && sp.supplier_id !== options.supplierId) return;
          if (options?.productId && sp.product_id !== options.productId) return;

          const notification: RateChangeNotification = {
            id: `rate-create-${newRate.id}`,
            rateId: newRate.id,
            productId: sp.product_id || '',
            supplierId: sp.supplier_id || '',
            productName: (sp.product as any)?.product_name || "Unknown Product",
            supplierName: (sp.supplier as any)?.supplier_name || "Unknown Supplier",
            type: "rate_created",
            newRate: newRate.rate,
            read: false,
            createdAt: new Date().toISOString(),
            metadata: {
              effectiveFrom: newRate.effective_from,
              effectiveTo: newRate.effective_to,
              discount: newRate.discount_percentage,
              gst: newRate.gst_percentage,
            },
          };

          addNotification(notification);
          setState((prev) => ({
            ...prev,
            lastChange: { ...newRate, supplier: sp.supplier, product: sp.product } as SupplierRateDisplay,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "supplier_rates",
          filter,
        },
        async (payload) => {
          const updatedRate = payload.new as any;
          const oldRateData = payload.old as any;

          // Fetch supplier product details
          const { data: sp } = await supabase
            .from("supplier_products")
            .select(`
              id,
              supplier_id,
              product_id,
              supplier:suppliers(id, supplier_name),
              product:products(id, product_name)
            `)
            .eq("id", updatedRate.supplier_product_id)
            .single();

          if (!sp) return;

          // Check if we should filter by supplier or product
          if (options?.supplierId && sp.supplier_id !== options.supplierId) return;
          if (options?.productId && sp.product_id !== options.productId) return;

          let notificationType: RateChangeNotification["type"] = "rate_updated";
          let message = "Rate updated";

          // Check if rate was deactivated
          if (oldRateData.is_active && !updatedRate.is_active) {
            notificationType = "rate_deactivated";
            message = "Rate deactivated";
          }
          // Check if rate was expired (effective_to set)
          else if (!oldRateData.effective_to && updatedRate.effective_to) {
            notificationType = "rate_expired";
            message = "Rate expired";
          }

          const changePercent = oldRateData.rate !== updatedRate.rate
            ? calculateChangePercent(oldRateData.rate, updatedRate.rate)
            : undefined;

          const notification: RateChangeNotification = {
            id: `rate-update-${updatedRate.id}-${Date.now()}`,
            rateId: updatedRate.id,
            productId: sp.product_id || '',
            supplierId: sp.supplier_id || '',
            productName: (sp.product as any)?.product_name || "Unknown Product",
            supplierName: (sp.supplier as any)?.supplier_name || "Unknown Supplier",
            type: notificationType,
            oldRate: oldRateData.rate,
            newRate: updatedRate.rate,
            changePercentage: changePercent,
            read: false,
            createdAt: new Date().toISOString(),
            metadata: {
              effectiveFrom: updatedRate.effective_from,
              effectiveTo: updatedRate.effective_to,
              discount: updatedRate.discount_percentage,
              gst: updatedRate.gst_percentage,
            },
          };

          addNotification(notification);
          setState((prev) => ({
            ...prev,
            lastChange: { ...updatedRate, supplier: sp.supplier, product: sp.product } as SupplierRateDisplay,
          }));
        }
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    setChannel(newChannel);
  }, [channel, options?.supplierId, options?.productId, options?.supplierProductId, addNotification]);

  // Disconnect from subscriptions
  const disconnect = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
    }
    setState((prev) => ({ ...prev, isConnected: false }));
  }, [channel]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
    }));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (options?.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    connect,
    disconnect,
  };
}

export type { RateChangeNotification };
