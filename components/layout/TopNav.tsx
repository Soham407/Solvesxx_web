"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building2,
  Plus,
  Ticket,
  Wrench,
  Users,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import { CommandMenu } from "./CommandMenu";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TopNavProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const companies = [
  { id: "1", name: "Shri Radhamadhav Enterprise", logo: "SR", color: "bg-primary" },
];

export function TopNav({ onToggleSidebar, sidebarCollapsed }: TopNavProps) {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  const { theme, setTheme } = useTheme();
  const { signOut, user, role } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-4 sm:px-6 shadow-sm">
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 transition-transform active:scale-95"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle mobile menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-none">
            <SheetHeader className="sr-only">
               <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <AppSidebar collapsed={false} isMobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 hidden sm:flex hover:bg-muted/50 hover:text-foreground transition-all">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-md text-white text-[10px] font-bold shadow-sm", selectedCompany.color)}>
              {selectedCompany.logo}
            </div>
            <span className="font-semibold text-sm">{selectedCompany.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2 animate-in fade-in slide-in-from-top-2">
          <DropdownMenuLabel className="text-xs uppercase tracking-widest text-muted-foreground pb-3 pt-2 px-3">
            Switch Organization
          </DropdownMenuLabel>
          <div className="space-y-1">
            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                  selectedCompany.id === company.id ? "bg-primary/5 text-primary" : "hover:bg-muted"
                )}
              >
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md text-white text-xs font-bold", company.color)}>
                  {company.logo}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{company.name}</span>
                  <span className="text-[10px] text-muted-foreground">Premium Account</span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem className="gap-3 p-2 cursor-pointer rounded-md" onClick={() => router.push("/settings/company")}>
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Organization Settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="hidden md:block flex-1 max-w-lg">
        <CommandMenu />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Apps Launcher */}
        {/* Quick Action */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="glow" size="sm" className="hidden sm:flex gap-2 rounded-full h-9 px-4 font-semibold">
              <Plus className="h-4 w-4" />
              <span>Create</span>
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2 animate-in fade-in slide-in-from-top-2">
             <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground py-2 px-3 font-semibold">Operational Actions</DropdownMenuLabel>
             <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer" onClick={() => router.push("/tickets/behavior")}>
                <Ticket className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Incident Ticket</span>
             </DropdownMenuItem>
             <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer" onClick={() => router.push("/service-requests/new")}>
                <Wrench className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Service Request</span>
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground py-2 px-3 font-semibold">Administrative</DropdownMenuLabel>
             <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer" onClick={() => router.push("/company/employees/create")}>
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold">New Employee</span>
             </DropdownMenuItem>
             <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer" onClick={() => router.push("/company/locations")}>
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold">New Location</span>
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <NotificationBell />

        <div className="h-8 w-px bg-border mx-1 hidden sm:block" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-3 pl-2 pr-3 h-10 hover:bg-muted/50 hover:text-foreground transition-all group">
              <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all shadow-sm">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {user?.email?.[0].toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-bold leading-tight truncate max-w-[120px]">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground tracking-wide uppercase">
                  {role?.replace(/_/g, ' ') || "Guest"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-muted/30">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {user?.email?.[0].toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
            <DropdownMenuItem className="gap-3 p-2.5 cursor-pointer rounded-md" onClick={() => router.push("/hrms/profiles")}>
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 p-2.5 cursor-pointer rounded-md" onClick={() => router.push("/settings")}>
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem 
              className="gap-3 p-2.5 cursor-pointer rounded-md text-destructive focus:bg-destructive/5 focus:text-destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span className="text-sm font-bold">{isSigningOut ? "Signing out..." : "Sign Out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
