"use client";

import { useState, useEffect, useMemo } from "react";
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
  LayoutGrid,
  Settings2,
  HardDrive,
  ClipboardCheck,
  Hammer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// 🔒 Feature Flags - Filter frozen features from navigation
import { 
  isNavItemFrozen, 
  isNavHrefFrozen,
  FEATURE_FUTURE_PHASE 
} from "@/src/lib/featureFlags";
import { useAuth } from "@/hooks/useAuth";
import { hasAccess } from "@/src/lib/auth/roles";


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
      { title: "Main Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Workforce & HR",
    items: [
      {
        title: "Company Master",
        href: "/company",
        icon: Building2,
        children: [
          { title: "Organization Roles", href: "/company/roles" },
          { title: "Designations", href: "/company/designations" },
          { title: "Employee Directory", href: "/company/employees" },
          { title: "User Management", href: "/company/users" },
          { title: "Location Master", href: "/company/locations" },
        ],
      },
      {
        title: "HRMS Suite",
        href: "/hrms",
        icon: Users,
        children: [
          { title: "Recruitment", href: "/hrms/recruitment" },
          { title: "Employee Profiles", href: "/hrms/profiles" },
          { title: "Attendance Tracking", href: "/hrms/attendance" },
          { title: "Leave Management", href: "/hrms/leave" },
          { title: "Payroll Ledger", href: "/hrms/payroll" },
          { title: "Compliance Vault", href: "/hrms/documents" },
          { title: "Shift Master", href: "/hrms/shifts" },
          { title: "Specialized Profiles", href: "/hrms/specialized-profiles" },
        ],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Work Orders",
        href: "/service-requests",
        icon: ClipboardCheck,
        children: [
          { title: "Request Queue", href: "/service-requests" },
          { title: "Kanban Board", href: "/service-requests/board" },
          { title: "Log New Request", href: "/service-requests/new" },
          { title: "Field Queue (Assigned)", href: "/service-boy" },
        ],
      },
      {
        title: "Assets & Maintenance",
        href: "/assets",
        icon: HardDrive,
        children: [
          { title: "Asset Registry", href: "/assets" },
          { title: "Maintenance Schedules", href: "/assets/maintenance" },
          { title: "Asset Categories", href: "/assets/categories" },
          { title: "QR Code Lab", href: "/assets/qr-codes" },
        ],
      },
      {
        title: "Supply Chain",
        href: "/inventory",
        icon: Package,
        children: [
          { title: "Product & Supplier Master", href: "/inventory/products" },
          { title: "Stock & Warehouses", href: "/inventory/warehouses" },
          { title: "Purchase Orders", href: "/inventory/purchase-orders" },
          { title: "Requests & Approvals", href: "/inventory/indents/create" },
          { title: "Mapping & Rates", href: "/inventory/supplier-products" },
        ],
      },
      {
        title: "Operations Config",
        href: "/services",
        icon: Wrench,
        children: [
          { title: "Checklist Builders", href: "/services/masters/checklists" },
          { title: "Task Templates", href: "/services/masters/tasks" },
          { title: "Service Mapping", href: "/services/masters/service-tasks" },
          { title: "Security Ops", href: "/services/security" },
          { title: "HVAC & AC", href: "/services/ac" },
          { title: "Printing & Ads", href: "/services/printing" },
        ],
      },
    ],
  },
  {
    title: "Residences",
    items: [
      {
        title: "Society & Residents",
        href: "/society",
        icon: Home,
        children: [
          { title: "Guard Station",      href: "/test-guard" },
          { title: "Resident Directory", href: "/society/residents" },
          { title: "Visitor Management", href: "/society/visitors" },
          { title: "Incident Alerts", href: "/society/panic-alerts" },
          { title: "Facility Checklists", href: "/society/checklists" },
          { title: "Emergency Directory", href: "/society/emergency" },
          { title: "Resident Portal", href: "/society/my-flat" },
          /* Temporarily hidden
          { title: "Guest Invitation", href: "/society/my-flat?action=invite" },
          */
        ],
      },
    ],
  },
  {
    title: "Finance & Analytics",
    items: [
      {
        title: "Finance & Accounts",
        href: "/finance",
        icon: Receipt,
        children: [
          { title: "Billing & Receipts", href: "/finance/buyer-billing" },
          { title: "3-Way Reconciliation", href: "/finance/reconciliation" },
          { title: "Supplier Payouts", href: "/finance/supplier-bills" },
          { title: "Universal Ledger", href: "/finance/payments" },
          { title: "Audit & Compliance", href: "/finance/compliance" },
        ],
      },
      {
        title: "Intelligence Hub",
        href: "/reports",
        icon: BarChart3,
        children: [
          { title: "Attendance Analysis", href: "/reports/attendance" },
          { title: "Financial Health", href: "/reports/financial" },
          { title: "Operational Excellence", href: "/reports/services" },
          { title: "Resource Consumption", href: "/reports/inventory" },
        ],
      },
    ],
  },
  {
    title: "Support & Tickets",
    items: [
      {
        title: "Quality Tickets",
        href: "/tickets",
        icon: Ticket,
        children: [
          { title: "Behavioral Incident", href: "/tickets/behavior" },
          { title: "Quality Assurance", href: "/tickets/quality" },
          { title: "Material Returns", href: "/tickets/returns" },
        ],
      },
    ],
  },
  {
    title: "Buyer Portal",
    items: [
      {
        title: "My Services",
        href: "/buyer",
        icon: ShoppingCart,
        children: [
          { title: "All Requests",         href: "/buyer/requests" },
          { title: "New Request",          href: "/buyer/requests/new" },
          { title: "Invoices & Payments",  href: "/buyer/invoices" },
        ],
      },
    ],
  },
  {
    title: "Supplier Portal",
    items: [
      {
        title: "Order Management",
        href: "/supplier",
        icon: Truck,
        children: [
          { title: "Pending Indents",   href: "/supplier/indents" },
          { title: "Purchase Orders",   href: "/supplier/purchase-orders" },
          { title: "Service Orders",    href: "/supplier/service-orders" },
          { title: "My Bills",          href: "/supplier/bills" },
        ],
      },
    ],
  },
  {
    title: "Portals",
    items: [
      {
        title: "Partners & Portals",
        href: "/portals",
        icon: LayoutGrid,
        children: [
          { title: "Buyer Interface",    href: "/buyer" },
          { title: "Supplier Interface", href: "/supplier" },
        ],
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        children: [
          { title: "Company Identity", href: "/settings/company" },
          { title: "Access Control", href: "/settings/permissions" },
          { title: "Notification Center", href: "/settings/notifications" },
          { title: "Visual Branding", href: "/settings/branding" },
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
  const { role } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

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
    if (href === "/dashboard") {
      // Portal roles redirect /dashboard → their portal page, so keep Main Dashboard active there
      if (role === "buyer" && pathname?.startsWith("/buyer")) return true;
      if ((role === "supplier" || role === "vendor") && pathname?.startsWith("/supplier")) return true;
      if (role === "resident" && pathname?.startsWith("/test-resident")) return true;
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(href);
  };

  // 🔒 Filter out frozen and unauthorized navigation items
  const filteredNavigation = useMemo(() => {
    // If role is not yet loaded, show nothing or admin view (role truth: show only authorized)
    if (!role && !FEATURE_FUTURE_PHASE) return [];

    let filtered = navigation;
    
    // First apply Phase freeze (if any)
    if (!FEATURE_FUTURE_PHASE) {
      filtered = filtered.map(group => ({
        ...group,
        items: group.items
          .filter(item => !isNavItemFrozen(item.title) && !isNavHrefFrozen(item.href))
          .map(item => ({
            ...item,
            children: item.children?.filter(
              child => !isNavItemFrozen(child.title) && !isNavHrefFrozen(child.href)
            ),
          }))
          .filter(item => !item.children || item.children.length > 0),
      })).filter(group => group.items.length > 0);
    }

    // Then apply Role-based access filtering
    if (role !== "admin") {
      filtered = filtered.map(group => ({
        ...group,
        items: group.items
          .filter(item => {
            // For items with children, show if any child is accessible
            if (item.children && item.children.length > 0) {
              return item.children.some(child => hasAccess(role!, child.href));
            }
            return hasAccess(role!, item.href);
          })
          .map(item => ({
            ...item,
            children: item.children?.filter(
              child => hasAccess(role!, child.href)
            ),
          }))
          .filter(item => (item.children && item.children.length > 0) || !item.children),
      })).filter(group => group.items.length > 0);
    }

    return filtered;
  }, [role]);


  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "bg-gradient-to-b from-sidebar to-sidebar/95 transition-all duration-300 border-sidebar-border",
          !isMobile ? "fixed left-0 top-0 z-40 h-screen border-r hidden lg:block" : "h-full w-full",
          !isMobile && (collapsed ? "w-16" : "w-64"),
          className
        )}
      >
        {/* Logo Section & Toggle */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border/50 px-4 bg-sidebar/50 backdrop-blur-sm">
          {collapsed ? (
            <div className="flex h-full w-full items-center justify-center">
              {onToggle && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onToggle}
                      className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      aria-label="Expand sidebar"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Expand sidebar</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shadow-glow">
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
                  aria-label="Collapse sidebar"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)] scrollbar-thin">
        <div className="p-3 space-y-6">
          {/* 🔒 Using filteredNavigation to hide frozen features */}
          {filteredNavigation.map((group) => (
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
                      collapsed ? (
                        // Collapsed state: show tooltip with item title
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "nav-item",
                                isActive(item.href) ? "nav-item-active" : "nav-item-inactive"
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        // Expanded state: show collapsible menu
                        <Collapsible
                          open={openGroups.includes(item.title)}
                          onOpenChange={() => toggleGroup(item.title)}
                        >
                          <CollapsibleTrigger 
                            className="w-full"
                            aria-expanded={openGroups.includes(item.title)}
                            aria-controls={`nav-group-${item.title.replace(/\s+/g, '-').toLowerCase()}`}
                          >
                            <div
                              className={cn(
                                "nav-item w-full cursor-pointer",
                                isActive(item.href) ? "nav-item-active" : "nav-item-inactive"
                              )}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{item.title}</span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition-transform opacity-60",
                                  openGroups.includes(item.title) && "rotate-180"
                                )}
                                aria-hidden="true"
                              />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent 
                            className="pl-9 space-y-1 mt-1"
                            id={`nav-group-${item.title.replace(/\s+/g, '-').toLowerCase()}`}
                          >
                            {item.children.map((child) => (
                                <Link
                                              key={child.href}
                                              href={child.href}
                                              className={cn(
                                                "block py-2 px-3 text-sm rounded-lg transition-all duration-200",
                                                pathname === child.href
                                                  ? "text-sidebar-primary-foreground font-semibold bg-sidebar-primary flex items-center before:content-[''] before:w-1 before:h-4 before:bg-sidebar-primary-foreground before:mr-2 before:rounded-full shadow-glow"
                                                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 pl-6 font-medium"
                                              )}
                                            >
                                {child.title}
                              </Link>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    ) : collapsed ? (
                      // Collapsed state for items without children
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "nav-item",
                              isActive(item.href) ? "nav-item-active" : "nav-item-inactive"
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      // Expanded state for items without children
                      <Link
                        href={item.href}
                        className={cn(
                          "nav-item",
                          isActive(item.href) ? "nav-item-active" : "nav-item-inactive"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}
