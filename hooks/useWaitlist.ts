"use client";

import { useMemo } from "react";

import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { supabase } from "@/src/lib/supabaseClient";
import type { Database } from "@/src/types/supabase";

export const WAITLIST_STATUSES = ["pending", "approved", "rejected"] as const;

export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export interface WaitlistEntry {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  created_at: string | null;
  status: WaitlistStatus;
}

interface UpdateWaitlistStatusInput {
  id: string;
  status: WaitlistStatus;
}

type WaitlistRow = Database["public"]["Tables"]["waitlist"]["Row"] & {
  status?: string | null;
};

type WaitlistUpdate = Database["public"]["Tables"]["waitlist"]["Update"] & {
  status: WaitlistStatus;
};

const WAITLIST_STATUS_SET = new Set<string>(WAITLIST_STATUSES);

export const WAITLIST_STATUS_CONFIG: Record<
  WaitlistStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  approved: {
    label: "Approved",
    className: "border-success/20 bg-success/10 text-success",
  },
  rejected: {
    label: "Rejected",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
  },
};

function normalizeStatus(value: string | null | undefined): WaitlistStatus {
  return WAITLIST_STATUS_SET.has(value ?? "")
    ? (value as WaitlistStatus)
    : "pending";
}

function normalizeEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    name: row.name ?? null,
    email: row.email,
    company: row.company ?? null,
    created_at: row.created_at ?? null,
    status: normalizeStatus(row.status),
  };
}

export function useWaitlist() {
  const waitlistQuery = useSupabaseQuery<WaitlistEntry>(async () => {
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, name, email, company, created_at, status")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as WaitlistRow[]).map(normalizeEntry);
  }, []);

  const { execute: updateWaitlistStatus, isLoading: isUpdatingStatus } =
    useSupabaseMutation<
      UpdateWaitlistStatusInput,
      { id: string; status: WaitlistStatus }
    >(
      async ({ id, status }) => {
        const { data, error } = await supabase
          .from("waitlist")
          .update({ status: normalizeStatus(status) } as WaitlistUpdate)
          .eq("id", id)
          .select("id, status")
          .single();

        if (error) {
          throw error;
        }

        waitlistQuery.refresh();

        return {
          id: (data as unknown as WaitlistRow).id,
          status: normalizeStatus((data as unknown as WaitlistRow).status),
        };
      },
      { successMessage: "Waitlist status updated" }
    );

  const stats = useMemo(() => {
    return waitlistQuery.data.reduce(
      (summary, entry) => {
        summary.total += 1;
        summary[entry.status] += 1;
        return summary;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [waitlistQuery.data]);

  return {
    entries: waitlistQuery.data,
    stats,
    isLoading: waitlistQuery.isLoading,
    error: waitlistQuery.error,
    refresh: waitlistQuery.refresh,
    updateWaitlistStatus,
    isUpdatingStatus,
  };
}

export default useWaitlist;
