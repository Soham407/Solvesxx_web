"use client";

import { useState, useCallback, useEffect } from "react";
import { useResidentLookup } from "@/hooks/useResidentLookup";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  UserCheck,
  Search,
  Loader2,
  Home,
  Calendar,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

export default function GuardTruthEnginePage() {
  const [query, setQuery] = useState("");
  const { searchResidents, results, isLoading, error } = useResidentLookup();

  // Manual debounce implementation since I'm not sure if useDebounce exists
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchResidents(debouncedQuery);
    }
    // searchResidents identity is stable (no deps change it), safe to include
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Resident Verification
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Operational Truth Engine • Phase E • Privacy Safe
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by Name or Flat Number (min 2 chars)..."
          className="h-12 pl-10 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-bold">Access Denied or Error: {error}</span>
        </div>
      )}

      {!isLoading && !error && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No residents found matching "{query}"</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((resident) => (
          <Card
            key={resident.id}
            className="overflow-hidden border-none shadow-card hover:shadow-lg transition-all group"
          >
            <CardContent className="p-0">
              <div className="bg-primary/5 p-4 flex items-center gap-4 border-b border-primary/10">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-background ring-2 ring-primary/20">
                  {resident.profile_photo_url ? (
                    <img
                      src={resident.profile_photo_url}
                      alt={resident.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                      {resident.full_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{resident.full_name}</h3>
                  <Badge
                    variant={resident.is_owner ? "default" : "secondary"}
                    className="text-[10px] uppercase h-5 mt-1"
                  >
                    {resident.is_owner ? "Owner" : "Tenant"}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Home className="h-4 w-4" /> Flat
                  </span>
                  <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                    {resident.flat_number}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4" /> Contact
                  </span>
                  <span className="font-mono font-bold text-primary tracking-wider">
                    {resident.masked_phone || "Not Linked"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Since
                  </span>
                  <span className="font-medium">
                    {resident.move_in_date
                      ? new Date(resident.move_in_date).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>

                <Button
                  className="w-full mt-2 font-bold uppercase tracking-widest text-xs"
                  variant="outline"
                >
                  Log Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
