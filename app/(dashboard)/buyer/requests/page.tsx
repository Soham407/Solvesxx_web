"use client";

import { useBuyerRequests, REQUEST_STATUS_CONFIG } from "@/hooks/useBuyerRequests";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ExternalLink, Filter, Star } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";
import { BuyerFeedbackDialog } from "@/components/dialogs/BuyerFeedbackDialog";

export default function BuyerRequestsPage() {
  const { requests, isLoading, refresh } = useBuyerRequests();
  const [search, setSearch] = useState("");
  const [feedbackRequest, setFeedbackRequest] = useState<{ id: string; request_number: string } | null>(null);

  const filteredRequests = requests.filter(req => 
    req.request_number.toLowerCase().includes(search.toLowerCase()) ||
    req.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground">Track the status of all your order requests.</p>
        </div>
        <Link href="/buyer/requests/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Order Request
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by ID or title..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <p className="text-muted-foreground animate-pulse">Loading order requests...</p>
                </TableCell>
              </TableRow>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono font-bold">{req.request_number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{req.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{req.category_name || "Uncategorized"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={REQUEST_STATUS_CONFIG[req.status]?.className}>
                      {REQUEST_STATUS_CONFIG[req.status]?.buyerLabel.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(req.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {req.status === "feedback_pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 text-xs text-warning border-warning/20 hover:bg-warning/5"
                          onClick={() => setFeedbackRequest({ id: req.id, request_number: req.request_number })}
                        >
                          <Star className="h-3 w-3" /> Feedback
                        </Button>
                      )}
                      <Link href={`/buyer/requests/${req.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <p className="text-muted-foreground">No order requests found matching your search.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {feedbackRequest && (
        <BuyerFeedbackDialog
          open={!!feedbackRequest}
          onOpenChange={(open) => { if (!open) setFeedbackRequest(null); }}
          requestId={feedbackRequest.id}
          requestNumber={feedbackRequest.request_number}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
