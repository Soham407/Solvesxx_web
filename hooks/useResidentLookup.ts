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

export function useResidentLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResidentSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const maskPhone = (phone: string | null | undefined) => {
    if (!phone) {
      return "*****";
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      return `${"*".repeat(6)}${digits.slice(-4)}`;
    }

    return "*****";
  };

  const searchResidents = async (query: string, societyId?: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const searchTerm = sanitizeLikeInput(query.trim());

      const { data: nameMatches, error: residentError } = await supabase
        .from("residents")
        .select(`
          id,
          full_name,
          phone,
          relation,
          move_in_date,
          flat_id,
          flats!inner(
            flat_number
          )
        `)
        .eq("is_active", true)
        .ilike("full_name", `%${searchTerm}%`)
        .limit(25);

      if (residentError) {
        throw residentError;
      }

      const { data: flatMatches, error: flatError } = await supabase
        .from("flats")
        .select("id, flat_number")
        .ilike("flat_number", `%${searchTerm}%`)
        .limit(25);

      if (flatError) {
        throw flatError;
      }

      const matchingFlatIds = (flatMatches || []).map((flat) => flat.id);

      const { data: flatResidents, error: flatResidentError } = matchingFlatIds.length
        ? await supabase
            .from("residents")
            .select(`
              id,
              full_name,
              phone,
              relation,
              move_in_date,
              flat_id,
              flats!inner(
                flat_number
              )
            `)
            .eq("is_active", true)
            .in("flat_id", matchingFlatIds)
            .limit(25)
        : { data: [], error: null };

      if (flatResidentError) {
        throw flatResidentError;
      }

      const merged = [...(nameMatches || []), ...(flatResidents || [])];
      const uniqueResidents = Array.from(new Map(merged.map((resident: any) => [resident.id, resident])).values());

      const mappedResults = uniqueResidents
        .map((resident: any) => {
          const flatData = Array.isArray(resident.flats) ? resident.flats[0] : resident.flats;
          return {
            id: resident.id,
            full_name: resident.full_name,
            flat_number: flatData?.flat_number || "N/A",
            profile_photo_url: null,
            masked_phone: maskPhone(resident.phone),
            is_owner: String(resident.relation || "").toLowerCase() === "owner",
            move_in_date: resident.move_in_date,
          } satisfies ResidentSearchResult;
        });

      setResults(mappedResults);
    } catch (err: any) {
      console.error('Failed to search residents:', err);
      setError(err.message || 'Search failed');
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
