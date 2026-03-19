"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Shield,
  ShoppingCart,
  Truck,
  Home,
  Package,
  ArrowRight,
  CheckCircle2,
  Zap,
  Database,
  Code2,
  Bell,
  BarChart3,
  Users,
  FileText,
  Layers,
  Globe,
  ChevronRight,
  Wrench,
  DollarSign,
  Warehouse,
  Cpu,
  Smartphone,
  Lock,
  ClipboardList,
  TrendingUp,
  Activity,
  AlertTriangle,
  FileBarChart,
  Send,
  CheckCheck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Data ────────────────────────────────────────────────────────────────────

const PORTALS = [
  {
    icon: Building2,
    role: "Admin",
    emoji: "🏢",
    description: "Full oversight — dashboards, reports, approvals, compliance",
    features: ["14 live dashboards", "Role & access control", "Audit trails"],
    color: "from-blue-500/10 to-blue-600/5 border-blue-200/60",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    glowColor: "hover:shadow-blue-100",
  },
  {
    icon: Shield,
    role: "Guard",
    emoji: "🛡️",
    description: "Visitor logging, SOS panic alerts, GPS attendance, patrol checklists",
    features: ["SOS panic button", "GPS clock-in/out", "Visitor QR scan"],
    color: "from-slate-500/10 to-slate-600/5 border-slate-200/60",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    glowColor: "hover:shadow-slate-100",
  },
  {
    icon: ShoppingCart,
    role: "Buyer",
    emoji: "🛒",
    description: "Service requests, purchase orders, invoices, vendor feedback",
    features: ["1-click PO creation", "Invoice matching", "Vendor ratings"],
    color: "from-violet-500/10 to-violet-600/5 border-violet-200/60",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    glowColor: "hover:shadow-violet-100",
  },
  {
    icon: Truck,
    role: "Supplier",
    emoji: "🚚",
    description: "Indent responses, PO fulfilment, bill submission, delivery tracking",
    features: ["Respond to indents", "Bill submission", "Delivery tracking"],
    color: "from-orange-500/10 to-orange-600/5 border-orange-200/60",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    glowColor: "hover:shadow-orange-100",
  },
  {
    icon: Home,
    role: "Resident",
    emoji: "🏠",
    description: "Visitor invitations, facility requests, issue reporting",
    features: ["Pre-approve visitors", "Raise facility requests", "Track issues"],
    color: "from-emerald-500/10 to-emerald-600/5 border-emerald-200/60",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    glowColor: "hover:shadow-emerald-100",
  },
  {
    icon: Package,
    role: "Delivery",
    emoji: "📦",
    description: "Material arrival logging with photo enforcement and GRN sync",
    features: ["Photo-enforced logging", "GRN auto-sync", "Delivery history"],
    color: "from-amber-500/10 to-amber-600/5 border-amber-200/60",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    glowColor: "hover:shadow-amber-100",
  },
];

const STATS = [
  { value: "14", label: "Dashboards", icon: BarChart3 },
  { value: "92", label: "React Hooks", icon: Code2 },
  { value: "21+", label: "DB Migrations", icon: Database },
  { value: "6", label: "Role Portals", icon: Users },
  { value: "8", label: "Edge Functions", icon: Zap },
  { value: "0", label: "Mock Data", icon: CheckCircle2 },
];

const MODULES = [
  { name: "Supply Chain", desc: "Indent → PO → GRN → Bill reconciliation", icon: Truck },
  { name: "Security & Visitors", desc: "4 visitor types, panic SOS, guard patrol", icon: Shield },
  { name: "HRMS", desc: "Attendance, payroll, leave, recruitment, BGV", icon: Users },
  { name: "Services", desc: "AC, pest control, plantation, printing & ads", icon: Wrench },
  { name: "Asset Management", desc: "QR-coded assets, maintenance scheduling", icon: Cpu },
  { name: "Finance", desc: "Reconciliation, ledger, PSARA compliance, budgeting", icon: DollarSign },
  { name: "Inventory", desc: "Products, warehouses, reorder alerts, RTV tickets", icon: Warehouse },
  { name: "Reports Hub", desc: "Financial, attendance, inventory, service reports", icon: FileBarChart },
];

const TECH_STACK = [
  { name: "Next.js 16", detail: "App Router + SSR + Server Components", icon: Globe },
  { name: "Supabase", detail: "Postgres + Auth + Realtime + Edge Functions", icon: Database },
  { name: "TailwindCSS", detail: "shadcn/ui component library", icon: Layers },
  { name: "TypeScript", detail: "Full-stack type safety, zero any", icon: Code2 },
  { name: "PWA", detail: "Offline-capable Guard mobile app", icon: Smartphone },
  { name: "Row-Level Security", detail: "Multi-role access isolation via Postgres RLS", icon: Lock },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Request",
    desc: "Buyer raises a service request or indent. Guard logs a visitor. Resident pre-approves a delivery — all from their dedicated portal.",
    icon: ClipboardList,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    step: "02",
    title: "Approve",
    desc: "Admin reviews in real-time. One click to approve, reject, or escalate. Notifications reach every stakeholder instantly.",
    icon: CheckCheck,
    color: "text-violet-600",
    bg: "bg-violet-100",
  },
  {
    step: "03",
    title: "Track",
    desc: "Every action is logged, every bill auto-matched, every delivery verified with photos. Full audit trail across all roles.",
    icon: Activity,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveActivityCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  time,
  dotColor,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
  dotColor: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-white border border-border/60 rounded-xl p-3.5 shadow-sm">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] text-muted-foreground">{time}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You're on the waitlist!");
        setEmail("");
        setName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg text-foreground tracking-tight">
                FacilityPro
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="hidden sm:flex text-[10px] uppercase font-bold tracking-wider gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Building in Public
              </Badge>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <a href="#waitlist">
                <Button size="sm" className="shadow-sm">
                  Get Early Access <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          {/* Dot grid */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.035]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="currentColor" className="text-foreground" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </svg>
          {/* Gradient blobs */}
          <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-primary/6 via-primary/2 to-transparent" />
          <div className="absolute right-1/4 top-10 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[80px]" />
          <div className="absolute -left-20 bottom-0 w-80 h-80 bg-violet-500/6 rounded-full blur-[60px]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — Copy + Form */}
            <div className="text-center lg:text-left">
              <Badge className="mb-6 inline-flex text-[10px] uppercase font-bold tracking-widest bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Building in Public · Day 1 of 90
              </Badge>

              <h1 className="font-heading text-5xl sm:text-6xl lg:text-[64px] font-bold text-foreground leading-[1.05] tracking-tight mb-6">
                One Platform.
                <br />
                <span className="bg-gradient-to-r from-primary via-orange-500 to-violet-600 bg-clip-text text-transparent">
                  Every Facility Role.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                FacilityPro replaces WhatsApp groups and Excel sheets with a unified enterprise platform
                built for Guards, Admins, Buyers, Suppliers, Residents, and Delivery teams.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 mb-10 text-sm text-muted-foreground">
                {["14 Dashboards", "92 Hooks", "Zero Mock Data", "Realtime Alerts", "Offline PWA"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      {item}
                    </span>
                  )
                )}
              </div>

              {/* Waitlist form */}
              <div id="waitlist" className="max-w-lg mx-auto lg:mx-0">
                {status === "success" ? (
                  <div className="flex items-center gap-3 bg-success/10 border border-success/20 rounded-xl px-5 py-4 text-success font-medium text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    {message}
                  </div>
                ) : (
                  <form onSubmit={handleWaitlist} className="space-y-2.5">
                    <div className="flex gap-2.5">
                      <Input
                        type="text"
                        placeholder="Your name (optional)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 text-sm bg-white border-border/70"
                      />
                      <Input
                        type="email"
                        placeholder="Work email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 text-sm bg-white border-border/70"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={status === "loading"}
                      className="w-full h-11 shadow-sm font-semibold"
                    >
                      {status === "loading" ? "Joining..." : "Get Early Access →"}
                    </Button>
                  </form>
                )}
                {status === "error" && (
                  <p className="mt-2 text-xs text-destructive">{message}</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground text-center lg:text-left">
                  No spam. Get notified at launch. Join{" "}
                  <span className="font-semibold text-foreground">facility managers</span> already on
                  the list.
                </p>
              </div>
            </div>

            {/* Right — Live activity cards visual */}
            <div className="relative hidden lg:block">
              {/* Decorative blobs */}
              <div className="absolute -top-8 -right-8 w-56 h-56 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />

              {/* Browser chrome mockup */}
              <div className="relative bg-white border border-border/60 rounded-2xl shadow-xl overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-3 h-6 bg-muted/60 rounded-md flex items-center px-3">
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      app.facilitypro.in/dashboard
                    </span>
                  </div>
                </div>

                {/* Dashboard preview area */}
                <div className="p-5 bg-background/40">
                  {/* Mini header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Live Activity</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">All facilities · Today</div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-success font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Live
                    </div>
                  </div>

                  {/* Activity feed */}
                  <div className="space-y-2.5">
                    <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
                      <LiveActivityCard
                        icon={AlertTriangle}
                        iconBg="bg-red-100"
                        iconColor="text-red-600"
                        title="SOS Alert — Guard Zone B"
                        subtitle="All managers notified instantly"
                        time="Just now"
                        dotColor="bg-red-500 animate-pulse"
                      />
                    </div>
                    <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
                      <LiveActivityCard
                        icon={CheckCircle2}
                        iconBg="bg-green-100"
                        iconColor="text-green-600"
                        title="PO #1042 Approved · ₹45,000"
                        subtitle="Auto-sent to supplier"
                        time="3 min ago"
                        dotColor="bg-green-500"
                      />
                    </div>
                    <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
                      <LiveActivityCard
                        icon={Package}
                        iconBg="bg-blue-100"
                        iconColor="text-blue-600"
                        title="GRN Received · 48 items"
                        subtitle="Bill matched to PO automatically"
                        time="12 min ago"
                        dotColor="bg-blue-500"
                      />
                    </div>
                    <div className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
                      <LiveActivityCard
                        icon={Users}
                        iconBg="bg-violet-100"
                        iconColor="text-violet-600"
                        title="Visitor pre-approved · R. Mehta"
                        subtitle="QR code sent to resident"
                        time="18 min ago"
                        dotColor="bg-violet-500"
                      />
                    </div>
                    <div className="animate-fade-in-up" style={{ animationDelay: "320ms" }}>
                      <LiveActivityCard
                        icon={Bell}
                        iconBg="bg-amber-100"
                        iconColor="text-amber-600"
                        title="Reorder Alert · Cleaning Supplies"
                        subtitle="Stock below threshold — action required"
                        time="34 min ago"
                        dotColor="bg-amber-500"
                      />
                    </div>
                  </div>

                  {/* Mini stats row */}
                  <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-3 gap-3">
                    {[
                      { label: "Open POs", val: "12" },
                      { label: "Visitors Today", val: "47" },
                      { label: "Alerts", val: "3" },
                    ].map(({ label, val }) => (
                      <div key={label} className="text-center">
                        <div className="font-heading font-bold text-base text-foreground">{val}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white border border-border/60 rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-success/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-foreground">Zero downtime</div>
                  <div className="text-[9px] text-muted-foreground">Supabase Realtime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border/30">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center py-6 px-4 bg-background hover:bg-muted/20 transition-colors duration-200"
              >
                <Icon className="w-5 h-5 text-primary mb-2 opacity-80" />
                <div className="font-heading text-3xl font-bold text-foreground tracking-tight">
                  {value}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem vs Solution ────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold tracking-wider">
              Why FacilityPro
            </Badge>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Facility teams deserve better
              <br />
              than <span className="text-destructive">WhatsApp & Excel</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before */}
            <div className="relative rounded-2xl border border-destructive/20 bg-destructive/3 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-3xl" />
              <Badge className="mb-5 bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase font-bold hover:bg-destructive/10">
                The Problem
              </Badge>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-6 leading-tight">
                Managers run on chaos
              </h3>
              <div className="space-y-4">
                {[
                  { icon: "💬", text: "Security guard logs? WhatsApp groups." },
                  { icon: "📊", text: "Vendor purchase orders? Excel sheets." },
                  { icon: "📝", text: "Visitor records? Paper registers." },
                  { icon: "📱", text: "Panic alerts? Phone calls in the dark." },
                  { icon: "🧾", text: "Bill reconciliation? Manual, error-prone, weekly." },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-lg shrink-0">{icon}</span>
                    <span className="text-sm line-through decoration-destructive/40 leading-relaxed">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="relative rounded-2xl border border-success/20 bg-success/3 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-bl-3xl" />
              <Badge className="mb-5 bg-success/10 text-success border-success/20 text-[10px] uppercase font-bold hover:bg-success/10">
                The Solution
              </Badge>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-6 leading-tight">
                One platform. Zero confusion.
              </h3>
              <div className="space-y-4">
                {[
                  "Guard logs visitors on mobile — synced in real-time",
                  "Buyer clicks once — PO auto-sent to supplier",
                  "SOS panic triggers instant alerts to all managers",
                  "Bill submitted → auto-matched to PO and GRN",
                  "Every role sees only what they need",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground font-medium leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold tracking-wider">
              How It Works
            </Badge>
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
              From request to resolution in minutes
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every workflow is designed to reduce friction and eliminate manual follow-ups.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line (desktop) */}
            <div className="hidden lg:block absolute top-12 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="grid lg:grid-cols-3 gap-8">
              {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon, color, bg }) => (
                <div key={step} className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="relative mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shadow-sm border border-border/30`}
                    >
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                      <span className="text-[9px] font-bold text-muted-foreground">{step}</span>
                    </div>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-3">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Six Portals ────────────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold tracking-wider">
              Role-Based Portals
            </Badge>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Six roles. Six portals.
              <br />
              One platform.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every person in your facility gets a customized view — exactly what they need, nothing they
              don't.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PORTALS.map(({ icon: Icon, role, emoji, description, features, color, iconBg, iconColor }) => (
              <div
                key={role}
                className={`group relative p-6 rounded-2xl bg-gradient-to-br border ${color} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}
                    >
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{emoji}</span>
                        <span className="font-heading font-bold text-foreground text-sm">{role} Portal</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{description}</p>

                {/* Features */}
                <div className="space-y-1.5 pt-4 border-t border-border/30">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${iconBg.replace("bg-", "bg-").replace("/100", "-500")} shrink-0`}
                        style={{ background: iconColor.replace("text-", "").replace("-600", "") }} />
                      <span className="text-[11px] text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Modules ────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold tracking-wider">
              Feature Modules
            </Badge>
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
              Everything a facility needs
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              14 dashboards covering every operational domain — all connected, all real-time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map(({ name, desc, icon: Icon }) => (
              <div
                key={name}
                className="group p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div
                  className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors duration-200"
                >
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground text-sm mb-1.5">{name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ─────────────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold tracking-wider">
              Tech Stack
            </Badge>
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
              Built for scale from day one
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Modern, proven technologies — chosen for reliability, not hype.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {TECH_STACK.map(({ name, detail, icon: Icon }) => (
              <div
                key={name}
                className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-semibold text-foreground text-sm">{name}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Building in Public CTA ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/20 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-10 sm:p-14 text-center overflow-hidden">
            {/* Pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative">
              <Badge className="mb-6 inline-flex bg-white/15 text-white border-white/25 hover:bg-white/15 text-[10px] uppercase font-bold tracking-widest gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                90 Days · Building in Public
              </Badge>
              <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Watch it get built.
                <br />
                Day by day.
              </h2>
              <p className="text-lg text-white/75 mb-4 max-w-xl mx-auto">
                I'm documenting every technical decision, every bug, and every milestone — publicly on
                LinkedIn. Follow the journey.
              </p>

              {/* Progress bar */}
              <div className="max-w-xs mx-auto mb-8">
                <div className="flex justify-between text-[10px] text-white/60 mb-1.5">
                  <span>Day 1</span>
                  <span>Day 90</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/80 rounded-full"
                    style={{ width: "1.1%" }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 px-8 bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    Follow on LinkedIn <Globe className="ml-2 w-4 h-4" />
                  </Button>
                </a>
                <a href="#waitlist">
                  <Button
                    size="lg"
                    className="h-12 px-8 bg-white text-primary hover:bg-white/90 border-0 font-semibold"
                  >
                    Join the Waitlist <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer Waitlist ────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            Be first to know when we launch
          </h2>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Join facility managers, ops teams, and building management companies getting early access.
            No spam — just launch day updates.
          </p>
          {status === "success" ? (
            <div className="flex items-center justify-center gap-3 bg-success/10 border border-success/20 rounded-xl px-5 py-4 text-success font-medium text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {message}
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col gap-2.5">
              <Input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-sm text-center bg-white"
              />
              <div className="flex gap-2.5">
                <Input
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 text-sm bg-white"
                />
                <Button type="submit" size="lg" disabled={status === "loading"} className="h-11 px-6 shrink-0">
                  {status === "loading" ? "..." : "Join"}
                </Button>
              </div>
              {status === "error" && (
                <p className="text-xs text-destructive">{message}</p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-10 px-4 sm:px-6 lg:px-8 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-heading font-bold text-foreground text-sm">FacilityPro</span>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  Built in public · 90 days
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              One platform. Every facility role. Zero WhatsApp groups.
            </p>

            <div className="flex items-center gap-5">
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <a href="#waitlist" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Get Early Access
              </a>
              <span className="text-xs font-medium text-primary">#BuildInPublic</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
