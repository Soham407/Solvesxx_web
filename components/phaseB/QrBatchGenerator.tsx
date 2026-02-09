"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useWarehouses } from "@/hooks/useWarehouses";
import { 
  QrCode, 
  Download, 
  Copy, 
  Plus, 
  Check,
  Printer,
  Loader2,
  Package
} from "lucide-react";

interface GeneratedQR {
  id: string;
  qr_code: string;
  sequence_number: number;
}

interface QrBatchGeneratorProps {
  societyId: string;
  onSuccess?: (batchId: string) => void;
}

export function QrBatchGenerator({ societyId, onSuccess }: QrBatchGeneratorProps) {
  const { warehouses } = useWarehouses(societyId);
  const { toast } = useToast();

  const [count, setCount] = useState<number>(10);
  const [prefix, setPrefix] = useState<string>("QR");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<{
    batchId: string;
    qrCodes: GeneratedQR[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (count < 1 || count > 1000) {
      toast({
        title: "Invalid Count",
        description: "Please enter a number between 1 and 1000",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/assets/generate-qr-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count,
          societyId,
          warehouseId: selectedWarehouse || undefined,
          prefix,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate QR codes");
      }

      setGeneratedBatch({
        batchId: data.batchId,
        qrCodes: data.qrCodes,
      });

      toast({
        title: "Success",
        description: `Generated ${data.count} QR codes successfully`,
      });

      onSuccess?.(data.batchId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR codes",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied",
      description: "QR code copied to clipboard",
    });
  };

  const handleDownloadCSV = () => {
    if (!generatedBatch) return;

    const csvContent = [
      ["Sequence", "QR Code", "ID", "Download URL"],
      ...generatedBatch.qrCodes.map((qr) => [
        qr.sequence_number,
        qr.qr_code,
        qr.id,
        `${process.env.NEXT_PUBLIC_APP_URL}/scan/${qr.id}`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-codes-${generatedBatch.batchId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "QR codes exported to CSV",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Generate QR Codes
          </CardTitle>
          <CardDescription>
            Create multiple QR codes in a batch for printing and asset tagging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="count">Number of QR Codes</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">Max 1000 codes per batch</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefix">Code Prefix (Optional)</Label>
              <Input
                id="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="QR"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">e.g., QR-001, QR-002</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse">Assign to Warehouse (Optional)</Label>
            <select
              id="warehouse"
              className="w-full p-2 border rounded-md"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">None</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Generate {count} QR Codes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated QR Codes */}
      {generatedBatch && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Generated QR Codes</CardTitle>
              <CardDescription>
                Batch ID: <code className="text-xs bg-muted px-1 rounded">{generatedBatch.batchId}</code>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {generatedBatch.qrCodes.slice(0, 20).map((qr) => (
                <Card key={qr.id} className="p-3 space-y-2">
                  <div className="flex justify-center">
                    <QRCodeSVG
                      value={`${process.env.NEXT_PUBLIC_APP_URL}/scan/${qr.id}`}
                      size={100}
                      level="M"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <Badge variant="outline" className="text-xs">
                      #{qr.sequence_number}
                    </Badge>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {qr.qr_code}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCopy(qr.qr_code, qr.id)}
                  >
                    {copiedId === qr.id ? (
                      <>
                        <Check className="mr-2 h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </Card>
              ))}
            </div>

            {generatedBatch.qrCodes.length > 20 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  View All {generatedBatch.qrCodes.length} QR Codes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Full Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All QR Codes</DialogTitle>
            <DialogDescription>
              {generatedBatch?.qrCodes.length} QR codes generated in batch{" "}
              {generatedBatch?.batchId}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-4">
            {generatedBatch?.qrCodes.map((qr) => (
              <Card key={qr.id} className="p-3 space-y-2">
                <div className="flex justify-center">
                  <QRCodeSVG
                    value={`${process.env.NEXT_PUBLIC_APP_URL}/scan/${qr.id}`}
                    size={80}
                    level="M"
                  />
                </div>
                <div className="text-center space-y-1">
                  <Badge variant="outline" className="text-xs">
                    #{qr.sequence_number}
                  </Badge>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {qr.qr_code}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCopy(qr.qr_code, qr.id)}
                >
                  {copiedId === qr.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
