"use client";

import { useBuyerRequests } from "@/hooks/useBuyerRequests";
import { useBuyerInvoices } from "@/hooks/useBuyerInvoices";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Activity, ShieldCheck, RefreshCw, XCircle, MessageSquare, Wallet } from "lucide-react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { formatCurrency } from "@/src/lib/utils/currency";
import { cn } from "@/lib/utils";

const SERVICE_IMAGE_VERSION = "20260326-real-images-v2";

const requestServiceTiles = [
  {
    name: "Security Services",
    href: "/buyer/requests/new?category=security",
    imageSrc: "/ServiceImages/Security_Guard.png",
    imageClassName: "object-cover",
  },
  {
    name: "Housekeeping",
    href: "/buyer/requests/new?category=housekeeping",
    imageSrc: "/ServiceImages/Housekeeping.png",
    imageClassName: "object-cover",
  },
  {
    name: "AC Maintenance & Repair",
    href: "/buyer/requests/new?category=ac",
    imageSrc: "/ServiceImages/AC Maint.png",
    imageClassName: "object-cover",
  },
  {
    name: "Pest Control",
    href: "/buyer/requests/new?category=pest_control",
    imageSrc: "/ServiceImages/Pest Control.png",
    imageClassName: "object-cover",
  },
  {
    name: "Printing & Advertising",
    href: "/buyer/requests/new?category=printing",
    imageSrc: "/ServiceImages/Printing.png",
    imageClassName: "object-cover",
  },
  {
    name: "Stationery Supplies",
    href: "/buyer/requests/new?category=stationery",
    imageSrc: "/ServiceImages/Stationary.png",
    imageClassName: "object-cover",
  },
  {
    name: "Corporate Gifting",
    href: "/buyer/requests/new?category=gifting",
    imageSrc: "/ServiceImages/Corporate Gifting.png",
    imageClassName: "object-cover",
  },
  {
    name: "Pantry & Beverages",
    href: "/buyer/requests/new?category=pantry",
    imageSrc: "/ServiceImages/Pantry_&_Beverages.png",
    imageClassName: "object-cover",
  },
  {
    name: "Cleaning Essentials",
    href: "/buyer/requests/new?category=cleaning",
    imageSrc: "/ServiceImages/Cleaning Essientials.png",
    imageClassName: "object-cover",
  },
  {
    name: "Security Panel Materials",
    href: "/buyer/requests/new?category=security_materials",
    imageSrc: "/ServiceImages/Security Panel Material.png",
    imageClassName: "object-cover",
  },
  {
    name: "Pest Control Supplies",
    href: "/buyer/requests/new?category=pest_supplies",
    imageSrc: "/ServiceImages/Pest Control Materials.png",
    imageClassName: "object-cover",
  },
  {
    name: "Eco-Friendly Disposables",
    href: "/buyer/requests/new?category=eco_disposable",
    imageSrc: "/ServiceImages/EcoFriendly disposables.png",
    imageClassName: "object-cover",
  },
];

export default function BuyerDashboard() {
  const { requests, isLoading: isLoadingRequests } = useBuyerRequests();
  const { invoices, isLoading: isLoadingInvoices } = useBuyerInvoices();

  // Metrics
  // Conceptual ongoing services
  const activeServices = requests.filter(r => ['accepted', 'po_issued', 'po_dispatched', 'material_received', 'completed'].includes(r.status));
  const activeServicesCount = activeServices.length;
  const pendingRequestsCount = requests.filter(r => ['pending', 'indent_generated', 'indent_forwarded'].includes(r.status)).length;
  
  // Dynamic metric for expiring soon (within 30 days)
  const endingSoonCount = activeServices.filter(r => {
    const endDate = addDays(new Date(r.created_at), (r.duration_months || 1) * 30);
    const daysUntilEnd = (endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return daysUntilEnd > 0 && daysUntilEnd <= 30;
  }).length;

  const stats = [
    {
      title: "Ongoing Services",
      value: activeServicesCount,
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
      value: endingSoonCount,
      icon: AlertCircle,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10"
    }
  ];

  const activeServicesList = activeServices
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      category: r.category_name || "General Service",
      role: r.title || "Personnel",
      headcount: r.headcount || 1,
      shift: r.shift || "Standard (9AM - 5PM)",
      startDate: new Date(r.created_at),
      endDate: addDays(new Date(r.created_at), (r.duration_months || 1) * 30),
      status: "Active"
    }));

  const unpaidInvoices = invoices.filter(i => i.payment_status !== 'paid');

  return (
    <div className="space-y-8 pb-8">
      {/* REQUEST SERVICES */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Our Best Services</h2>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Real uploaded service images
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {requestServiceTiles.map((service) => (
            <Link key={service.name} href={service.href} className="group block h-full">
              <Card className="h-full overflow-hidden border border-border/60 bg-card/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl">
                <div className="relative aspect-[4/5] overflow-hidden">
                  {/* Using direct img tags here avoids stale next/image optimizer/cache issues for these local service tiles. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${service.imageSrc}?v=${SERVICE_IMAGE_VERSION}`}
                    alt={service.name}
                    loading="lazy"
                    className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105", service.imageClassName)}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                </div>
                <CardContent className="p-3">
                  <h3 className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {service.name}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
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
                  <p className="text-sm text-muted-foreground mt-1 mb-4">You don&apos;t have any ongoing service deployments right now.</p>
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
              <Button variant="secondary" className="w-full justify-start font-medium h-10 bg-white/10 hover:bg-white/20 text-white border-none" onClick={() => alert("Ticket creation modal would open here.")}>
                <MessageSquare className="mr-2 h-4 w-4" /> Raise a Ticket
              </Button>
              <Button variant="secondary" className="w-full justify-start font-medium h-10 bg-white/10 hover:bg-white/20 text-white border-none" onClick={() => alert("Service cancellation flow would start here.")}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel a Service
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
