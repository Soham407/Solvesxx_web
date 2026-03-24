"use client";

/**
 * 🔒 FEATURE FROZEN — Route Guard Component
 * 
 * This component blocks access to frozen features and redirects to dashboard.
 * Used to prevent accidental exposure of non-PRD features in demos.
 * 
 * See /docs/FEATURE_FREEZE_REGISTER.md for re-enablement instructions.
 */

import { useRouter, usePathname } from "next/navigation";
import { isRouteFrozen, FEATURE_FUTURE_PHASE } from "@/src/lib/featureFlags";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { canAccessPath } from "@/src/lib/platform/permissions";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, permissions, isLoading } = useAuth();
  
  // If all features are enabled and role is admin, render children
  if (FEATURE_FUTURE_PHASE && role === "admin") {
    return <>{children}</>;
  }

  // Show loading while auth is initializing
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Validating access...</div>;
  }
  
  // Check if current route is frozen
  const isFrozen = pathname ? isRouteFrozen(pathname) : false;
  
  // Check if current user is authorized for this route
  const isAuthorized = pathname && role ? canAccessPath(role, permissions, pathname) : true;

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <Card className="max-w-md border-destructive/30 bg-destructive/5 shadow-premium">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Access Denied</CardTitle>
            <CardDescription className="text-sm">
              Your current role ({role}) does not have permission to access this module.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-dashed text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Authorization Error</p>
              <p>
                Access to this resource is restricted based on your security profile.
                Please contact the IT department if you need access.
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => {
                // Resident special redirect
                if (role === "resident") {
                  router.push('/society/my-flat');
                } else {
                  router.push('/dashboard');
                }
              }}
            >
              Return to Safe Area
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFrozen) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <Card className="max-w-md border-warning/30 bg-warning/5 shadwow-premium">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-xl">Feature Not Available</CardTitle>
            <CardDescription className="text-sm">
              This feature is not included in the current scope and has been temporarily disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-dashed text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Why am I seeing this?</p>
              <p>
                This module is part of a future phase and is not yet ready for production use. 
                Contact your administrator if you believe this is an error.
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <>{children}</>;
}

/**
 * Higher-order component version for page-level protection
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard>
        <Component {...props} />
      </RouteGuard>
    );
  };
}
