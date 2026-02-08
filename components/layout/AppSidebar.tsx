"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Wrench,
  Home,
  Receipt,
  Ticket,
  BarChart3,
  Settings,
  ChevronDown,
  Shield,
  UserCheck,
  ClipboardList,
  Calendar,
  FileText,
  Truck,
  ShoppingCart,
  AlertTriangle,
  Thermometer,
  Bug,
  Printer,
  DoorOpen,
  BellRing,
  Phone,
  CreditCard,
  Wallet,
  BookOpen,
  Menu,
  LogOut,
  Moon,
  Sun,
  LayoutGrid,
  Settings2,
  HardDrive,
  ClipboardCheck,
  Hammer,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; href: string }[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        title: "Company",
        href: "/company",
        icon: Building2,
        children: [
          { title: "Roles", href: "/company/roles" },
          { title: "Designations", href: "/company/designations" },
          { title: "Employees", href: "/company/employees" },
          { title: "Users", href: "/company/users" },
          { title: "Locations", href: "/company/locations" },
        ],
      },
      {
        title: "HRMS",
        href: "/hrms",
        icon: Users,
        children: [
          { title: "Recruitment", href: "/hrms/recruitment" },
          { title: "Employee Profiles", href: "/hrms/profiles" },
          { title: "Attendance Tracking", href: "/hrms/attendance" },
          { title: "Leave Management", href: "/hrms/leave" },
          { title: "Payroll Ledger", href: "/hrms/payroll" },
          { title: "Compliance Vault", href: "/hrms/documents" },
          { title: "Holiday Master", href: "/hrms/holidays" },
          { title: "Company Events", href: "/hrms/events" },
          { title: "Specialized Profiles", href: "/hrms/specialized-profiles" },
          { title: "Shift Master", href: "/hrms/shifts" },
          { title: "Leave Config", href: "/hrms/leave/config" },
        ],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Assets",
        href: "/assets",
        icon: HardDrive,
        children: [
          { title: "All Assets", href: "/assets" },
          { title: "Maintenance Schedules", href: "/assets/maintenance" },
          { title: "Asset Categories", href: "/assets/categories" },
        ],
      },
      {
        title: "Service Requests",
        href: "/service-requests",
        icon: ClipboardCheck,
        children: [
          { title: "All Requests", href: "/service-requests" },
          { title: "Create Request", href: "/service-requests/new" },
        ],
      },
      {
        title: "My Jobs",
        href: "/service-boy",
        icon: Hammer,
      },
      {
        title: "Inventory",
        href: "/inventory",
        icon: Package,
        children: [
          { title: "Product Master", href: "/inventory/products" },
          { title: "Categories", href: "/inventory/categories" },
          { title: "Subcategories", href: "/inventory/subcategories" },
          { title: "Warehouses", href: "/inventory/warehouses" },
          { title: "Stock Levels", href: "/inventory/stock" },
          { title: "Supplier Mapping", href: "/inventory/supplier-products" },
          { title: "Purchase Rates", href: "/inventory/supplier-rates" },
          { title: "Sale Rates", href: "/inventory/sales-rates" },
          { title: "Supplier Master", href: "/inventory/suppliers" },
          { title: "Purchase Orders", href: "/inventory/purchase-orders" },
          { title: "Internal Indents", href: "/inventory/indents/create" },
          { title: "Indent Verification", href: "/inventory/indents/verification" },
        ],
      },
      {
        title: "Services",
        href: "/services",
        icon: Wrench,
        children: [
          { title: "Checklist Config", href: "/services/masters/checklists" },
          { title: "Work Library", href: "/services/masters/tasks" },
          { title: "Vendor Auth", href: "/services/masters/vendor-services" },
          { title: "Service Mapping", href: "/services/masters/service-tasks" },
          { title: "Security Operations", href: "/services/security" },
          { title: "AC Maintenance", href: "/services/ac" },
          { title: "Plantation Services", href: "/services/plantation" },
          { title: "Pest Control", href: "/services/pest-control" },
          { title: "Housekeeping", href: "/services/housekeeping" },
          { title: "Printing & Ads", href: "/services/printing" },
        ],
      },
      {
        title: "Society",
        href: "/society",
        icon: Home,
        children: [
          { title: "Resident Database", href: "/society/residents" },
          { title: "Visitor Log", href: "/society/visitors" },
          { title: "Panic Response", href: "/society/panic-alerts" },
          { title: "Daily Checklists", href: "/society/checklists" },
          { title: "Emergency Directory", href: "/society/emergency" },
        ],
      },
      {
        title: "Resident Portal",
        href: "/society/my-flat",
        icon: UserCheck,
        children: [
          { title: "Dashboard", href: "/society/my-flat" },
          { title: "Invite Visitor", href: "/society/my-flat?action=invite" },
        ],
      },
    ],
  },
  {
    title: "Finance & Audit",
    items: [
      {
        title: "Finance",
        href: "/finance",
        icon: Receipt,
        children: [
          { title: "Buyer Billing", href: "/finance/buyer-billing" },
          { title: "Reconciliation Hub", href: "/finance/reconciliation" },
          { title: "Performance Audit", href: "/finance/performance-audit" },
          { title: "Supplier Bills", href: "/finance/supplier-bills" },
          { title: "Payments Tracker", href: "/finance/payments" },
          { title: "General Ledger", href: "/finance/ledger" },
        ],
      },
      {
        title: "Incident Tickets",
        href: "/tickets",
        icon: Ticket,
        children: [
          { title: "Behavioral Incident", href: "/tickets/behavior" },
          { title: "Material Quality", href: "/tickets/quality" },
          { title: "Material Returns", href: "/tickets/returns" },
        ],
      },
      {
        title: "Analytics Hub",
        href: "/reports",
        icon: BarChart3,
        children: [
          { title: "Attendance Analysis", href: "/reports/attendance" },
          { title: "Financial Health", href: "/reports/financial" },
          { title: "Service Excellence", href: "/reports/services" },
          { title: "Inventory Burn", href: "/reports/inventory" },
        ],
      },
    ],
  },
  {
    title: "System Control",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        children: [
          { title: "Company Profile", href: "/settings/company" },
          { title: "Permissions Matrix", href: "/settings/permissions" },
          { title: "Notification Engine", href: "/settings/notifications" },
          { title: "System Branding", href: "/settings/branding" },
        ],
      },
    ],
  },
];


interface AppSidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
  className?: string;
  isMobile?: boolean;
}

export function AppSidebar({ collapsed, onToggle, className, isMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Auto-open groups containing the current path
    const groupsToOpen: string[] = [];
    navigation.forEach((group) => {
      group.items.forEach((item) => {
        if (
          item.children?.some((child) => pathname?.startsWith(child.href)) ||
          pathname?.startsWith(item.href)
        ) {
          groupsToOpen.push(item.title);
        }
      });
    });
    setOpenGroups(groupsToOpen);
  }, [pathname]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "bg-sidebar transition-all duration-300 border-sidebar-border",
        !isMobile ? "fixed left-0 top-0 z-40 h-screen border-r hidden lg:block" : "h-full w-full",
        !isMobile && (collapsed ? "w-16" : "w-64"),
        className
      )}
    >
      {/* Logo Section & Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {collapsed ? (
          <div className="flex h-full w-full items-center justify-center">
             {onToggle && (
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                >
                  <Menu className="h-4 w-4" />
                </Button>
             )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shadow-lg shadow-sidebar-primary/20">
                <span className="text-base font-bold text-sidebar-primary-foreground">F</span>
              </div>
              <div className="flex flex-col gap-0">
                <span className="text-sm font-extrabold text-sidebar-foreground leading-none">FacilityPro</span>
                <span className="text-[11px] text-sidebar-primary uppercase font-black tracking-wider opacity-90">Enterprise</span>
              </div>
            </div>
            {onToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all active:scale-90"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-3 space-y-6">
          {navigation.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <h4 className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.15em] text-sidebar-foreground/40">
                  {group.title}
                </h4>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.title}>
                    {item.children ? (
                      <Collapsible
                        open={openGroups.includes(item.title)}
                        onOpenChange={() => toggleGroup(item.title)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div
                            className={cn(
                              "nav-item w-full cursor-pointer",
                              isActive(item.href) ? "nav-item-active" : "nav-item-inactive"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <item.icon className="h-4 w-4 shrink-0" />
                              {!collapsed && <span className="truncate">{item.title}</span>}
                            </div>
                            {!collapsed && (
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition-transform opacity-60",
                                  openGroups.includes(item.title) && "rotate-180"
                                )}
                              />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        {!collapsed && (
                          <CollapsibleContent className="pl-9 space-y-1 mt-1">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "block py-2 px-3 text-sm rounded-md transition-all duration-200",
                                  pathname === child.href
                                    ? "text-sidebar-primary-foreground font-extrabold bg-sidebar-primary flex items-center before:content-[''] before:w-1 before:h-4 before:bg-sidebar-primary-foreground before:mr-2 before:rounded-full shadow-lg shadow-sidebar-primary/20"
                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 pl-6 font-medium"
                                )}
                              >
                                {child.title}
                              </Link>
                            ))}
                          </CollapsibleContent>
                        )}
                      </Collapsible>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "nav-item",
                          isActive(item.href) ? "nav-item-active" : "nav-item-inactive"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent/10 border border-sidebar-border/30 h-[58px]">
          {mounted && !collapsed && (
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-sidebar-foreground">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
              <span className="text-[11px] text-sidebar-foreground/40 uppercase font-black tracking-tight">Theme Switch</span>
            </div>
          )}
          {mounted && (
            <div className="flex items-center">
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                className="data-[state=unchecked]:bg-sidebar-muted/20 data-[state=checked]:bg-sidebar-primary"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
