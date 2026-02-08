"use client";

import { useState, useEffect, useRef } from "react";
import {
  QrCode,
  Camera,
  Copy,
  Download,
  Check,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQrCodes } from "@/hooks/useQrCodes";
import type { AssetWithDetails } from "@/src/types/phaseB";
import { QR_CODE_CONFIG } from "@/src/lib/constants";

interface QrCodeDisplayProps {
  qrId: string;
  asset?: AssetWithDetails;
  size?: number;
  showActions?: boolean;
}

export function QrCodeDisplay({
  qrId,
  asset,
  size = QR_CODE_CONFIG.SIZE,
  showActions = true,
}: QrCodeDisplayProps) {
  const { generateQrUrl } = useQrCodes();
  const [copied, setCopied] = useState(false);
  const qrUrl = generateQrUrl(qrId);

  // Generate QR code using a simple SVG-based approach
  // In production, use a library like qrcode.react
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${asset?.asset_code || qrId}.png`;
    link.click();
  };

  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center">
        {/* QR Code Image */}
        <div className="bg-white p-4 rounded-lg shadow-inner">
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={size}
            height={size}
            className="rounded"
          />
        </div>

        {/* Asset Info */}
        {asset && (
          <div className="text-center mt-4">
            <p className="font-semibold">{asset.name}</p>
            <Badge variant="outline" className="mt-1">
              {asset.asset_code}
            </Badge>
          </div>
        )}

        {/* URL Display */}
        <div className="mt-4 w-full">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <code className="text-xs flex-1 truncate">{qrUrl}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QrScannerProps {
  onScan: (qrId: string) => void;
  onClose?: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        setIsScanning(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // In production, use a library like @zxing/browser for actual QR scanning
        // This is a placeholder for the camera preview
      } catch (err: any) {
        console.error("Camera error:", err);
        setError(err.message || "Failed to access camera");
        setHasCamera(false);
      } finally {
        setIsScanning(false);
      }
    };

    startCamera();

    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Manual QR input fallback
  const [manualInput, setManualInput] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      // Extract QR ID from URL or use as-is
      const match = manualInput.match(/\/scan\/([a-f0-9-]+)/i);
      const qrId = match ? match[1] : manualInput.trim();
      onScan(qrId);
    }
  };

  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Scan QR Code
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Camera Preview */}
        {hasCamera && (
          <div className="relative aspect-square max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2/3 h-2/3 border-2 border-primary rounded-lg" />
            </div>
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Manual Input Fallback */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground text-center mb-2">
            Or enter QR code ID manually:
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter QR ID or scan URL"
              className="flex-1 px-3 py-2 text-sm border rounded-lg"
            />
            <Button type="submit" size="sm">
              Submit
            </Button>
          </form>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Point your camera at any asset QR code to scan
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface QrScanResultProps {
  result: {
    qrId: string;
    asset?: AssetWithDetails;
    isValid: boolean;
    errorMessage?: string;
  };
  onClose?: () => void;
  onCreateServiceRequest?: (asset: AssetWithDetails) => void;
}

export function QrScanResult({
  result,
  onClose,
  onCreateServiceRequest,
}: QrScanResultProps) {
  if (!result.isValid) {
    return (
      <Card className="border-none shadow-card ring-1 ring-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mt-4 font-bold text-destructive">Invalid QR Code</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {result.errorMessage || "This QR code is not recognized"}
          </p>
          {onClose && (
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const asset = result.asset;

  return (
    <Card className="border-none shadow-card ring-1 ring-success/50 bg-success/5">
      <CardHeader className="pb-3 border-b border-success/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2 text-success">
            <Check className="h-4 w-4" />
            Asset Found
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {asset ? (
          <div className="space-y-4">
            {/* Asset Details */}
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                {asset.asset_code}
              </Badge>
              <h3 className="text-lg font-bold">{asset.name}</h3>
              {asset.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {asset.description}
                </p>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium">{asset.category_name || "N/A"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{asset.location_name || "N/A"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium capitalize">
                  {asset.status?.replace("_", " ") || "N/A"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="font-medium">{asset.vendor_name || "N/A"}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              {onCreateServiceRequest && (
                <Button
                  className="flex-1"
                  onClick={() => onCreateServiceRequest(asset)}
                >
                  Create Service Request
                </Button>
              )}
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              QR code is valid but no asset is linked
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
