"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Bell,
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
  LayoutGrid,
} from "lucide-react";
import { CommandMenu } from "./CommandMenu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopNavProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const companies = [
  { id: "1", name: "FacilityPro HQ", logo: "FP", color: "bg-blue-600" },
  { id: "2", name: "TechPark Complex", logo: "TP", color: "bg-emerald-600" },
  { id: "3", name: "Green Valley Society", logo: "GV", color: "bg-purple-600" },
];

const notifications = [
  { id: 1, title: "New service request", message: "AC maintenance required in Block A", time: "5 min ago", unread: true, type: "service" },
  { id: 2, title: "Leave approved", message: "Your leave request has been approved", time: "1 hour ago", unread: true, type: "hrms" },
  { id: 3, title: "Inventory alert", message: "Stock level low for cleaning supplies", time: "2 hours ago", unread: false, type: "inventory" },
];

export function TopNav({ onToggleSidebar, sidebarCollapsed }: TopNavProps) {
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  const { theme, setTheme } = useTheme();

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
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
          <DropdownMenuItem className="gap-3 p-2 cursor-pointer rounded-md">
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
            <Button variant="default" size="sm" className="hidden sm:flex gap-2 rounded-full h-9 px-4 shadow-lg shadow-primary/20 animate-in fade-in zoom-in-95 font-bold">
              <Plus className="h-4 w-4" />
              <span>Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 animate-in fade-in slide-in-from-top-2">
             <DropdownMenuLabel className="text-[11px] uppercase tracking-widest text-muted-foreground py-2 px-3 font-bold">Operational Actions</DropdownMenuLabel>
             <DropdownMenuItem className="gap-2 py-2.5">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Incident Ticket</span>
             </DropdownMenuItem>
             <DropdownMenuItem className="gap-2 py-2.5">
                <Wrench className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Service Request</span>
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuLabel className="text-[11px] uppercase tracking-widest text-muted-foreground py-2 px-3 font-bold">Administrative</DropdownMenuLabel>
             <DropdownMenuItem className="gap-2 py-2.5">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold">New Employee</span>
             </DropdownMenuItem>
             <DropdownMenuItem className="gap-2 py-2.5">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold">New Location</span>
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground">
          <LayoutGrid className="h-4 w-4" />
        </Button>

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative group">
              <Bell className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-critical"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <Badge variant="secondary" className="bg-primary text-white hover:bg-primary/90 transition-colors px-2 font-black text-[10px] tracking-widest">
                {unreadCount} NEW
              </Badge>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.map((notification) => (
                <div key={notification.id} className={cn(
                  "flex flex-col gap-1 p-4 cursor-pointer transition-colors border-b last:border-0",
                  notification.unread ? "bg-primary/2" : "hover:bg-muted/30"
                )}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs ">{notification.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{notification.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{notification.message}</p>
                </div>
              ))}
            </div>
            <div className="p-2 border-t text-center">
              <Button variant="ghost" size="sm" className="w-full text-xs font-medium text-primary hover:text-primary hover:bg-primary/5">
                View all activities
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-8 w-px bg-border mx-1 hidden sm:block" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-3 pl-2 pr-3 h-10 hover:bg-muted/50 hover:text-foreground transition-all group">
              <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all shadow-sm">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  V
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-bold leading-tight">Vandanaa</span>
                <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">System Admin</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-muted/30">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">V</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Vandanaa</span>
                <span className="text-xs text-muted-foreground">vandanaa@facilitypro.com</span>
              </div>
            </div>
            <DropdownMenuItem className="gap-3 p-2.5 cursor-pointer rounded-md">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 p-2.5 cursor-pointer rounded-md">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem className="gap-3 p-2.5 cursor-pointer rounded-md text-destructive focus:bg-destructive/5 focus:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-bold">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
