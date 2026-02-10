"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopNav } from "@/components/layout/TopNav";
import { cn } from "@/lib/utils";
// 🔒 Route Guard - Blocks access to frozen features
import { RouteGuard } from "@/components/shared/RouteGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div
        className={cn(
          "flex flex-col min-h-screen w-full transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <TopNav
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-x-hidden">
          <div className="animate-fade-in p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* 🔒 RouteGuard blocks access to frozen features */}
            <RouteGuard>
              {children}
            </RouteGuard>
          </div>
        </main>
        
        <footer className="border-t py-4 px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FacilityPro Enterprise Suite. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

