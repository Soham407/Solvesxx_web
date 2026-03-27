"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopNav } from "@/components/layout/TopNav";
import { cn } from "@/lib/utils";
// 🔒 Route Guard - Blocks access to frozen features
import { RouteGuard } from "@/components/shared/RouteGuard";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

import { DynamicBreadcrumbs } from "@/components/shared/DynamicBreadcrumbs";
import { BRAND_LEGAL_NAME, BRAND_NAME } from "@/src/lib/brand";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Skip link for accessibility - keyboard users can skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      
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
        
        <main id="main-content" className="flex-1 overflow-x-hidden" tabIndex={-1}>
          <div className="animate-fade-in p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* 🔒 RouteGuard blocks access to frozen features */}
            <ErrorBoundary>
              <RouteGuard>
                <DynamicBreadcrumbs />
                {children}
              </RouteGuard>
            </ErrorBoundary>
          </div>
        </main>
        
        <footer className="border-t border-border/50 bg-white/60 px-6 py-4 text-center text-xs text-muted-foreground/80 backdrop-blur-sm">
          <span className="font-medium">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. {BRAND_LEGAL_NAME}.
          </span>
          <span className="mx-2">|</span>
          <span>Operations portal and service workflow suite.</span>
        </footer>
      </div>
    </div>
  );
}

