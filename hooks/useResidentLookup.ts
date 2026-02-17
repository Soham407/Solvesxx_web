import { useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';

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

  const searchResidents = async (query: string, societyId?: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('search_residents' as any, {
        p_query: query.trim(),
        p_society_id: societyId || null,
      });

      if (rpcError) throw rpcError;

      setResults(data || []);
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
