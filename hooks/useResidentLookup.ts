import { useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { sanitizeLikeInput } from '@/lib/sanitize';

export interface ResidentSearchResult {
  id: string;
  full_name: string;
  flat_number: string;
  profile_photo_url: string | null;
  masked_phone: string | null;
  is_owner: boolean;
  move_in_date: string | null;
}

interface ResidentRow {
  id: string;
  full_name: string;
  flat_number: string | null;
  masked_phone: string | null;
  is_primary_contact: boolean | null;
  is_active: boolean | null;
}

export function useResidentLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResidentSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  function normalizeResidentRows(rows: unknown): ResidentRow[] {
    return Array.isArray(rows) ? (rows as ResidentRow[]) : [];
  }

  const searchResidents = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const searchTerm = sanitizeLikeInput(query.trim());

      const { data, error: residentError } = await supabase
        .from("resident_directory")
        .select("id, full_name, flat_number, masked_phone, is_primary_contact, is_active")
        .eq("is_active", true)
        .or(`full_name.ilike.%${searchTerm}%,flat_number.ilike.%${searchTerm}%`)
        .limit(25);

      if (residentError) {
        throw residentError;
      }

      const uniqueResidents = normalizeResidentRows(data);

      const mappedResults = uniqueResidents
        .map((resident) => {
          return {
            id: resident.id,
            full_name: resident.full_name,
            flat_number: resident.flat_number || "N/A",
            profile_photo_url: null,
            masked_phone: resident.masked_phone || "*****",
            is_owner: Boolean(resident.is_primary_contact),
            move_in_date: null,
          } satisfies ResidentSearchResult;
        });

      setResults(mappedResults);
    } catch (err: unknown) {
      console.error('Failed to search residents:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchResidents,
    results,
    isLoading,
    error
  };
}
