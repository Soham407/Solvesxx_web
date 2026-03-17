"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Building2, Package, Ticket, TrendingUp, AlertCircle, Clock, 
  ArrowUpRight, ArrowDownRight, CheckCircle2, Shield, UserCircle,
  Calculator, Truck, ShoppingCart, Shovel, Settings2, Briefcase, Wrench,
  Search,
  LayoutDashboard,
  Home,
  Loader2,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMDStats } from "@/hooks/useMDStats";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useReorderAlerts } from "@/hooks/useReorderAlerts";
import { useAuth } from "@/hooks/useAuth";

// Import all role dashboards
import { GuardDashboard } from "@/components/dashboards/GuardDashboard";
import { SocietyManagerDashboard } from "@/components/dashboards/SocietyManagerDashboard";
import { BuyerDashboard } from "@/components/dashboards/BuyerDashboard";
import { SupplierDashboard } from "@/components/dashboards/SupplierDashboard";
import { DeliveryDashboard } from "@/components/dashboards/DeliveryDashboard";
import { ServiceBoyDashboard } from "@/components/dashboards/ServiceBoyDashboard";
import { AccountsDashboard } from "@/components/dashboards/AccountsDashboard";
import { SecuritySupervisorDashboard } from "@/components/dashboards/SecuritySupervisorDashboard";
import { HODDashboard } from "@/components/dashboards/HODDashboard";
import { MDDashboard } from "@/components/dashboards/MDDashboard";
import { ResidentDashboard } from "@/components/dashboards/ResidentDashboard";
import { StorekeeperDashboard } from "@/components/dashboards/StorekeeperDashboard";
import { SiteSupervisorDashboard } from "@/components/dashboards/SiteSupervisorDashboard";

const roles = [
  { id: "admin", label: "Admin", icon: Shield },
  { id: "company_md", label: "Company MD", icon: TrendingUp },
  { id: "company_hod", label: "Company HOD", icon: Briefcase },
  { id: "account", label: "Account", icon: Calculator },
  { id: "delivery_boy", label: "Delivery Boy", icon: Truck },
  { id: "buyer", label: "Buyer", icon: ShoppingCart },
  { id: "supplier", label: "Supplier / Vendor", icon: Package },
  { id: "storekeeper", label: "Storekeeper", icon: Package },
  { id: "site_supervisor", label: "Site Supervisor", icon: Building2 },
  { id: "security_guard", label: "Security Guard", icon: Shield },
  { id: "security_supervisor", label: "Security Supervisor", icon: UserCircle },

  { id: "society_manager", label: "Society Manager", icon: Building2 },
  { id: "service_boy", label: "Service Boy", icon: Wrench },
  { id: "resident", label: "Resident", icon: Home },
  { id: "super_admin", label: "Super Admin", icon: Shield },
  { id: "ac_technician", label: "AC Technician", icon: Wrench },
  { id: "pest_control_technician", label: "Pest Control Technician", icon: Shovel },
];

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const { role } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("admin");

  // Redirect portal roles to their dedicated pages — avoids duplicate dashboard
  useEffect(() => {
    if (role === "buyer") router.replace("/buyer");
    else if (role === "supplier" || role === "vendor") router.replace("/supplier");
    else if (role === "resident") router.replace("/test-resident");
  }, [role, router]);

  // Automatically set the selected role to the user's actual role on load
  useEffect(() => {
    if (role) {
      setSelectedRole(role);
    }
  }, [role]);

  const renderDashboard = () => {
    switch (selectedRole) {
      case "company_md": return <MDDashboard />;
      case "company_hod": return <HODDashboard />;
      case "account": return <AccountsDashboard />;
      case "delivery_boy": return <DeliveryDashboard />;
      case "buyer": return <BuyerDashboard />;
      case "supplier":
      case "vendor": return <SupplierDashboard />;
      case "security_guard": return <GuardDashboard />;
      case "security_supervisor": return <SecuritySupervisorDashboard />;
      case "storekeeper": return <StorekeeperDashboard />;
      case "site_supervisor": return <SiteSupervisorDashboard />;
      case "society_manager": return <SocietyManagerDashboard />;
      case "service_boy": return <ServiceBoyDashboard />;
      case "resident": return <ResidentDashboard />;
      case "super_admin": return <AdminView />;
      case "ac_technician": return <ServiceBoyDashboard />;
      case "pest_control_technician": return <ServiceBoyDashboard />;
      default: return <AdminView />;
    }
  };

  return (
    <div className="space-y-4">


      {/* Role Selection Bar - 🔒 Admin Only */}
      {role === "admin" && (
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md pb-4 pt-1 mb-6 border-b">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                   <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                   </div>
                   <span className="font-bold uppercase text-sm text-primary">Admin Control Center</span>
                </div>
                <div className="flex items-center gap-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest hidden md:flex items-center gap-1 cursor-help">
                            <Shield className="h-3 w-3" />
                            Security Context Switcher:
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs">Authorized for Administrators only. This allows you to audit the UI state of different stakeholder roles.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="w-[180px] h-9 text-xs font-bold border-primary/30 bg-primary/5">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id} className="text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <role.icon className="h-3 w-3" />
                              {role.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
           key={selectedRole}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.2 }}
        >
          {renderDashboard()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Sub-components for the main Admin View (re-purposed from original dashboard)
function AdminView() {
  const { stats: mdStats, isLoading: isLoadingStats } = useMDStats();
  const { requests, isLoading: isLoadingRequests } = useServiceRequests({ status: ["open", "assigned"] });
  const { alerts, isLoading: isLoadingAlerts } = useReorderAlerts();
  const [chartMounted, setChartMounted] = useState(false);
  useEffect(() => { setChartMounted(true); }, []);

  const isLoading = isLoadingStats || isLoadingRequests || isLoadingAlerts;

  const stats = [
    { 
      title: "Total Employees", 
      value: isLoadingStats ? "..." : mdStats.totalEmployees.toLocaleString(), 
      change: "Active staff", 
      trend: "up" as const, 
      icon: Users, 
      color: "text-white", 
      bg: "bg-blue-600",
      real: true
    },
    { 
      title: "Active Societies", 
      value: isLoadingStats ? "..." : mdStats.activeSocieties.toString(), 
      change: "Sites", 
      trend: "up" as const, 
      icon: Building2, 
      color: "text-white", 
      bg: "bg-emerald-600",
      real: true
    },
    { 
      title: "Pending Tickets", 
      value: isLoadingRequests ? "..." : (requests?.length || 0).toString(), 
      change: "Open requests", 
      trend: "down" as const, 
      icon: Ticket, 
      color: "text-white", 
      bg: "bg-amber-600",
      real: true
    },
    { 
      title: "Stock Alerts", 
      value: isLoadingAlerts ? "..." : (alerts?.length || 0).toString(), 
      change: "Need attention", 
      trend: alerts?.length > 0 ? "up" as const : "down" as const, 
      icon: Package, 
      color: "text-white", 
      bg: alerts?.length > 0 ? "bg-red-600" : "bg-purple-600",
      real: true
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <Card className="col-span-4 p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </Card>
            ) : (
              stats.map((stat) => (
                <Card key={stat.title} className="hover:shadow-lg transition-all border-none shadow-card premium-card-hover group cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110 duration-300 shadow-lg shadow-black/10", stat.bg)}>
                        <stat.icon className={cn("h-6 w-6", stat.color)} />
                      </div>
                      <div className={cn("flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full", 
                        stat.trend === "up" ? "text-success bg-success/10" : "text-critical bg-critical/10"
                      )}>
                        {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {stat.change}
                      </div>
                    </div>
                    <div className="mt-4 text-left">
                      <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em]">{stat.title}</h3>
                      <div className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-none shadow-card">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 border-b py-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Revenue Analytics</CardTitle>
                  <Button variant="ghost" size="sm" className="text-[10px] font-bold">Details</Button>
              </CardHeader>
              <CardContent className="pt-6">
                {!chartMounted || isLoadingStats ? (
                  <div className="h-[300px] w-full bg-muted/5 animate-pulse rounded-xl" />
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mdStats.monthlyTrends || []}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(value: number, name: string) => [`₹${(value/100).toLocaleString('en-IN')}`, name === 'revenue' ? 'Revenue' : 'Expenses']} />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                        <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" strokeDasharray="4 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-none shadow-card">
               <CardHeader className="bg-muted/5 border-b py-4">
                   <CardTitle className="text-sm font-bold uppercase tracking-widest">System Alerts</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4 pt-6">
                   {isLoadingAlerts ? (
                     <div className="flex items-center justify-center p-4">
                       <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                     </div>
                   ) : alerts && alerts.length > 0 ? (
                     alerts.slice(0, 2).map((alert) => (
                       <div key={alert.id} className={cn(
                         "flex items-start gap-4 p-4 rounded-xl border-l-4",
                         alert.priority === "critical" || alert.priority === "high" 
                           ? "bg-critical/5 border-critical" 
                           : "bg-warning/5 border-warning"
                       )}>
                            <AlertCircle className={cn(
                              "h-5 w-5 shrink-0 mt-0.5",
                              alert.priority === "critical" || alert.priority === "high" 
                                ? "text-critical" 
                                : "text-warning"
                            )} />
                            <div className="text-left">
                                <p className={cn(
                                  "text-sm font-bold",
                                  alert.priority === "critical" || alert.priority === "high" 
                                    ? "text-critical" 
                                    : "text-warning"
                                )}>
                                  {alert.alertType === "out_of_stock" ? "Stock Out" : "Low Stock"}: {alert.productName}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {alert.warehouseName} • Current: {alert.currentStock}
                                </p>
                            </div>
                       </div>
                     ))
                   ) : (
                     <div className="flex items-start gap-4 p-4 rounded-xl bg-success/5 border-l-4 border-success">
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          <div className="text-left">
                              <p className="text-sm font-bold text-success">All Systems Normal</p>
                              <p className="text-xs text-muted-foreground font-medium">No critical alerts at this time.</p>
                          </div>
                     </div>
                   )}
                   
                   {isLoadingAlerts ? null : (
                     <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border-l-4 border-primary">
                          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="text-left">
                              <p className="text-sm font-bold text-primary">License Tracking</p>
                              <p className="text-xs text-muted-foreground font-medium">PSARA renewals managed via Compliance Module.</p>
                          </div>
                     </div>
                   )}
               </CardContent>
            </Card>
        </div>
    </div>
  );
}

