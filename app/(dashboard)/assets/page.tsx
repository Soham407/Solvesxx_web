"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssetList, AssetForm } from "@/components/assets";
import { QrCodeDisplay } from "@/components/qr-codes";
import { QrCode } from "lucide-react";
import type { AssetWithDetails } from "@/src/types/operations";

export default function AssetsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | null>(null);
  const [qrAsset, setQrAsset] = useState<AssetWithDetails | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    setRefreshKey((k) => k + 1); // Trigger refresh
  };

  const handleEditSuccess = () => {
    setEditingAsset(null);
    setRefreshKey((k) => k + 1); // Trigger refresh
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage all facility assets, equipment, and infrastructure
          </p>
        </div>
      </div>

      {/* Asset List - this component handles its own state, stats, filters, pagination */}
      <AssetList
        key={refreshKey}
        onCreateNew={() => setShowCreateDialog(true)}
        onEdit={(asset) => setEditingAsset(asset)}
        onViewQr={(asset) => setQrAsset(asset)}
      />

      {/* Create Asset Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Asset</DialogTitle>
          </DialogHeader>
          <AssetForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={() => setEditingAsset(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          {editingAsset && (
            <AssetForm
              asset={editingAsset}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingAsset(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrAsset} onOpenChange={() => setQrAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
          </DialogHeader>
          {qrAsset?.qr_id ? (
            <QrCodeDisplay qrId={String(qrAsset.qr_id)} asset={qrAsset} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <QrCode className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                This asset does not have a linked QR code yet.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
