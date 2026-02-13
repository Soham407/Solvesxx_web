"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { SaleProductRateDisplay } from "@/src/types/phaseD";

/**
 * Sale Rate Change Notification Interface
 */
interface SaleRateChangeNotification {
  id: string;
  rateId: string;
  productId: string;
  societyId: string | null;
  productName: string;
  societyName: string | null;
  type: "rate_created" | "rate_updated" | "rate_expired" | "rate_deactivated";
  oldRate?: number;
  newRate: number;
  changePercentage?: number;
  read: boolean;
  createdAt: string;
  metadata?: {
    effectiveFrom?: string;
    effectiveTo?: string;
    gst?: number;
    margin?: number;
    baseCost?: number;
    isGlobal: boolean;
  };
}

interface UseSaleRateSubscriptionState {
  notifications: SaleRateChangeNotification[];
  unreadCount: number;
  lastChange: SaleProductRateDisplay | null;
  isConnected: boolean;
}

interface UseSaleRateSubscriptionReturn extends UseSaleRateSubscriptionState {
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for real-time sale product rate change subscriptions
 * Listens for new rates, rate updates, and expirations
 * Supports filtering by product or society
 */
export function useSaleRateSubscription(
  options?: {
    autoConnect?: boolean;
    productId?: string;
    societyId?: string;
    globalOnly?: boolean; // Only listen to global rates (society_id IS NULL)
  }
): UseSaleRateSubscriptionReturn {
  const [state, setState] = useState<UseSaleRateSubscriptionState>({
    notifications: [],
    unreadCount: 0,
    lastChange: null,
    isConnected: false,
  });

  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Add notification helper
  const addNotification = useCallback((notification: SaleRateChangeNotification) => {
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
    if (options?.productId) {
      filter = `product_id=eq.${options.productId}`;
    } else if (options?.societyId) {
      filter = `society_id=eq.${options.societyId}`;
    } else if (options?.globalOnly) {
      filter = `society_id=is.null`;
    }

    // Sale Product Rates Channel
    const channelName = `sale-rates-${options?.productId || options?.societyId || (options?.globalOnly ? "global" : "all")}`;
    
    const newChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sale_product_rates",
          filter,
        },
        async (payload) => {
          const newRate = payload.new as any;

          // Check additional filters that can't be done via Supabase filter
          if (options?.productId && newRate.product_id !== options.productId) return;
          if (options?.societyId && newRate.society_id !== options.societyId) return;
          if (options?.globalOnly && newRate.society_id !== null) return;

          // Fetch product details
          const { data: product } = await supabase
            .from("products")
            .select("id, product_name")
            .eq("id", newRate.product_id)
            .single();

          // Fetch society details if society_id exists
          let societyName: string | null = null;
          if (newRate.society_id) {
            const { data: society } = await supabase
              .from("societies")
              .select("id, society_name")
              .eq("id", newRate.society_id)
              .single();
            societyName = society?.society_name || null;
          }

          const notification: SaleRateChangeNotification = {
            id: `sale-rate-create-${newRate.id}`,
            rateId: newRate.id,
            productId: newRate.product_id,
            societyId: newRate.society_id,
            productName: product?.product_name || "Unknown Product",
            societyName: societyName,
            type: "rate_created",
            newRate: newRate.sale_rate,
            read: false,
            createdAt: new Date().toISOString(),
            metadata: {
              effectiveFrom: newRate.effective_from,
              effectiveTo: newRate.effective_to,
              gst: newRate.gst_percentage,
              margin: newRate.margin_percentage,
              baseCost: newRate.base_cost,
              isGlobal: newRate.society_id === null,
            },
          };

          addNotification(notification);
          setState((prev) => ({
            ...prev,
            lastChange: {
              ...newRate,
              product: product,
              society: societyName ? { id: newRate.society_id, name: societyName } : null,
            } as SaleProductRateDisplay,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sale_product_rates",
          filter,
        },
        async (payload) => {
          const updatedRate = payload.new as any;
          const oldRateData = payload.old as any;

          // Check additional filters
          if (options?.productId && updatedRate.product_id !== options.productId) return;
          if (options?.societyId && updatedRate.society_id !== options.societyId) return;
          if (options?.globalOnly && updatedRate.society_id !== null) return;

          // Fetch product details
          const { data: product } = await supabase
            .from("products")
            .select("id, product_name")
            .eq("id", updatedRate.product_id)
            .single();

          // Fetch society details if society_id exists
          let societyName: string | null = null;
          if (updatedRate.society_id) {
            const { data: society } = await supabase
              .from("societies")
              .select("id, society_name")
              .eq("id", updatedRate.society_id)
              .single();
            societyName = society?.society_name || null;
          }

          let notificationType: SaleRateChangeNotification["type"] = "rate_updated";

          // Check if rate was deactivated
          if (oldRateData.is_active && !updatedRate.is_active) {
            notificationType = "rate_deactivated";
          }
          // Check if rate was expired (effective_to set)
          else if (!oldRateData.effective_to && updatedRate.effective_to) {
            notificationType = "rate_expired";
          }

          const changePercent = oldRateData.sale_rate !== updatedRate.sale_rate
            ? calculateChangePercent(oldRateData.sale_rate, updatedRate.sale_rate)
            : undefined;

          const notification: SaleRateChangeNotification = {
            id: `sale-rate-update-${updatedRate.id}-${Date.now()}`,
            rateId: updatedRate.id,
            productId: updatedRate.product_id,
            societyId: updatedRate.society_id,
            productName: product?.product_name || "Unknown Product",
            societyName: societyName,
            type: notificationType,
            oldRate: oldRateData.sale_rate,
            newRate: updatedRate.sale_rate,
            changePercentage: changePercent,
            read: false,
            createdAt: new Date().toISOString(),
            metadata: {
              effectiveFrom: updatedRate.effective_from,
              effectiveTo: updatedRate.effective_to,
              gst: updatedRate.gst_percentage,
              margin: updatedRate.margin_percentage,
              baseCost: updatedRate.base_cost,
              isGlobal: updatedRate.society_id === null,
            },
          };

          addNotification(notification);
          setState((prev) => ({
            ...prev,
            lastChange: {
              ...updatedRate,
              product: product,
              society: societyName ? { id: updatedRate.society_id, name: societyName } : null,
            } as SaleProductRateDisplay,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "sale_product_rates",
          filter,
        },
        async (payload) => {
          const deletedRate = payload.old as any;

          // Check additional filters
          if (options?.productId && deletedRate.product_id !== options.productId) return;
          if (options?.societyId && deletedRate.society_id !== options.societyId) return;
          if (options?.globalOnly && deletedRate.society_id !== null) return;

          const notification: SaleRateChangeNotification = {
            id: `sale-rate-delete-${deletedRate.id}-${Date.now()}`,
            rateId: deletedRate.id,
            productId: deletedRate.product_id,
            societyId: deletedRate.society_id,
            productName: "Product",
            societyName: deletedRate.society_id ? "Society" : null,
            type: "rate_deactivated",
            newRate: deletedRate.sale_rate || 0,
            read: false,
            createdAt: new Date().toISOString(),
            metadata: {
              isGlobal: deletedRate.society_id === null,
            },
          };

          addNotification(notification);
        }
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    setChannel(newChannel);
  }, [channel, options?.productId, options?.societyId, options?.globalOnly, addNotification]);

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

export type { SaleRateChangeNotification };
