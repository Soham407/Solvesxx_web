"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Printer, Download, QrCode, CreditCard, User, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useReactToPrint } from "react-to-print";

interface IDCardData {
  type: "visitor" | "staff" | "contractor";
  name: string;
  id: string;
  role: string;
  department?: string;
  validFrom: string;
  validUntil: string;
  photo?: string;
  qrData?: string;
}

export function IDPrintingModule() {
  const [cardData, setCardData] = useState<IDCardData>({
    type: "visitor",
    name: "",
    id: "",
    role: "",
    department: "",
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `ID-Card-${cardData.id || "preview"}`,
  });

  const generateQR = () => {
    const data = JSON.stringify({
      id: cardData.id,
      name: cardData.name,
      type: cardData.type,
      validUntil: cardData.validUntil,
    });
    return btoa(data);
  };

  const handleGenerate = async () => {
    if (!cardData.name || !cardData.id) {
      toast({
        title: "Missing Information",
        description: "Please enter name and ID number.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCardData({ ...cardData, qrData: generateQR() });
    setIsGenerating(false);

    toast({
      title: "ID Card Generated",
      description: "ID card is ready for printing.",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4" />
            ID Card Details
          </CardTitle>
          <CardDescription className="text-xs">
            Enter details to generate visitor pass or staff ID card
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Card Type</Label>
            <Select
              value={cardData.type}
              onValueChange={(value: any) => setCardData({ ...cardData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visitor">Visitor Pass (Temporary)</SelectItem>
                <SelectItem value="staff">Staff ID (Long-term)</SelectItem>
                <SelectItem value="contractor">Contractor Pass</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Enter name"
                value={cardData.name}
                onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input
                placeholder="Auto or manual"
                value={cardData.id}
                onChange={(e) => setCardData({ ...cardData, id: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role / Designation</Label>
              <Input
                placeholder="e.g., Technician"
                value={cardData.role}
                onChange={(e) => setCardData({ ...cardData, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department / Company</Label>
              <Input
                placeholder="e.g., Maintenance"
                value={cardData.department}
                onChange={(e) => setCardData({ ...cardData, department: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valid From</Label>
              <Input
                type="date"
                value={cardData.validFrom}
                onChange={(e) => setCardData({ ...cardData, validFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={cardData.validUntil}
                onChange={(e) => setCardData({ ...cardData, validUntil: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate ID Card
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!cardData.qrData}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Printer className="h-4 w-4" />
            ID Card Preview
          </CardTitle>
          <CardDescription className="text-xs">
            Preview how the ID card will look when printed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={printRef}
            className="w-full max-w-[350px] mx-auto bg-white border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg"
          >
            {/* Card Header */}
            <div className="bg-primary p-4 text-white">
              <div className="flex items-center justify-between">
                <Building2 className="h-6 w-6" />
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {cardData.type}
                </Badge>
              </div>
              <h3 className="text-center text-lg font-bold mt-2">Facility Platform</h3>
            </div>

            {/* Card Body */}
            <div className="p-4 text-center">
              <Avatar className="h-20 w-20 mx-auto mb-3">
                <AvatarFallback className="bg-muted text-2xl">
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>

              <h4 className="text-xl font-bold text-gray-800">
                {cardData.name || "Name"}
              </h4>
              <p className="text-sm text-gray-600">{cardData.role || "Role"}</p>
              <p className="text-xs text-gray-500">{cardData.department || "Department"}</p>

              <div className="mt-4 space-y-1 text-xs text-gray-600">
                <p>
                  <span className="font-semibold">ID:</span> {cardData.id || "---"}
                </p>
                <p>
                  <span className="font-semibold">Valid:</span>{" "}
                  {cardData.validFrom} to {cardData.validUntil || "---"}
                </p>
              </div>

              {/* QR Code Placeholder */}
              {cardData.qrData && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg inline-block">
                  <QrCode className="h-16 w-16 text-gray-800" />
                  <p className="text-[8px] mt-1 text-gray-500">Scan to verify</p>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="bg-gray-100 p-2 text-center text-[10px] text-gray-500">
              If found, please return to security desk
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={!cardData.qrData}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
