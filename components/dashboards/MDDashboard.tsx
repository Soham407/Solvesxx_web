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
import { motion } from "framer-motion";

// Animation variants for staggered cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

export function MDDashboard() {
  const [mounted, setMounted] = useState(false);
  const { stats, isLoading: isLoadingStats } = useMDStats();

  useEffect(() => { setMounted(true); }, []);

  const statCards = [
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
  ];

  return (
    <div className="space-y-8 pb-10">
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight">Strategic Hub (Company MD)</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Enterprise growth, operational health, and workforce overview.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="glow" className="gap-2 font-semibold">
                <Globe className="h-4 w-4" /> Global Reporting
            </Button>
        </div>
      </motion.div>

      <motion.div 
        className="grid gap-6 md:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={cardVariants}>
            <Card className={cn(
              "border-none shadow-sm ring-1 ring-border p-4 bg-card premium-card-hover cursor-pointer group corner-accent",
              !stat.real && "opacity-70"
            )}>
              <div className="flex items-center gap-4 text-left">
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow text-white",
                  stat.bg
                )}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight">{stat.value}</span>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider leading-none mt-1">{stat.label}</span>
                  <span className={cn(
                    "text-xs font-medium mt-1",
                    stat.real ? "text-success" : "text-muted-foreground"
                  )}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        className="grid gap-6 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-border overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold uppercase tracking-wide">Growth Forecast</CardTitle>
                <CardDescription className="text-xs">Financial analytics and revenue projections.</CardDescription>
              </div>
              <Badge variant="outline" className="font-medium border-muted-foreground/20 text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" /> Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <ComingSoonChart height={300} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="flex flex-col gap-6 text-left relative z-10">
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold uppercase tracking-wide">Compliance Score</h3>
                <p className="text-xs text-indigo-100/70 font-medium">PSARA & ESIC standards tracking.</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-white/50" />
                <span className="text-sm font-medium">Coming Soon</span>
              </div>
              <Button className="w-full bg-white/10 text-white hover:bg-white/20 font-semibold uppercase text-xs tracking-wider mt-2 h-10 border border-white/10" disabled>
                Audit History
              </Button>
            </div>
          </Card>

          <ComingSoonCard 
            title="Financial Metrics" 
            description="Revenue tracking, top clients, and financial performance indicators will be available once financial modules are implemented."
          />
        </div>
      </motion.div>
    </div>
  );
}
