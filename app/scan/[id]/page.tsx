"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, LogIn, Package, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQrCodes } from "@/hooks/useQrCodes";

export default function QrScanPage() {
  const params = useParams();
  const router = useRouter();
  const qrId = String(params.id || "");
  const scanStartedRef = useRef(false);

  const { user, isLoading: authLoading } = useAuth();
  const { scanQrCode, scanResult, isScanning } = useQrCodes();

  const attemptScan = useCallback(async () => {
    if (!qrId) return;

    let location:
      | {
          latitude: number;
          longitude: number;
        }
      | undefined;

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });

        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (error) {
        console.warn("QR scan geolocation unavailable:", error);
      }
    }

    await scanQrCode(qrId, location);
  }, [qrId, scanQrCode]);

  useEffect(() => {
    if (authLoading || !user || scanStartedRef.current) {
      return;
    }

    scanStartedRef.current = true;
    void attemptScan();
  }, [attemptScan, authLoading, user]);

  const handleLogin = () => {
    router.push(`/login?redirect=${encodeURIComponent(`/scan/${qrId}`)}`);
  };

  const handleRetry = () => {
    scanStartedRef.current = false;
    if (user) {
      scanStartedRef.current = true;
      void attemptScan();
    }
  };

  if (authLoading || (user && (!scanResult || isScanning))) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-none shadow-card ring-1 ring-border">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <p className="font-semibold">Scanning asset QR code</p>
              <p className="text-sm text-muted-foreground">Recording the scan and resolving the linked asset.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-none shadow-card ring-1 ring-border">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="pt-2">Sign In Required</CardTitle>
            <CardDescription>
              Asset scans are recorded in `qr_scans`, so you need an authenticated session before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" onClick={handleLogin}>
              <LogIn className="h-4 w-4" />
              Sign In To Scan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scanResult?.isValid) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-destructive/30 bg-destructive/5 shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="pt-2 text-destructive">QR Scan Failed</CardTitle>
            <CardDescription>{scanResult?.errorMessage || "This QR code could not be resolved."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleRetry}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scanResult.asset?.id) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-none shadow-card ring-1 ring-border">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <QrCode className="h-6 w-6 text-warning" />
            </div>
            <CardTitle className="pt-2">QR Code Not Linked Yet</CardTitle>
            <CardDescription>
              The scan was recorded, but this QR code is still unclaimed and does not point to an asset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => router.push("/assets/qr-codes")}>
              Open QR Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-lg border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Asset Resolved</CardTitle>
              <CardDescription>The QR scan was recorded successfully and mapped to the asset below.</CardDescription>
            </div>
            <Badge variant="outline">{scanResult.asset.asset_code || "Linked Asset"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{scanResult.asset.name}</p>
                <p className="text-sm text-muted-foreground">{scanResult.asset.description || "No description provided"}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Location</p>
                <p>{scanResult.asset.location_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Status</p>
                <p>{scanResult.asset.status?.replace("_", " ") || "N/A"}</p>
              </div>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={() => router.push(`/assets/${scanResult.asset?.id}`)}>
            View Asset Details
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
