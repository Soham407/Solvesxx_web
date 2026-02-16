"use client";

import { motion } from "framer-motion";
import { MapPin, Navigation, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Marker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  status: "active" | "warning" | "error";
}

interface LiveMapProps {
  markers: Marker[];
  className?: string;
}

export function LiveMap({ markers, className }: LiveMapProps) {
  // Simulated map coordinates mapping
  // In a real app, we'd use Leaflet or Google Maps
  return (
    <Card className={cn("relative w-full h-[300px] overflow-hidden bg-slate-900 border-none shadow-2xl", className)}>
      {/* Blueprint Grid Effect */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      {/* Simulated Map Background */}
      <div className="absolute inset-0 bg-linear-to-tr from-indigo-500/10 via-transparent to-purple-500/10" />

      {/* Map Content */}
      <div className="relative h-full w-full p-8 flex items-center justify-center">
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Live GPS Tracking</span>
        </div>

        {/* Simulated Markers */}
        <div className="relative w-full h-full">
            {markers.map((marker, i) => (
                <motion.div
                    key={marker.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="absolute"
                    style={{ 
                        left: `${(marker.lng % 100)}%`, 
                        top: `${(marker.lat % 100)}%` 
                    }}
                >
                    <div className="group relative">
                        <div className={cn(
                            "h-3 w-3 rounded-full ring-4 flex items-center justify-center",
                            marker.status === "active" ? "bg-success ring-success/20" : "bg-warning ring-warning/20"
                        )}>
                            <div className="h-full w-full rounded-full animate-ping bg-inherit opacity-75" />
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-background/90 backdrop-blur-sm border border-border px-3 py-1 shadow-xl rounded-lg whitespace-nowrap">
                                <span className="text-[10px] font-bold">{marker.label}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>

        {/* Center Point - Main HQ */}
        <div className="relative">
            <div className="h-4 w-4 bg-primary rounded-full ring-8 ring-primary/10 flex items-center justify-center">
                <Navigation className="h-2 w-2 text-white" />
            </div>
            <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-muted-foreground uppercase whitespace-nowrap">Central Command</span>
        </div>
      </div>

      {/* Map Controls (Visual Only) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <div className="h-8 w-8 bg-background/80 backdrop-blur-md border border-border rounded-lg flex items-center justify-center text-foreground/60 shadow-sm">+</div>
          <div className="h-8 w-8 bg-background/80 backdrop-blur-md border border-border rounded-lg flex items-center justify-center text-foreground/60 shadow-sm">-</div>
      </div>
    </Card>
  );
}
