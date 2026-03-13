"use client";

import { useBuyerRequests, REQUEST_STATUS_CONFIG } from "@/hooks/useBuyerRequests";
import { useBuyerInvoices, PAYMENT_STATUS_CONFIG } from "@/hooks/useBuyerInvoices";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, Clock, AlertCircle, Activity, ShieldCheck, RefreshCw, XCircle, MessageSquare, Wallet, Paintbrush, Wind, Bug, Printer, LayoutGrid, Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { formatCurrency } from "@/src/lib/utils/currency";

const quickServices = [
  { name: "Security", icon: ShieldCheck, color: "text-indigo-600", bgColor: "bg-indigo-100", href: "/buyer/requests/new?category=security", desc: "Guards & Patrols" },
  { name: "Housekeeping", icon: Paintbrush, color: "text-emerald-600", bgColor: "bg-emerald-100", href: "/buyer/requests/new?category=housekeeping", desc: "Cleaning & Staff" },
  { name: "AC Maintenance", icon: Wind, color: "text-cyan-600", bgColor: "bg-cyan-100", href: "/buyer/requests/new?category=ac", desc: "Repair & Service" },
  { name: "Pest Control", icon: Bug, color: "text-rose-600", bgColor: "bg-rose-100", href: "/buyer/requests/new?category=pest_control", desc: "Fumigation" },
];

const allServicesCatalog = [
  { category: "Facilities & Maintenance", items: [
      { name: "Security Services", icon: ShieldCheck, href: "/buyer/requests/new?category=security" },
      { name: "Housekeeping", icon: Paintbrush, href: "/buyer/requests/new?category=housekeeping" },
      { name: "AC Maintenance & Repair", icon: Wind, href: "/buyer/requests/new?category=ac" },
      { name: "Pest Control", icon: Bug, href: "/buyer/requests/new?category=pest_control" },
  ]},
  { category: "Corporate & Office", items: [
      { name: "Printing & Advertising", icon: Printer, href: "/buyer/requests/new?category=printing" },
      { name: "Stationery Supplies", icon: LayoutGrid, href: "/buyer/requests/new?category=stationery" },
      { name: "Corporate Gifting", icon: LayoutGrid, href: "/buyer/requests/new?category=gifting" },
      { name: "Pantry & Beverages", icon: LayoutGrid, href: "/buyer/requests/new?category=pantry" },
  ]},
];

export default function BuyerDashboard() {
  const { requests, isLoading: isLoadingRequests } = useBuyerRequests();
  const { invoices, isLoading: isLoadingInvoices } = useBuyerInvoices();
  const [searchQuery, setSearchQuery] = useState("");

  // Metrics
  // MOCK: We consider accepted/po_dispatched/completed as conceptually "ongoing" for the purpose of the dashboard Demo
  const activeServicesCount = requests.filter(r => ['accepted', 'po_issued', 'po_dispatched', 'material_received', 'completed'].includes(r.status)).length;
  const pendingRequestsCount = requests.filter(r => ['pending', 'indent_generated', 'indent_forwarded'].includes(r.status)).length;
  const endingSoonCount = Math.max(0, activeServicesCount - 2); // Mocked metric for "Expiring Soon"

  const stats = [
    {
      title: "Ongoing Services",
      value: activeServicesCount || 3, // fallback if empty for display
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Waiting for Approval",
      value: pendingRequestsCount,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      title: "Ending Soon",
      value: endingSoonCount || 1, // fallback
      icon: AlertCircle,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10"
    }
  ];

  // Derived Active Services (Mocking some shifts and dates for UI demonstration as per PRD)
  const activeServicesList = requests
    .filter(r => ['accepted', 'completed', 'po_dispatched'].includes(r.status))
    .slice(0, 4)
    .map((r, i) => ({
      id: r.id,
      category: r.category_name || "Security Services",
      role: r.title || "Grade A Guards",
      headcount: (i + 1) * 2,
      shift: i % 2 === 0 ? "Morning (8AM - 8PM)" : "Night (8PM - 8AM)",
      startDate: new Date(r.created_at),
      endDate: addDays(new Date(r.created_at), 30 * (i + 1)), // Mocking 1-3 months duration
      status: "Active"
    }));

  const unpaidInvoices = invoices.filter(i => i.payment_status !== 'paid');

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Manage your ongoing services, requests, and bills.</p>
        </div>
        <Link href="/buyer/requests/new">
          <Button className="gap-2 shadow-sm rounded-full px-6">
            <Plus className="h-4 w-4" /> Request Service
          </Button>
        </Link>
      </div>

      {/* METRICS */}
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-md overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${stat.color}`}>
              <stat.icon className="h-24 w-24 -mr-4 -mt-4" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QUICK SERVICES */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Request a Service</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickServices.map((service, i) => (
            <Link key={i} href={service.href}>
              <Card className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group h-full bg-card">
                <CardContent className="p-5 flex flex-col items-center text-center justify-center gap-3">
                  <div className={`p-4 rounded-2xl ${service.bgColor} ${service.color} group-hover:scale-110 transition-transform duration-300`}>
                    <service.icon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{service.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{service.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Browse All Services Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Card className="border border-dashed shadow-none hover:shadow-sm transition-all hover:-translate-y-1 cursor-pointer group h-full bg-slate-50/50 hover:bg-slate-50">
                <CardContent className="p-5 flex flex-col items-center text-center justify-center gap-3">
                  <div className="p-4 rounded-2xl bg-slate-100 text-slate-600 group-hover:scale-110 group-hover:bg-slate-200 transition-all duration-300">
                    <LayoutGrid className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">Browse All</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">View full catalog</p>
                  </div>
                </CardContent>
              </Card>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-hidden flex flex-col px-0 border-l border-border">
              <SheetHeader className="px-6 pb-2">
                <SheetTitle className="text-2xl font-bold">Service Catalog</SheetTitle>
                <SheetDescription>Browse or search all available services.</SheetDescription>
              </SheetHeader>
              
              <div className="px-6 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search for a service..." 
                    className="pl-9 bg-muted/50 focus-visible:bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 scrollbar-thin">
                {allServicesCatalog.map((section, idx) => {
                  const filteredItems = section.items.filter(item => 
                    item.name.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={idx} className="space-y-3">
                      <h4 className="text-sm font-bold tracking-wider uppercase text-muted-foreground/80">{section.category}</h4>
                      <div className="space-y-2">
                        {filteredItems.map((item, i) => (
                          <Link key={i} href={item.href} className="block group">
                            <div className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  <item.icon className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-sm group-hover:text-foreground transition-colors">{item.name}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Current Services */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Current Services
                </CardTitle>
                <CardDescription>Your active service deployments.</CardDescription>
              </div>
              <Link href="/buyer/requests">
                <Button variant="outline" size="sm" className="rounded-full">View All</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingRequests ? (
                <div className="p-8 text-center text-muted-foreground">Loading services...</div>
              ) : activeServicesList.length > 0 ? (
                <div className="divide-y">
                  {activeServicesList.map((service) => (
                    <div key={service.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base">{service.category}</h4>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-normal text-xs py-0">
                            {service.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{service.role}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Activity className="h-3 w-3"/> {service.headcount} Personnel</span>
                          <span className="text-border">•</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {service.shift}</span>
                          <span className="text-border">•</span>
                          <span>Until {format(service.endDate, 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end w-full sm:w-auto mt-2 sm:mt-0">
                        <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-start text-xs h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <RefreshCw className="h-3 w-3 mr-2" /> Renew
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-base font-medium">No active services.</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">You don't have any ongoing service deployments right now.</p>
                  <Link href="/buyer/requests/new">
                    <Button>Request a Service</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Bills & Actions */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Wallet className="h-5 w-5 text-primary" /> Pending Bills
              </CardTitle>
              <CardDescription>Invoices waiting for your payment.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingInvoices ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading bills...</div>
              ) : unpaidInvoices.length > 0 ? (
                <div className="divide-y">
                  {unpaidInvoices.slice(0, 4).map((inv) => (
                    <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">Due: {format(new Date(inv.invoice_date || new Date()), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(inv.total_amount)}</p>
                        <Link href={`/buyer/invoices`}>
                          <span className="text-xs text-primary hover:underline font-medium cursor-pointer">Pay Now</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center mb-2">
                    <Wallet className="h-5 w-5 text-success" />
                  </div>
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">You have no pending bills.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Need Assistance?</CardTitle>
              <CardDescription className="text-slate-300">Quick actions for your services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 mt-2">
              <Button variant="secondary" className="w-full justify-start font-medium h-10 bg-white/10 hover:bg-white/20 text-white border-none">
                <MessageSquare className="mr-2 h-4 w-4" /> Raise a Ticket
              </Button>
              <Button variant="secondary" className="w-full justify-start font-medium h-10 bg-white/10 hover:bg-white/20 text-white border-none">
                <XCircle className="mr-2 h-4 w-4" /> Cancel a Service
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
