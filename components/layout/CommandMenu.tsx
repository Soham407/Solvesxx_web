"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CreditCard,
  Settings,
  Search,
  Users,
  Package,
  Wrench,
  Home,
  Receipt,
  Ticket,
  BarChart3,
  Shield,
  LayoutDashboard,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [isMac, setIsMac] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));

    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.altKey)) {
        event.preventDefault();
        setOpen((currentOpen) => !currentOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex w-full items-center rounded-full bg-muted/30 px-9 py-2 text-sm text-muted-foreground transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <span className="hidden md:inline-flex">Search everything...</span>
        <span className="md:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">{isMac ? "Cmd" : "Alt"}</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, employees, or tasks..." />
        <CommandList className="max-h-[min(70vh,30rem)]">
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="General Navigation">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard"))}
              className="gap-3 py-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span>Main Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/settings"))}
              className="gap-3 py-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground shadow-sm">
                <Settings className="h-4 w-4" />
              </div>
              <span>System Settings</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Operations & Workforce">
            {[
              {
                label: "Employee Directory",
                path: "/company/employees",
                icon: Users,
                color: "text-emerald-500 bg-emerald-500/10",
              },
              {
                label: "Service Request Queue",
                path: "/service-requests",
                icon: Wrench,
                color: "text-orange-500 bg-orange-500/10",
              },
              {
                label: "Inventory Products",
                path: "/inventory/products",
                icon: Package,
                color: "text-purple-500 bg-purple-500/10",
              },
              {
                label: "Maintenance Schedules",
                path: "/assets/maintenance",
                icon: Calendar,
                color: "text-blue-500 bg-blue-500/10",
              },
              {
                label: "Resident Database",
                path: "/society/residents",
                icon: Home,
                color: "text-indigo-500 bg-indigo-500/10",
              },
              {
                label: "Visitor Tracking",
                path: "/society/visitors",
                icon: Shield,
                color: "text-critical bg-critical/10",
              },
            ].map((module) => (
              <CommandItem
                key={module.path}
                onSelect={() => runCommand(() => router.push(module.path))}
                className="gap-3 py-3"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg shadow-sm",
                    module.color
                  )}
                >
                  <module.icon className="h-4 w-4" />
                </div>
                <span>{module.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Finance & Reporting">
            {[
              {
                label: "Buyer Billing",
                path: "/finance/buyer-billing",
                icon: Receipt,
                color: "text-amber-500 bg-amber-500/10",
              },
              {
                label: "Universal Ledger",
                path: "/finance/payments",
                icon: CreditCard,
                color: "text-cyan-500 bg-cyan-500/10",
              },
              {
                label: "Financial Health Report",
                path: "/reports/financial",
                icon: BarChart3,
                color: "text-info bg-info/10",
              },
              {
                label: "Quality Incident Tickets",
                path: "/tickets/quality",
                icon: Ticket,
                color: "text-pink-500 bg-pink-500/10",
              },
            ].map((module) => (
              <CommandItem
                key={module.path}
                onSelect={() => runCommand(() => router.push(module.path))}
                className="gap-3 py-3"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg shadow-sm",
                    module.color
                  )}
                >
                  <module.icon className="h-4 w-4" />
                </div>
                <span>{module.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Direct Actions">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/company/employees/create"))}
              className="gap-3 py-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Add New Employee</span>
                <span className="text-xs italic text-muted-foreground">HRMS Action</span>
              </div>
              <CommandShortcut>Alt+E</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/service-requests/new"))}
              className="gap-3 py-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Log New Service Request</span>
                <span className="text-xs italic text-muted-foreground">
                  Operations Action
                </span>
              </div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
