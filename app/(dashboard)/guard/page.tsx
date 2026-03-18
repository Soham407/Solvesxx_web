"use client";

import { useState, useEffect } from "react";
import { useResidentLookup } from "@/hooks/useResidentLookup";
import { usePanicAlert } from "@/hooks/usePanicAlert";
import { VisitorRegistrationDialog } from "@/components/society/VisitorRegistrationDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  UserCheck,
  Search,
  Loader2,
  Home,
  Calendar,
  AlertTriangle,
  ClipboardList,
  Phone,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function GuardStationPage() {
  const [query, setQuery] = useState("");
  const { searchResidents, results, isLoading, error } = useResidentLookup();
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const { isTriggering, isHolding, holdProgress, startHold, endHold, cancelHold, triggerPanic } = usePanicAlert();

  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchResidents(debouncedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <h1 className="text-xl font-black text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Guard Station
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Security Command • Visitor Control
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {/* SOS Panic Button */}
        <button
          className={cn(
            "relative col-span-2 flex items-center justify-center gap-3 rounded-2xl p-5 font-black text-white text-lg uppercase tracking-widest transition-all select-none",
            isHolding
              ? "bg-red-700 scale-95 shadow-inner"
              : "bg-critical shadow-lg shadow-critical/40 active:scale-95",
          )}
          onMouseDown={startHold}
          onMouseUp={() => { if (endHold()) triggerPanic({}); }}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={() => { if (endHold()) triggerPanic({}); }}
          disabled={isTriggering}
        >
          {isTriggering ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
          <span>
            {isTriggering
              ? "Sending Alert..."
              : isHolding
              ? `Hold... ${Math.round(holdProgress)}%`
              : "SOS — Hold 3s to Trigger"}
          </span>
          {isHolding && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-white/60 rounded-b-2xl transition-all duration-100"
              style={{ width: `${holdProgress}%` }}
            />
          )}
        </button>

        {/* Checklist */}
        <Link href="/society/checklists" className="block">
          <Card className="border-none shadow-card ring-1 ring-border hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">Daily Checklist</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  Facility Rounds
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Emergency Contacts */}
        <Link href="/society/emergency" className="block">
          <Card className="border-none shadow-card ring-1 ring-border hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">Emergency</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  Quick Dial
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Visitor Entry */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Visitor Entry
        </h2>
        <Button
          className="w-full gap-2 font-bold uppercase tracking-widest text-sm h-12 shadow-glow"
          onClick={() => setIsRegistrationOpen(true)}
        >
          <UserPlus className="h-5 w-5" />
          Register New Visitor
        </Button>
      </div>

      {/* Resident Verification */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Resident Verification
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by Name or Flat Number..."
            className="h-12 pl-10 text-base"
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
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm font-bold">
            {error}
          </div>
        )}

        {!isLoading && !error && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No residents found for "{query}"</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {results.map((resident) => (
            <Card
              key={resident.id}
              className="overflow-hidden border-none shadow-card hover:shadow-lg transition-all"
            >
              <CardContent className="p-0">
                <div className="bg-primary/5 p-4 flex items-center gap-4 border-b border-primary/10">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-background ring-2 ring-primary/20 flex-shrink-0">
                    {resident.profile_photo_url ? (
                      <img
                        src={resident.profile_photo_url}
                        alt={resident.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                        {resident.full_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{resident.full_name}</h3>
                    <Badge
                      variant={resident.is_owner ? "default" : "secondary"}
                      className="text-[10px] uppercase h-5 mt-1"
                    >
                      {resident.is_owner ? "Owner" : "Tenant"}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2">
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
                    className="w-full mt-1 font-bold uppercase tracking-widest text-xs"
                    variant="outline"
                    onClick={() => setIsRegistrationOpen(true)}
                  >
                    Log Visitor Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <VisitorRegistrationDialog
        open={isRegistrationOpen}
        onOpenChange={setIsRegistrationOpen}
      />
    </div>
  );
}
