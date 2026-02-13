"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary to catch React rendering errors and prevent app crashes.
 * Provides a user-friendly fallback UI and recovery options.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-fade-in">
          <div className="h-20 w-20 rounded-full bg-critical/10 flex items-center justify-center text-critical mb-6">
            <AlertTriangle className="h-10 w-10" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            An unexpected error occurred in this module. We've been notified and are working on it.
          </p>
          
          <div className="bg-muted p-4 rounded-md mb-8 max-w-lg w-full overflow-auto text-left">
            <p className="text-xs font-mono text-critical break-words">
              {this.state.error?.name}: {this.state.error?.message}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button 
              variant="default" 
              className="gap-2 font-bold"
              onClick={this.handleReset}
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              className="gap-2 font-bold"
              onClick={this.handleGoHome}
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
