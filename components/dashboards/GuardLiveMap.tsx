"use client";

import { useGuardLiveLocation } from "@/hooks/useGuardLiveLocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, User, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface GuardLiveMapProps {
  height?: string;
  readOnly?: boolean;
}

export function GuardLiveMap({ height = "400px", readOnly = false }: GuardLiveMapProps) {
  const { locations, isLoading } = useGuardLiveLocation();

  return (
    <Card className={cn("border-none shadow-card ring-1 ring-border overflow-hidden col-span-full", readOnly && "shadow-none ring-0")}>
      {!readOnly && (
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Guard Live Situational Map
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
              Real-time GPS tracking of on-duty personnel
            </p>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold">
            {locations.length} ACTIVE GUARDS
          </Badge>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="grid lg:grid-cols-4" style={{ minHeight: height }}>
          {/* Map Visualization Placeholder */}
          <div className="lg:col-span-3 bg-muted/20 relative overflow-hidden flex items-center justify-center border-r">
            {/* Simple Grid Background to simulate a map */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Initializing GPS Feed...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm font-bold text-muted-foreground uppercase">No Active Tracking Data</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tracking begins once guards clock in and GPS heartbeat starts.</p>
              </div>
            ) : (
              <div className="relative w-full h-full p-12">
                {/* 
                   In a real app, we'd use Leaflet or Google Maps here.
                   Since no map provider is installed, we simulate the relative positions
                   within a bounds box for visualization.
                */}
                <div className="absolute inset-0 flex items-center justify-center">
                   <p className="text-[120px] font-black text-muted-foreground/5 uppercase select-none">SITE MAP</p>
                </div>

                {locations.map((guard, idx) => (
                  <div 
                    key={guard.employee_id}
                    className="absolute transition-all duration-1000 group cursor-pointer"
                    style={{ 
                      // Pseudo-random but deterministic placement based on coords for demo
                      left: `${30 + (idx * 15) % 40}%`,
                      top: `${20 + (idx * 20) % 60}%`
                    }}
                  >
                    <div className="relative flex flex-col items-center">
                       <div className="h-10 w-10 rounded-full bg-white shadow-xl ring-2 ring-primary flex items-center justify-center z-10 hover:scale-110 transition-transform">
                          <User className="h-5 w-5 text-primary" />
                          {/* Pulse Effect */}
                          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 scale-150" />
                       </div>
                       <div className="mt-2 bg-background/95 backdrop-blur-sm px-2 py-1 rounded border shadow-sm text-center">
                          <p className="text-[10px] font-extrabold truncate max-w-[100px]">{guard.guard_name}</p>
                          <p className="text-[8px] text-muted-foreground font-bold uppercase">
                             {formatDistanceToNow(new Date(guard.tracked_at))} ago
                          </p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar List */}
          <div className="p-4 bg-background">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-4 tracking-widest flex items-center justify-between">
              On-Site Personnel
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {locations.map((guard) => (
                <div key={guard.employee_id} className="group p-3 rounded-lg border bg-muted/5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{guard.guard_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {new Date(guard.tracked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[9px] font-bold border-t pt-2 border-dashed">
                    <span className="text-muted-foreground uppercase">Coords</span>
                    <span className="text-primary/70">{guard.latitude.toFixed(4)}, {guard.longitude.toFixed(4)}</span>
                  </div>
                </div>
              ))}
              {locations.length === 0 && !isLoading && (
                <p className="text-[10px] text-center text-muted-foreground py-8 italic">No active trackers</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
