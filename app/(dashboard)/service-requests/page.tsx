"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceRequestList, ServiceRequestForm, JobSessionPanel } from "@/components/phaseB";
import type { ServiceRequestWithDetails } from "@/src/types/phaseB";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";

export default function ServiceRequestsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithDetails | null>(null);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { employeeId } = useEmployeeProfile();

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    setRefreshKey((k) => k + 1);
  };

  const handleStartJob = (request: ServiceRequestWithDetails) => {
    setSelectedRequest(request);
    setShowJobPanel(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Service Requests</h1>
          <p className="text-sm text-muted-foreground">
            Manage work orders, maintenance tasks, and service assignments
          </p>
        </div>
      </div>

      {/* Service Request List - handles its own state, stats, filters, pagination */}
      <ServiceRequestList
        key={refreshKey}
        onCreateNew={() => setShowCreateDialog(true)}
        onRequestSelect={(request) => setSelectedRequest(request)}
        onStartJob={handleStartJob}
      />

      {/* Create Request Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Service Request</DialogTitle>
          </DialogHeader>
          <ServiceRequestForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Job Session Panel Dialog */}
      <Dialog open={showJobPanel} onOpenChange={setShowJobPanel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Session</DialogTitle>
          </DialogHeader>
          {selectedRequest && employeeId && (
            <JobSessionPanel
              serviceRequest={selectedRequest}
              technicianId={employeeId}
              onComplete={() => {
                setShowJobPanel(false);
                setRefreshKey((k) => k + 1);
              }}
              onClose={() => setShowJobPanel(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog (view only) */}
      <Dialog 
        open={!!selectedRequest && !showJobPanel} 
        onOpenChange={() => setSelectedRequest(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title || "Service Request"}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Request #</p>
                  <p>{selectedRequest.request_number}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                  <p className="capitalize">{selectedRequest.status?.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Priority</p>
                  <p className="capitalize">{selectedRequest.priority}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Location</p>
                  <p>{selectedRequest.location_name || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Description</p>
                <p className="text-sm mt-1">{selectedRequest.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
