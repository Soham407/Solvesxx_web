"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { TrendingUp, Users, Building2, Briefcase, DollarSign, Globe, Award, ShieldCheck, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMDStats } from "@/hooks/useMDStats";
import { ComingSoonChart, ComingSoonCard } from "@/components/shared/ComingSoon";

export function MDDashboard() {
  const [mounted, setMounted] = useState(false);
  const { stats, isLoading: isLoadingStats } = useMDStats();

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold ">Strategic Hub (Company MD)</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Enterprise growth, operational health, and workforce overview.</p>
        </div>
        <div className="flex gap-2">
            <Button className="gap-2 font-bold shadow-lg shadow-primary/20 bg-primary">
                <Globe className="h-4 w-4" /> Global Reporting
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
          {[
              { 
                label: "Active Societies", 
                value: isLoadingStats ? "..." : stats.activeSocieties.toString(), 
                change: "Operational sites", 
                icon: Building2, 
                bg: "bg-primary",
                real: true
              },
              { 
                label: "Force Strength", 
                value: isLoadingStats ? "..." : stats.totalEmployees.toLocaleString(), 
                change: "Total employees", 
                icon: Users, 
                bg: "bg-warning",
                real: true
              },
              { 
                label: "Guard Strength", 
                value: isLoadingStats ? "..." : stats.guardStrength.toLocaleString(), 
                change: "Security personnel", 
                icon: ShieldCheck, 
                bg: "bg-info",
                real: true
              },
              { 
                label: "Annual Revenue", 
                value: "Coming Soon", 
                change: "Financial tracking", 
                icon: DollarSign, 
                bg: "bg-success",
                real: false
              },
          ].map((stat, i) => (
              <Card key={i} className={cn(
                "border-none shadow-card ring-1 ring-border p-4 bg-muted/20 premium-card-hover cursor-pointer group",
                !stat.real && "opacity-70"
              )}>
                  <div className="flex items-center gap-4 text-left">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg shadow-black/5 text-white", stat.bg)}>
                          <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-xl font-bold">{stat.value}</span>
                          <span className="text-[11px] font-black uppercase text-muted-foreground tracking-widest leading-none mt-1">{stat.label}</span>
                          <span className={cn(
                            "text-xs font-bold mt-1",
                            stat.real ? "text-success" : "text-muted-foreground"
                          )}>
                            {stat.change}
                          </span>
                      </div>
                  </div>
              </Card>
          ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-card ring-1 ring-border">
              <CardHeader className="bg-muted/5 border-b pb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold uppercase ">Growth Forecast</CardTitle>
                            <CardDescription className="text-xs">Financial analytics and revenue projections.</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-bold border-muted-foreground/20 text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" /> Coming Soon
                        </Badge>
                    </div>
              </CardHeader>
              <CardContent className="pt-8">
                  <ComingSoonChart height={300} />
              </CardContent>
          </Card>

          <div className="space-y-6">
              <Card className="border-none shadow-premium bg-linear-to-br from-indigo-600 to-indigo-800 text-white p-6">
                  <div className="flex flex-col gap-6 text-left">
                      <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                          <h3 className="text-lg font-bold uppercase ">Compliance Score</h3>
                          <p className="text-xs text-indigo-100/70 font-medium">PSARA & ESIC standards tracking.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-white/50" />
                        <span className="text-sm font-medium">Coming Soon</span>
                      </div>
                      <Button className="w-full bg-white/10 text-white hover:bg-white/20 font-bold uppercase text-xs tracking-widest mt-2 h-10" disabled>
                        Audit History
                      </Button>
                  </div>
              </Card>

              <ComingSoonCard 
                title="Financial Metrics" 
                description="Revenue tracking, top clients, and financial performance indicators will be available once financial modules are implemented."
              />
          </div>
      </div>
    </div>
  );
}
