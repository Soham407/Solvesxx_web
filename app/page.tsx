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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const PORTALS = [
  {
    icon: Building2,
    role: "Admin",
    emoji: "🏢",
    description: "Full oversight — dashboards, reports, approvals, compliance",
    color: "from-blue-500/10 to-blue-600/5 border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    icon: Shield,
    role: "Guard",
    emoji: "🛡️",
    description: "Visitor logging, SOS panic alerts, GPS attendance, patrol checklists",
    color: "from-slate-500/10 to-slate-600/5 border-slate-200",
    iconColor: "text-slate-600",
  },
  {
    icon: ShoppingCart,
    role: "Buyer",
    emoji: "🛒",
    description: "Service requests, purchase orders, invoices, vendor feedback",
    color: "from-violet-500/10 to-violet-600/5 border-violet-200",
    iconColor: "text-violet-600",
  },
  {
    icon: Truck,
    role: "Supplier",
    emoji: "🚚",
    description: "Indent responses, PO fulfilment, bill submission, delivery tracking",
    color: "from-orange-500/10 to-orange-600/5 border-orange-200",
    iconColor: "text-orange-600",
  },
  {
    icon: Home,
    role: "Resident",
    emoji: "🏠",
    description: "Visitor invitations, facility requests, issue reporting",
    color: "from-emerald-500/10 to-emerald-600/5 border-emerald-200",
    iconColor: "text-emerald-600",
  },
  {
    icon: Package,
    role: "Delivery",
    emoji: "📦",
    description: "Material arrival logging with photo enforcement and GRN sync",
    color: "from-amber-500/10 to-amber-600/5 border-amber-200",
    iconColor: "text-amber-600",
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
  { name: "Supply Chain", desc: "Indent → PO → GRN → Bill reconciliation" },
  { name: "Security & Visitors", desc: "4 visitor types, panic SOS, guard patrol" },
  { name: "HRMS", desc: "Attendance, payroll, leave, recruitment, BGV" },
  { name: "Services", desc: "AC, pest control, plantation, printing & ads" },
  { name: "Asset Management", desc: "QR-coded assets, maintenance scheduling" },
  { name: "Finance", desc: "Reconciliation, ledger, PSARA compliance, budgeting" },
  { name: "Inventory", desc: "Products, warehouses, reorder alerts, RTV tickets" },
  { name: "Reports Hub", desc: "Financial, attendance, inventory, service reports" },
];

const TECH_STACK = [
  { name: "Next.js 16", detail: "App Router + SSR" },
  { name: "Supabase", detail: "Postgres + Auth + Realtime + Edge Functions" },
  { name: "TailwindCSS", detail: "shadcn/ui component library" },
  { name: "TypeScript", detail: "Full-stack type safety" },
  { name: "PWA", detail: "Offline-capable Guard mobile app" },
  { name: "Row-Level Security", detail: "Multi-role access isolation" },
];

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
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg text-foreground">FacilityPro</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="hidden sm:flex text-[10px] uppercase font-bold tracking-wider">
                Building in Public
              </Badge>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <a href="#waitlist">
                <Button size="sm">
                  Get Early Access <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-primary/5 via-primary/3 to-transparent" />
          <div className="absolute right-0 top-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute left-0 bottom-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 text-[10px] uppercase font-bold tracking-widest bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              🚧 Building in Public · Day 1 of 90
            </Badge>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight mb-6">
              One Platform.
              <br />
              <span className="bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent">
                Every Facility Role.
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              FacilityPro replaces WhatsApp groups and Excel sheets with a unified enterprise platform —
              built for Guards, Admins, Buyers, Suppliers, Residents, and Delivery teams.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-12 text-sm text-muted-foreground">
              {["14 Dashboards", "92 Hooks", "Zero Mock Data", "Realtime Alerts", "Offline PWA"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {item}
                </span>
              ))}
            </div>

            {/* Waitlist form */}
            <div id="waitlist" className="max-w-xl mx-auto">
              {status === "success" ? (
                <div className="flex items-center gap-3 bg-success/10 border border-success/20 rounded-xl px-6 py-4 text-success font-medium">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  {message}
                </div>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 text-base"
                  />
                  <Input
                    type="email"
                    placeholder="Work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={status === "loading"}
                    className="h-12 px-8 whitespace-nowrap"
                  >
                    {status === "loading" ? "Joining..." : "Get Early Access"}
                  </Button>
                </form>
              )}
              {status === "error" && (
                <p className="mt-2 text-sm text-destructive">{message}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                No spam. Get notified when we launch. Join{" "}
                <span className="font-semibold text-foreground">facility managers</span> already on the list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-1.5 opacity-70" />
                <div className="font-heading text-3xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold">
                The Problem
              </Badge>
              <h2 className="font-heading text-4xl font-bold text-foreground mb-6 leading-tight">
                Facility managers run on
                <span className="text-destructive"> chaos</span>
              </h2>
              <div className="space-y-4 text-muted-foreground">
                {[
                  { icon: "💬", text: "Security guard logs? WhatsApp groups." },
                  { icon: "📊", text: "Vendor purchase orders? Excel sheets." },
                  { icon: "📝", text: "Visitor records? Paper registers." },
                  { icon: "📱", text: "Panic alerts? Phone calls in the dark." },
                  { icon: "🧾", text: "Bill reconciliation? Manual, error-prone, weekly." },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <span className="text-base line-through decoration-destructive/50">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold bg-success/10 text-success border-success/20">
                The Solution
              </Badge>
              <h2 className="font-heading text-4xl font-bold text-foreground mb-6 leading-tight">
                One platform.
                <span className="text-primary"> Zero confusion.</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: "✅", text: "Guard logs visitors on mobile — synced in real-time" },
                  { icon: "✅", text: "Buyer clicks once — PO auto-sent to supplier" },
                  { icon: "✅", text: "SOS panic triggers instant alerts to all managers" },
                  { icon: "✅", text: "Bill submitted → auto-matched to PO and GRN" },
                  { icon: "✅", text: "Every role sees only what they need" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <span className="text-base text-foreground font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Portals */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold">
              Role-Based Portals
            </Badge>
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
              Six roles. Six portals. One platform.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every person in your facility gets a customized view — exactly what they need, nothing they don't.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PORTALS.map(({ icon: Icon, role, emoji, description, color, iconColor }) => (
              <div
                key={role}
                className={`relative p-6 rounded-2xl bg-gradient-to-br border ${color} hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div>
                    <span className="text-lg mr-1">{emoji}</span>
                    <span className="font-heading font-bold text-foreground">{role} Portal</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold">
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
            {MODULES.map(({ name, desc }) => (
              <div
                key={name}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="font-heading font-semibold text-foreground text-sm">{name}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-[10px] uppercase font-bold">
              Tech Stack
            </Badge>
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
              Built for scale from day one
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Modern, proven technologies — chosen for reliability, not hype.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TECH_STACK.map(({ name, detail }) => (
              <div
                key={name}
                className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Code2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-foreground text-sm">{name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Building in Public CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
            <div className="relative">
              <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/20 text-[10px] uppercase font-bold tracking-widest">
                90 Days · Building in Public
              </Badge>
              <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Watch it get built.
                <br />
                Day by day.
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">
                I'm documenting every technical decision, every bug, and every milestone — publicly, on LinkedIn.
                Follow the journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" variant="secondary" className="h-12 px-8">
                    Follow on LinkedIn <Globe className="ml-2 w-4 h-4" />
                  </Button>
                </a>
                <a href="#waitlist">
                  <Button
                    size="lg"
                    className="h-12 px-8 bg-white text-primary hover:bg-white/90 border-0"
                  >
                    Join the Waitlist <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Waitlist */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            Be first to know when we launch
          </h2>
          <p className="text-muted-foreground mb-8">
            Join facility managers, ops teams, and building management companies getting early access.
          </p>
          {status === "success" ? (
            <div className="flex items-center justify-center gap-3 bg-success/10 border border-success/20 rounded-xl px-6 py-4 text-success font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {message}
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base text-center"
              />
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
                <Button type="submit" size="lg" disabled={status === "loading"} className="h-12 px-8">
                  {status === "loading" ? "..." : "Join"}
                </Button>
              </div>
              {status === "error" && (
                <p className="text-sm text-destructive">{message}</p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground">FacilityPro</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            One platform. Every facility role. Built in public, 90 days.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-sm text-muted-foreground">
              #BuildInPublic
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
