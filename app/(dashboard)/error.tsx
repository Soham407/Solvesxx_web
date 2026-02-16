"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6 animate-in zoom-in-95 duration-300">
      <Card className="max-w-md border-destructive/20 bg-destructive/5 shadow-premium">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Something went wrong!</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            An unexpected error occurred while loading this module. Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-background p-4 border border-dashed text-xs font-mono text-destructive overflow-auto max-h-32">
            {error.message || "Unknown error"}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => reset()}
              variant="default"
              className="flex-1 gap-2 shadow-glow"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              asChild
            >
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
