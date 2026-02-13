"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  Building2,
  Users,
  Package,
  Wrench,
  Home,
  Receipt,
  Ticket,
  BarChart3,
  Shield,
  LayoutDashboard
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
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.altKey)) {
        e.preventDefault();
        setOpen((open) => !open);
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
        className="relative inline-flex items-center rounded-full bg-muted/30 px-9 py-2 text-sm text-muted-foreground transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:w-64 lg:w-80"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <span className="hidden md:inline-flex">Search everything...</span>
        <span className="md:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌥</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="General">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))} className="gap-3 py-3">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/settings"))} className="gap-3 py-3">
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-foreground shadow-sm">
                <Settings className="h-4 w-4" />
              </div>
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Modules">
             {[
               { label: "Company Master", path: "/company", icon: Building2, color: "bg-blue-600" },
               { label: "HRMS Profiles", path: "/hrms/profiles", icon: Users, color: "bg-emerald-600" },
               { label: "Inventory Control", path: "/inventory", icon: Package, color: "bg-purple-600" },
               { label: "Services Library", path: "/services", icon: Wrench, color: "bg-amber-600" },
               { label: "Finance & Billing", path: "/finance", icon: Receipt, color: "bg-indigo-600" },
               { label: "Incident Tickets", path: "/tickets", icon: Ticket, color: "bg-critical" },
               { label: "Analytics Hub", path: "/reports", icon: BarChart3, color: "bg-info" },
             ].map((mod) => (
                <CommandItem key={mod.path} onSelect={() => runCommand(() => router.push(mod.path))} className="gap-3 py-3">
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-sm", mod.color)}>
                    <mod.icon className="h-4 w-4" />
                  </div>
                  <span>{mod.label}</span>
                </CommandItem>
             ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => router.push("/company/employees/create"))} className="gap-3 py-3">
              <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-sm">
                <Users className="h-4 w-4" />
              </div>
              <span>Add New Employee</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/service-requests/new"))} className="gap-3 py-3">
              <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm">
                <Wrench className="h-4 w-4" />
              </div>
              <span>New Service Request</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
