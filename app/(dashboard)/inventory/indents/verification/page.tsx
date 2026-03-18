"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ArrowRightLeft,
  FileCheck2,
  Lock,
  Shield,
  Loader2,
  RefreshCw,
  Eye,
  AlertCircle,
  Info,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIndents, IndentItem, Indent } from "@/hooks/useIndents";
import { formatCurrency, toRupees } from "@/src/lib/utils/currency";
import { useSupplierRates } from "@/hooks/useSupplierRates";
import { usePurchaseOrders, SupplierRateLookupResult } from "@/hooks/usePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

// ============================================
// TYPES
// ============================================

type VerificationStatus = "matches" | "price_conflict" | "awaiting_override" | "no_contract" | "verified";

interface VerificationItem {
  id: string;
  indentItemId: string;
  indentId: string;
  indentNumber: string;
  productId: string | null;
  productName: string;
  productCode: string | null;
  requestedQuantity: number;
  unitOfMeasure: string;
  // Indent price (in paise)
  indentRate: number | null;
  // Master contract rate (in paise - converted from rupees)
  masterRate: number | null;
  // Variance calculation
  variancePercent: number;
  varianceAmount: number; // in paise
  // Status
  status: VerificationStatus;
  // Override info
  overrideApproved: boolean;
  overrideReason: string | null;
  overrideApprovedBy: string | null;
  overrideApprovedAt: string | null;
  // Supplier info (for rate lookup)
  supplierId: string | null;
  supplierName: string | null;
}

interface OverrideLogEntry {
  id: string;
  indentItemId: string;
  productName: string;
  indentRate: number;
  masterRate: number | null;
  variancePercent: number;
  reason: string;
  approvedBy: string;
  approvedAt: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateVariance = (indentRate: number | null, masterRate: number | null): { percent: number; amount: number } => {
  if (indentRate === null || masterRate === null || masterRate === 0) {
    return { percent: 0, amount: 0 };
  }
  const amount = indentRate - masterRate;
  const percent = ((indentRate - masterRate) / masterRate) * 100;
  return { percent, amount };
};

const getVerificationStatus = (
  indentRate: number | null,
  masterRate: number | null,
  overrideApproved: boolean
): VerificationStatus => {
  if (masterRate === null) return "no_contract";
  if (overrideApproved) return "verified";
  if (indentRate === null) return "awaiting_override";
  
  const { percent } = calculateVariance(indentRate, masterRate);
  
  // Allow 0.5% tolerance for rounding
  if (Math.abs(percent) <= 0.5) return "matches";
  
  return "price_conflict";
};

const STATUS_CONFIG: Record<VerificationStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  matches: {
    label: "Matches",
    className: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
  },
  price_conflict: {
    label: "Price Conflict",
    className: "bg-critical/10 text-critical border-critical/20",
    icon: AlertTriangle,
  },
  awaiting_override: {
    label: "Awaiting Override",
    className: "bg-warning/10 text-warning border-warning/20",
    icon: AlertCircle,
  },
  no_contract: {
    label: "No Contract Rate",
    className: "bg-muted text-muted-foreground border-border",
    icon: Info,
  },
  verified: {
    label: "Override Approved",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: ShieldCheck,
  },
};

// ============================================
// COMPONENT
// ============================================

export default function IndentVerificationPage() {
  const { role, user } = useAuth();
  const router = useRouter();
  // State
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Override dialog state
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [overrideItem, setOverrideItem] = useState<VerificationItem | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  
  // Override log state
  const [overrideLog, setOverrideLog] = useState<OverrideLogEntry[]>([]);
  const [isOverrideLogOpen, setIsOverrideLogOpen] = useState(false);

  // Hooks
  const {
    indents,
    fetchIndentItems,
    updateIndentItemOverride,
    isLoading: isLoadingIndents,
    refresh: refreshIndents,
  } = useIndents();

  const { getSupplierRateForProduct } = usePurchaseOrders();
  const { suppliers } = useSuppliers();

  // ============================================
  // DATA LOADING
  // ============================================

  // Load verification data - get all indent items from approved/pending indents
  const loadVerificationData = useCallback(async () => {
    setIsLoadingVerification(true);

    try {
      // Get indents that need verification (pending_approval or approved)
      const indentsToVerify = indents.filter(
        (i) => i.status === "pending_approval" || i.status === "approved"
      );

      if (indentsToVerify.length === 0) {
        setVerificationItems([]);
        setIsLoadingVerification(false);
        return;
      }

      const allVerificationItems: VerificationItem[] = [];

      // For each indent, fetch its items and look up master rates
      for (const indent of indentsToVerify) {
        const items = await fetchIndentItems(indent.id);

        for (const item of items) {
          // Try to get master contract rate
          // We need a supplier to look up rates - for now we'll try to find any supplier
          // that has this product in their catalog
          let masterRateResult: SupplierRateLookupResult | null = null;
          let matchedSupplierId: string | null = null;
          let matchedSupplierName: string | null = null;

          if (item.product_id) {
            // Try each supplier to find one with a rate for this product
            for (const supplier of suppliers) {
              const rateResult = await getSupplierRateForProduct(
                supplier.id,
                item.product_id
              );
              if (rateResult && rateResult.found) {
                masterRateResult = rateResult;
                matchedSupplierId = supplier.id;
                matchedSupplierName = supplier.supplier_name || null;
                break;
              }
            }
          }

          // Convert master rate from Rupees to paise for comparison
          const masterRateInPaise = masterRateResult?.rate
            ? Math.round(masterRateResult.rate * 100)
            : null;

          const variance = calculateVariance(
            item.estimated_unit_price,
            masterRateInPaise
          );

          // Override state comes from DB columns (not localStorage)
          const overrideApproved = !!item.override_approved_at;

          const status = getVerificationStatus(
            item.estimated_unit_price,
            masterRateInPaise,
            overrideApproved
          );

          allVerificationItems.push({
            id: `V-${item.id.slice(0, 8)}`,
            indentItemId: item.id,
            indentId: indent.id,
            indentNumber: indent.indent_number,
            productId: item.product_id,
            productName: item.product_name || item.item_description || "Unknown Product",
            productCode: item.product_code || null,
            requestedQuantity: item.requested_quantity,
            unitOfMeasure: item.unit_of_measure,
            indentRate: item.estimated_unit_price,
            masterRate: masterRateInPaise,
            variancePercent: variance.percent,
            varianceAmount: variance.amount,
            status,
            overrideApproved,
            overrideReason: item.override_reason || null,
            overrideApprovedBy: item.override_approved_by || null,
            overrideApprovedAt: item.override_approved_at || null,
            supplierId: matchedSupplierId,
            supplierName: matchedSupplierName,
          });
        }
      }

      setVerificationItems(allVerificationItems);
    } catch (error) {
      console.error("Error loading verification data:", error);
    } finally {
      setIsLoadingVerification(false);
    }
  }, [indents, fetchIndentItems, suppliers, getSupplierRateForProduct]);

  // Load data when indents or suppliers change
  useEffect(() => {
    if (!isLoadingIndents && suppliers.length > 0) {
      loadVerificationData();
    }
  }, [loadVerificationData, isLoadingIndents, suppliers.length]);

  // Build override log from DB-backed verification items
  useEffect(() => {
    const dbLog: OverrideLogEntry[] = verificationItems
      .filter((item) => item.overrideApproved && item.overrideApprovedAt)
      .map((item) => ({
        id: `LOG-${item.indentItemId}`,
        indentItemId: item.indentItemId,
        productName: item.productName,
        indentRate: item.indentRate || 0,
        masterRate: item.masterRate,
        variancePercent: item.variancePercent,
        reason: item.overrideReason || "",
        approvedBy: item.overrideApprovedBy || "",
        approvedAt: item.overrideApprovedAt || "",
      }));
    setOverrideLog(dbLog);
  }, [verificationItems]);

  // ============================================
  // STATS CALCULATIONS
  // ============================================

  const stats = {
    totalItems: verificationItems.length,
    matchingItems: verificationItems.filter((i) => i.status === "matches" || i.status === "verified").length,
    conflictItems: verificationItems.filter((i) => i.status === "price_conflict").length,
    awaitingItems: verificationItems.filter((i) => i.status === "awaiting_override" || i.status === "no_contract").length,
    compliancePercent: verificationItems.length > 0
      ? Math.round(
          (verificationItems.filter((i) => i.status === "matches" || i.status === "verified").length /
            verificationItems.length) *
            100
        )
      : 100,
    totalLeakage: verificationItems
      .filter((i) => i.status === "price_conflict" && i.varianceAmount > 0)
      .reduce((sum, i) => sum + (i.varianceAmount * i.requestedQuantity), 0),
    verifiedToday: verificationItems.filter(
      (i) =>
        i.overrideApprovedAt &&
        new Date(i.overrideApprovedAt).toDateString() === new Date().toDateString()
    ).length,
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleApprove = async (item: VerificationItem) => {
    if (item.status === "matches") {
      // Direct approve - mark as verified in DB
      await updateIndentItemOverride(
        item.indentItemId,
        "Rate matches master contract",
        user?.id || user?.email || "System"
      );
      await loadVerificationData();
    } else {
      // Need override reason
      setOverrideItem(item);
      setOverrideReason("");
      setIsOverrideDialogOpen(true);
    }
  };

  const handleSubmitOverride = async () => {
    if (!overrideItem || !overrideReason.trim()) return;

    setIsSubmittingOverride(true);

    try {
      // Persist override approval to DB (replaces localStorage)
      await updateIndentItemOverride(
        overrideItem.indentItemId,
        overrideReason,
        user?.id || user?.email || "SYSTEM_AUDITOR"
      );

      // Refresh data — overrideLog rebuilds from DB items via useEffect
      await loadVerificationData();

      setIsOverrideDialogOpen(false);
      setOverrideItem(null);
      setOverrideReason("");
    } catch (error) {
      console.error("Error submitting override:", error);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleViewDetails = (item: VerificationItem) => {
    setSelectedItem(item);
    setIsDetailSheetOpen(true);
  };

  const handleRefresh = () => {
    refreshIndents();
    loadVerificationData();
  };

  // ============================================
  // FILTERED DATA
  // ============================================

  const filteredItems = statusFilter === "all"
    ? verificationItems
    : verificationItems.filter((item) => {
        switch (statusFilter) {
          case "matches":
            return item.status === "matches";
          case "conflicts":
            return item.status === "price_conflict";
          case "pending":
            return item.status === "awaiting_override" || item.status === "no_contract";
          case "verified":
            return item.status === "verified";
          default:
            return true;
        }
      });

  // ============================================
  // TABLE COLUMNS
  // ============================================

  const columns: ColumnDef<VerificationItem>[] = [
    {
      accessorKey: "productName",
      header: "Product / Service SKU",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.productName}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">
                {row.original.productCode || row.original.id}
              </span>
              <span className="text-[10px] text-muted-foreground">|</span>
              <span className="text-[10px] text-muted-foreground">
                Indent: {row.original.indentNumber}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "indentRate",
      header: "Indent Rate",
      cell: ({ row }) => (
        <span className="text-sm font-bold text-foreground">
          {row.original.indentRate !== null
            ? formatCurrency(row.original.indentRate)
            : "Not specified"}
        </span>
      ),
    },
    {
      accessorKey: "masterRate",
      header: "Master Contract",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-muted-foreground">
            {row.original.masterRate !== null
              ? formatCurrency(row.original.masterRate)
              : "No contract"}
          </span>
          {row.original.supplierName && (
            <span className="text-[10px] text-muted-foreground">
              via {row.original.supplierName}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "variancePercent",
      header: "Variance",
      cell: ({ row }) => {
        const variance = row.original.variancePercent;
        const isMatch = Math.abs(variance) <= 0.5;
        const isHigher = variance > 0.5;

        if (row.original.masterRate === null) {
          return <span className="text-xs text-muted-foreground">N/A</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-bold",
                isMatch ? "text-success" : isHigher ? "text-critical" : "text-success"
              )}
            >
              {isMatch ? "0%" : `${variance > 0 ? "+" : ""}${variance.toFixed(1)}%`}
            </span>
            {!isMatch && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <ArrowRightLeft className={cn("h-3 w-3", isHigher ? "text-critical" : "text-success")} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isHigher ? "Above" : "Below"} contract rate by{" "}
                      {formatCurrency(Math.abs(row.original.varianceAmount))}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Logic Hub Status",
      cell: ({ row }) => {
        const config = STATUS_CONFIG[row.original.status];
        const Icon = config.icon;
        return (
          <Badge
            variant="outline"
            className={cn("font-bold text-[10px] uppercase h-5 gap-1", config.className)}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        const canApprove = item.status !== "verified";

        return (
          <div className="flex gap-2">
            {canApprove && (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 gap-2",
                  item.status === "matches"
                    ? "text-success border-success/20 hover:bg-success/5"
                    : "text-warning border-warning/20 hover:bg-warning/5"
                )}
                onClick={() => handleApprove(item)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {item.status === "matches" ? "Approve" : "Override"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {item.status === "verified" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-muted-foreground">
                      <Info className="h-4 w-4 mr-2" />
                      Override: {item.overrideReason?.slice(0, 20)}...
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoadingIndents || isLoadingVerification) {
    return (
      <div className="animate-fade-in space-y-8 pb-20">
        <PageHeader
          title="Indent Price Verification"
          description="Mandatory audit step to verify proposed indent prices against pre-negotiated Master Contract Rates before purchase finalization."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ============================================
  // EMPTY STATE
  // ============================================

  if (verificationItems.length === 0) {
    return (
      <div className="animate-fade-in space-y-8 pb-20">
        <PageHeader
          title="Indent Price Verification"
          description="Mandatory audit step to verify proposed indent prices against pre-negotiated Master Contract Rates before purchase finalization."
          actions={
            <Button variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          }
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No items to verify</AlertTitle>
          <AlertDescription>
            There are no indent items awaiting price verification. Items will appear here when
            indents are submitted for approval or approved.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  if (role !== "admin" && role !== "company_md" && role !== "company_hod") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-critical mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only authorized administrators can access Indent Price Verification.</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Indent Price Verification"
        description="Mandatory audit step to verify proposed indent prices against pre-negotiated Master Contract Rates before purchase finalization."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsOverrideLogOpen(true)}>
              <FileCheck2 className="h-4 w-4" />
              Override Log ({overrideLog.length})
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-success/5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold">{stats.compliancePercent}%</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                Rate Compliant
              </span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-critical/5">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-critical/10 text-critical flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">
                {stats.totalLeakage > 0 ? formatCurrency(stats.totalLeakage) : "₹0"}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                Pricing Leakage Detected
              </span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-primary/5">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{stats.totalItems}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                SKUs Awaiting Verification
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items ({verificationItems.length})</SelectItem>
            <SelectItem value="matches">
              Matches ({verificationItems.filter((i) => i.status === "matches").length})
            </SelectItem>
            <SelectItem value="conflicts">
              Conflicts ({verificationItems.filter((i) => i.status === "price_conflict").length})
            </SelectItem>
            <SelectItem value="pending">
              Pending ({verificationItems.filter((i) => i.status === "awaiting_override" || i.status === "no_contract").length})
            </SelectItem>
            <SelectItem value="verified">
              Verified ({verificationItems.filter((i) => i.status === "verified").length})
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">{filteredItems.length}</span>
          <span>items shown</span>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredItems} searchKey="productName" />

      {/* Override Dialog */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Price Override</DialogTitle>
            <DialogDescription>
              The indent rate differs from the master contract rate. Please provide a reason for
              approving this override.
            </DialogDescription>
          </DialogHeader>

          {overrideItem && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Product</span>
                  <span className="font-medium">{overrideItem.productName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Indent Rate</span>
                  <span className="font-bold text-foreground">
                    {overrideItem.indentRate !== null
                      ? formatCurrency(overrideItem.indentRate)
                      : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Master Rate</span>
                  <span className="font-medium text-muted-foreground">
                    {overrideItem.masterRate !== null
                      ? formatCurrency(overrideItem.masterRate)
                      : "No contract"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Variance</span>
                  <span
                    className={cn(
                      "font-bold",
                      overrideItem.variancePercent > 0 ? "text-critical" : "text-success"
                    )}
                  >
                    {overrideItem.variancePercent > 0 ? "+" : ""}
                    {overrideItem.variancePercent.toFixed(1)}%
                    {overrideItem.varianceAmount !== 0 &&
                      ` (${formatCurrency(Math.abs(overrideItem.varianceAmount))})`}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overrideReason">Override Reason *</Label>
                <Textarea
                  id="overrideReason"
                  placeholder="Enter justification for approving this price variance..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitOverride}
              disabled={!overrideReason.trim() || isSubmittingOverride}
            >
              {isSubmittingOverride ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Override
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Verification Details</SheetTitle>
            <SheetDescription>
              Detailed price verification information for this indent item.
            </SheetDescription>
          </SheetHeader>

          {selectedItem && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                  Product Information
                </h4>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Product Name</span>
                    <span className="font-medium">{selectedItem.productName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Product Code</span>
                    <span className="font-medium">
                      {selectedItem.productCode || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Indent Number</span>
                    <span className="font-medium">{selectedItem.indentNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <span className="font-medium">
                      {selectedItem.requestedQuantity} {selectedItem.unitOfMeasure}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                  Price Comparison
                </h4>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Indent Rate</span>
                    <span className="font-bold text-lg">
                      {selectedItem.indentRate !== null
                        ? formatCurrency(selectedItem.indentRate)
                        : "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Master Contract Rate</span>
                    <span className="font-medium">
                      {selectedItem.masterRate !== null
                        ? formatCurrency(selectedItem.masterRate)
                        : "No contract rate found"}
                    </span>
                  </div>
                  {selectedItem.supplierName && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Contract Supplier</span>
                      <span className="font-medium">{selectedItem.supplierName}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Variance</span>
                    <span
                      className={cn(
                        "font-bold",
                        Math.abs(selectedItem.variancePercent) <= 0.5
                          ? "text-success"
                          : selectedItem.variancePercent > 0
                          ? "text-critical"
                          : "text-success"
                      )}
                    >
                      {Math.abs(selectedItem.variancePercent) <= 0.5
                        ? "0%"
                        : `${selectedItem.variancePercent > 0 ? "+" : ""}${selectedItem.variancePercent.toFixed(1)}%`}
                    </span>
                  </div>
                  {selectedItem.varianceAmount !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Impact</span>
                      <span
                        className={cn(
                          "font-medium",
                          selectedItem.varianceAmount > 0 ? "text-critical" : "text-success"
                        )}
                      >
                        {formatCurrency(
                          Math.abs(selectedItem.varianceAmount * selectedItem.requestedQuantity)
                        )}
                        {selectedItem.varianceAmount > 0 ? " higher" : " lower"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                  Verification Status
                </h4>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold text-xs uppercase",
                        STATUS_CONFIG[selectedItem.status].className
                      )}
                    >
                      {STATUS_CONFIG[selectedItem.status].label}
                    </Badge>
                  </div>
                  {selectedItem.overrideApproved && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Override Approved By</span>
                        <span className="font-medium">{selectedItem.overrideApprovedBy}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Override Date</span>
                        <span className="font-medium">
                          {selectedItem.overrideApprovedAt
                            ? new Date(selectedItem.overrideApprovedAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="border-t pt-3">
                        <span className="text-sm text-muted-foreground block mb-1">
                          Override Reason
                        </span>
                        <p className="text-sm">{selectedItem.overrideReason}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedItem.status !== "verified" && selectedItem.status !== "matches" && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setIsDetailSheetOpen(false);
                    handleApprove(selectedItem);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Override & Approve
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Override Log Sheet */}
      <Sheet open={isOverrideLogOpen} onOpenChange={setIsOverrideLogOpen}>
        <SheetContent className="sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Override Approval Log</SheetTitle>
            <SheetDescription>
              History of all price override approvals for audit purposes.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {overrideLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No override approvals recorded yet.
              </div>
            ) : (
              overrideLog.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{entry.productName}</span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.approvedAt).toLocaleString()} by {entry.approvedBy}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {entry.variancePercent > 0 ? "+" : ""}
                      {entry.variancePercent.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Indent: {formatCurrency(entry.indentRate)} | Master:{" "}
                    {entry.masterRate !== null ? formatCurrency(entry.masterRate) : "N/A"}
                  </div>
                  <div className="text-sm border-t pt-2 mt-2">
                    <span className="text-muted-foreground">Reason: </span>
                    {entry.reason}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
