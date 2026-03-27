"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Layers,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BRAND_DOMAIN,
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  BRAND_PORTAL_LABEL,
  BRAND_TAGLINE,
} from "@/src/lib/brand";

const stats = [
  { value: "Security", label: "Guarding, surveillance, and command center workflows" },
  { value: "Maintenance", label: "AC servicing, housekeeping, and vendor coordination" },
  { value: "Hygiene", label: "Pest control, cleaning chemicals, and consumables" },
  { value: "Infrastructure", label: "Procurement, staffing, billing, and service oversight" },
];

const services = [
  {
    title: "Security and Housekeeping",
    description:
      "Operational planning, staffing oversight, and on-site execution in one connected interface.",
    image: "/ServiceImages/Security_Guard.png",
  },
  {
    title: "Air Conditioner Supply and Maintenance",
    description:
      "Track service requests, assignments, inventory usage, and technician delivery proof.",
    image: "/ServiceImages/AC Maint.png",
  },
  {
    title: "Commercial Cleaning Chemicals",
    description:
      "Procure, issue, and reconcile eco-friendly cleaning inventory with full traceability.",
    image: "/ServiceImages/Cleaning Essientials.png",
  },
  {
    title: "Hot and Cold Beverages",
    description:
      "Coordinate pantry supplies, beverage machines, and repeat service fulfillment.",
    image: "/ServiceImages/Pantry_&_Beverages.png",
  },
  {
    title: "Pest Control",
    description:
      "Plan treatment schedules, log chemical usage, and capture before/after work evidence.",
    image: "/ServiceImages/Pest Control.png",
  },
  {
    title: "Corporate Gifting and Printing",
    description:
      "Handle branded supplies, print jobs, and vendor delivery milestones with less follow-up.",
    image: "/ServiceImages/Corporate Gifting.png",
  },
];

const capabilities = [
  {
    icon: Shield,
    title: "Role-based facility operations",
    body: "Buyers, suppliers, managers, guards, and field teams all work from views tailored to their decisions.",
  },
  {
    icon: ClipboardCheck,
    title: "Service workflow visibility",
    body: "Move from request to assignment, execution, billing, and follow-through without relying on side channels.",
  },
  {
    icon: BarChart3,
    title: "Executive reporting",
    body: "Turn attendance, procurement, service performance, and finance into usable leadership dashboards.",
  },
  {
    icon: Layers,
    title: "Unified control layer",
    body: "Connect people, material, and service operations across residential and enterprise facilities.",
  },
];

const steps = [
  {
    title: "Raise and route requests",
    body: "Service, staffing, and supply requirements enter through the right portal and land with the right team automatically.",
  },
  {
    title: "Coordinate execution",
    body: "Track assignments, vendor responses, field proof, checklists, and delivery updates from one timeline.",
  },
  {
    title: "Close with accountability",
    body: "Finish with documented service status, finance visibility, and audit-ready operational records.",
  },
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
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-border/70 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="w-14 shrink-0 rounded-[1.2rem] bg-secondary p-2.5 ring-1 ring-border/70 sm:w-16 sm:rounded-[1.35rem] sm:p-3">
              <BrandLogo className="w-full" priority />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-warning sm:text-[11px] sm:tracking-[0.3em]">
                {BRAND_LEGAL_NAME}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-primary sm:text-lg">
                {BRAND_NAME}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-full px-5 text-primary sm:w-auto"
              >
                Sign In
              </Button>
            </Link>
            <a href="#waitlist">
              <Button size="sm" className="w-full rounded-full px-5 sm:w-auto">
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="brand-shell relative overflow-hidden px-4 pb-24 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-bl-[5rem] bg-[linear-gradient(145deg,#c3a257,#f2e08a)]" />
          <div className="absolute bottom-0 right-0 h-52 w-52 rounded-tl-[6rem] bg-primary/92" />
          <div className="absolute left-[8%] top-[18%] h-64 w-64 rounded-full bg-warning/18 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge className="mb-5 bg-warning/15 text-warning hover:bg-warning/15">
              Integrated Facility Operations
            </Badge>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.94] text-primary sm:text-6xl lg:text-[4.4rem]">
              Powerful solutions for
              <br />
              service-driven facilities.
            </h1>
            <p className="mt-6 text-2xl font-medium text-primary sm:text-3xl">
              Powerful Solutions for Total Facility Excellence.
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Integrated facility operations, workforce coordination, procurement,
              and service management for modern enterprises. SOLVESXX brings service
              excellence and operational control into one premium, role-aware
              platform.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#waitlist">
                <Button size="lg" className="rounded-full px-8">
                  Book a walkthrough
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/login">
                <Button variant="outline" size="lg" className="rounded-full px-8">
                  Enter the portal
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {stats.map((item) => (
                <div
                  key={item.value}
                  className="rounded-[1.5rem] border border-border/70 bg-white/88 px-5 py-4 shadow-sm"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-warning">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="brand-surface brand-cut-corner overflow-hidden p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#c3a257,#f2e08a)]" />
              <div className="rounded-[2rem] border border-primary/10 bg-[linear-gradient(155deg,#0a3f63,#0e527f)] p-6 text-white shadow-[0_28px_80px_-44px_rgba(10,63,99,0.7)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sidebar-primary/90">
                      {BRAND_PORTAL_LABEL}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-white">
                      One command layer for service operations.
                    </h2>
                  </div>
                  <div className="rounded-[1.25rem] bg-white px-4 py-3 shadow-xl">
                    <BrandLogo className="w-16" priority />
                  </div>
                </div>

                <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Live portal view</p>
                      <p className="mt-1 text-xs text-white/70">{BRAND_DOMAIN}/dashboard</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-sidebar-primary">
                      <Sparkles className="h-4 w-4" />
                      Brand-aligned workflow UI
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      { icon: Shield, label: "Guard operations" },
                      { icon: Users, label: "Workforce planning" },
                      { icon: BriefcaseBusiness, label: "Vendor coordination" },
                      { icon: Wrench, label: "Service tracking" },
                    ].map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-[1.15rem] border border-white/10 bg-white/8 px-4 py-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c3a257,#f2e08a)] text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-white">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-secondary/65 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">
                  Signature lines
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Security | Maintenance | Hygiene | Infrastructure. The same visual
                  language now carries from the brochure into the operational product.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Our Best Services
            </Badge>
            <h2 className="text-4xl font-semibold text-primary sm:text-5xl">
              Service capability with operational discipline.
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              SOLVESXX pairs real-world facility service delivery with a digital control
              layer for execution, approvals, reporting, and accountability.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="brand-surface overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/11]">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    unoptimized
                    sizes="(min-width: 1280px) 30rem, (min-width: 768px) 45vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/55 via-primary/5 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-semibold text-primary">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/65 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <Badge variant="secondary" className="mb-4">
                Platform Capabilities
              </Badge>
              <h2 className="text-4xl font-semibold text-primary sm:text-5xl">
                Built for buyers, suppliers, managers, and field teams.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                The SOLVESXX portal turns operational complexity into structured
                execution with shared visibility across people, inventory, finance,
                and service delivery.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, body }) => (
                <div key={title} className="brand-surface p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c3a257,#f2e08a)] text-primary shadow-glow">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-primary">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              How It Works
            </Badge>
            <h2 className="text-4xl font-semibold text-primary sm:text-5xl">
              Structured execution from request to closure.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="brand-surface p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                    <span className="text-sm font-semibold">0{index + 1}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-warning" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-primary">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="waitlist" className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="brand-navy-panel brand-cut-corner overflow-hidden rounded-[2rem] px-8 py-10 shadow-[0_30px_90px_-44px_rgba(10,63,99,0.68)] sm:px-12 sm:py-14">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <Badge className="bg-white/12 text-white hover:bg-white/12">
                  Request a Demo
                </Badge>
                <h2 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
                  Bring brochure confidence into daily operations.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-white/76">
                  {BRAND_NAME} helps facility leaders coordinate services, teams,
                  procurement, and reporting with more control and less follow-up.
                </p>
                <div className="mt-6 flex items-center gap-3 text-sm text-white/78">
                  <CheckCircle2 className="h-4 w-4 text-sidebar-primary" />
                  Live walkthroughs for facility, procurement, and service teams
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-6 backdrop-blur-sm">
                {status === "success" ? (
                  <div className="flex items-start gap-3 rounded-[1.35rem] bg-white px-5 py-4 text-sm text-primary shadow-lg">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                    <div>
                      <p className="font-semibold">You&apos;re on the list.</p>
                      <p className="mt-1 text-muted-foreground">{message}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleWaitlist} className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 rounded-2xl border-white/20 bg-white text-foreground"
                    />
                    <Input
                      type="email"
                      placeholder="Work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-2xl border-white/20 bg-white text-foreground"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#c3a257,#f2e08a)] text-primary hover:opacity-95"
                    >
                      {status === "loading" ? "Sending..." : "Request SOLVESXX walkthrough"}
                    </Button>
                  </form>
                )}

                {status === "error" && (
                  <p className="mt-3 text-sm text-red-200">{message}</p>
                )}

                <div className="mt-6 rounded-[1.35rem] border border-white/12 bg-primary/35 px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-white">
                    <Bell className="h-4 w-4 text-sidebar-primary" />
                    Launch updates and demo scheduling only. No spam.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-white/72 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-14 shrink-0 rounded-[1.2rem] bg-secondary p-3 ring-1 ring-border/70">
              <BrandLogo className="w-full" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{BRAND_NAME}</p>
              <p className="truncate text-xs text-muted-foreground">{BRAND_LEGAL_NAME}</p>
            </div>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {BRAND_TAGLINE}. A premium operations portal for security, maintenance,
            hygiene, infrastructure, and service-led facility teams.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full rounded-full px-6 sm:w-auto">
              Enter {BRAND_NAME}
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
