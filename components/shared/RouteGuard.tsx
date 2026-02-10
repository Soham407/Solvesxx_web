"use client";

/**
 * 🔒 FEATURE FROZEN — Route Guard Component
 * 
 * This component blocks access to frozen features and redirects to dashboard.
 * Used to prevent accidental exposure of non-PRD features in demos.
 * 
 * See /docs/FEATURE_FREEZE_REGISTER.md for re-enablement instructions.
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isRouteFrozen, FEATURE_FUTURE_PHASE } from "@/src/lib/featureFlags";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // If all features are enabled, render children directly
  if (FEATURE_FUTURE_PHASE) {
    return <>{children}</>;
  }
  
  // Check if current route is frozen
  const isFrozen = pathname ? isRouteFrozen(pathname) : false;
  
  if (isFrozen) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <Card className="max-w-md border-warning/30 bg-warning/5">
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
