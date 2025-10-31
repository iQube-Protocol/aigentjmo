import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUberAdminCheck } from '@/hooks/use-uber-admin-check';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ApprovalQueueItem {
  id: string;
  local_record_id: string;
  qubebase_doc_id: string | null;
  change_type: string;
  proposed_data: any;
  original_data: any;
  submitted_by: string;
  submitted_at: string;
  approval_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

const ApprovalQueueManager: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [reviewerNotes, setReviewerNotes] = useState<{ [key: string]: string }>({});
  const { isUberAdmin, loading: uberLoading } = useUberAdminCheck();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  useEffect(() => {
    if (!adminLoading && !uberLoading && (isAdmin || isUberAdmin)) {
      fetchApprovals();
      setupRealtimeSubscription();
    }
  }, [isAdmin, isUberAdmin, adminLoading, uberLoading]);

  const fetchApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('reit_kb_approval_queue')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setApprovals(data || []);
    } catch (error: any) {
      console.error('Error fetching approvals:', error);
      toast.error('Failed to load approval queue');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('approval_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reit_kb_approval_queue'
        },
        () => {
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReview = async (approvalId: string, action: 'approve' | 'reject') => {
    setProcessingId(approvalId);

    try {
      const { data, error } = await supabase.functions.invoke('naka-reit-kb-review-changes', {
        body: {
          approval_id: approvalId,
          action,
          reviewer_notes: reviewerNotes[approvalId] || ''
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(
          action === 'approve' ? 'Change approved and synced to QubeBase' : 'Change rejected',
          { description: data.message }
        );
        fetchApprovals();
        setReviewerNotes(prev => {
          const updated = { ...prev };
          delete updated[approvalId];
          return updated;
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Review error:', error);
      toast.error(`Failed to ${action} change`, { description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDiff = (original: any, proposed: any, field: string) => {
    const origValue = original?.metadata?.[field] || original?.[field] || '';
    const propValue = proposed?.[field] || '';

    if (origValue === propValue) return null;

    return (
      <div className="space-y-1">
        <div className="text-sm font-medium">{field}:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
            <div className="font-medium text-red-700 dark:text-red-400 mb-1">Original:</div>
            <div className="line-through">{String(origValue)}</div>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
            <div className="font-medium text-green-700 dark:text-green-400 mb-1">Proposed:</div>
            <div>{String(propValue)}</div>
          </div>
        </div>
      </div>
    );
  };

  if (adminLoading || uberLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isAdmin && !isUberAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>REIT KB Approval Queue</CardTitle>
        <CardDescription>
          {isUberAdmin
            ? 'Review and approve/reject changes submitted by super admins'
            : 'View your submitted changes and their approval status'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No pending approvals
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                {isUberAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((approval) => (
                <React.Fragment key={approval.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(approval.id)}
                      >
                        {expandedRows.has(approval.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {approval.proposed_data?.title || 'Untitled'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{approval.change_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(approval.approval_status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(approval.submitted_at).toLocaleDateString()}
                    </TableCell>
                    {isUberAdmin && (
                      <TableCell>
                        {approval.approval_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleReview(approval.id, 'approve')}
                              disabled={processingId === approval.id}
                            >
                              {processingId === approval.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReview(approval.id, 'reject')}
                              disabled={processingId === approval.id}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedRows.has(approval.id) && (
                    <TableRow>
                      <TableCell colSpan={isUberAdmin ? 6 : 5}>
                        <div className="p-4 space-y-4 bg-muted/50 rounded-lg">
                          <div className="space-y-2">
                            <h4 className="font-semibold">Changes Overview:</h4>
                            {getDiff(approval.original_data, approval.proposed_data, 'title')}
                            {getDiff(approval.original_data, approval.proposed_data, 'content')}
                            {getDiff(approval.original_data, approval.proposed_data, 'category')}
                          </div>

                          {isUberAdmin && approval.approval_status === 'pending' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Reviewer Notes:</label>
                              <Textarea
                                placeholder="Add notes for the submitter..."
                                value={reviewerNotes[approval.id] || ''}
                                onChange={(e) =>
                                  setReviewerNotes(prev => ({
                                    ...prev,
                                    [approval.id]: e.target.value
                                  }))
                                }
                              />
                            </div>
                          )}

                          {approval.reviewer_notes && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">Reviewer Notes:</div>
                              <div className="text-sm p-2 bg-background rounded border">
                                {approval.reviewer_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ApprovalQueueManager;
