import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TENANT_CONFIG } from '@/config/tenant';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { useUberAdminCheck } from '@/hooks/use-uber-admin-check';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Button component to manage REIT KB sync with QubeBase Core Hub
 * - Pull from QubeBase (all admins)
 * - Submit changes for approval (super admins)
 * - Direct push to QubeBase (uber admins only)
 */
const SyncREITKBButton: React.FC = () => {
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [draftCount, setDraftCount] = useState(0);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [showBootstrapDialog, setShowBootstrapDialog] = useState(false);
  const { isAdmin, loading } = useAdminCheck();
  const { isUberAdmin, loading: uberLoading } = useUberAdminCheck();
  
  // Only show for JMO tenant and admin users
  if (TENANT_CONFIG.tenantId !== 'aigent-jmo' || loading || uberLoading) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  // Fetch draft count for super admins
  useEffect(() => {
    if (!isAdmin || isUberAdmin) return;

    const fetchDraftCount = async () => {
      const { count } = await supabase
        .from('reit_knowledge_items')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'draft');
      
      setDraftCount(count || 0);
    };

    fetchDraftCount();
  }, [isAdmin, isUberAdmin]);

  const handlePull = async () => {
    setIsPulling(true);
    setSyncStatus('idle');

    try {
      console.log('📥 Pulling REIT KB from QubeBase...');
      
      const { data, error } = await supabase.functions.invoke('naka-reit-kb-pull');

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSyncStatus('success');
        toast.success('Pulled from QubeBase', {
          description: data.message
        });
        console.log('✅ Pull results:', data);
        setDraftCount(0); // Reset draft count after pull
      } else {
        throw new Error(data.error || 'Pull failed');
      }
    } catch (error: any) {
      console.error('❌ Pull error:', error);
      setSyncStatus('error');
      toast.error('Failed to pull from QubeBase', {
        description: error.message
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSyncStatus('idle');

    try {
      console.log('📤 Submitting changes for approval...');
      
      // Get all draft records
      const { data: draftRecords, error: fetchError } = await supabase
        .from('reit_knowledge_items')
        .select('id')
        .eq('approval_status', 'draft');

      if (fetchError) throw fetchError;

      if (!draftRecords || draftRecords.length === 0) {
        toast.info('No draft changes to submit');
        return;
      }

      const recordIds = draftRecords.map(r => r.id);

      const { data, error } = await supabase.functions.invoke('naka-reit-kb-submit-changes', {
        body: { record_ids: recordIds }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSyncStatus('success');
        toast.success('Changes submitted for approval', {
          description: `${data.submissions.length} items pending uber admin review`
        });
        console.log('✅ Submit results:', data);
        setDraftCount(0);
      } else {
        throw new Error(data.error || 'Submit failed');
      }
    } catch (error: any) {
      console.error('❌ Submit error:', error);
      setSyncStatus('error');
      toast.error('Failed to submit changes', {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePush = async () => {
    setShowPushDialog(false);
    setIsPushing(true);
    setSyncStatus('idle');

    try {
      console.log('🚀 Pushing to QubeBase (uber admin direct)...');
      
      const { data, error } = await supabase.functions.invoke('naka-reit-kb-push');

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSyncStatus('success');
        toast.success('Pushed to QubeBase', {
          description: data.message
        });
        console.log('✅ Push results:', data);
      } else {
        throw new Error(data.error || 'Push failed');
      }
    } catch (error: any) {
      console.error('❌ Push error:', error);
      setSyncStatus('error');
      toast.error('Failed to push to QubeBase', {
        description: error.message
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleBootstrap = async (force: boolean = false) => {
    setShowBootstrapDialog(false);
    setIsBootstrapping(true);
    setSyncStatus('idle');

    try {
      console.log('🌱 Bootstrapping QubeBase with seed data...');
      
      const { data, error } = await supabase.functions.invoke('naka-reit-kb-bootstrap', {
        body: { force_bootstrap: force }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSyncStatus('success');
        toast.success('QubeBase Bootstrapped', {
          description: `${data.bootstrapped} seed documents created and synced to local database`
        });
        console.log('✅ Bootstrap results:', data);
      } else {
        // Show info if already has data
        if (data.existing_count) {
          toast.info('QubeBase already has data', {
            description: data.message,
            action: {
              label: 'Force Bootstrap',
              onClick: () => handleBootstrap(true)
            }
          });
        } else {
          throw new Error(data.error || 'Bootstrap failed');
        }
      }
    } catch (error: any) {
      console.error('❌ Bootstrap error:', error);
      setSyncStatus('error');
      toast.error('Failed to bootstrap QubeBase', {
        description: error.message
      });
    } finally {
      setIsBootstrapping(false);
    }
  };

  const isLoading = isPulling || isPushing || isSubmitting || isBootstrapping;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Pull from QubeBase - All Admins */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePull}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isPulling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : syncStatus === 'success' && !isPushing && !isSubmitting ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isPulling ? 'Pulling...' : 'Pull from QubeBase'}
        </Button>

        {/* Submit for Approval - Super Admins Only (not Uber Admins) */}
        {!isUberAdmin && draftCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? 'Submitting...' : `Submit ${draftCount} Changes`}
          </Button>
        )}

        {/* Direct Push - Uber Admins Only */}
        {isUberAdmin && (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowPushDialog(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isPushing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isPushing ? 'Pushing...' : 'Push to QubeBase'}
            </Button>

            {/* Bootstrap QubeBase - Uber Admins Only */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBootstrapDialog(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isBootstrapping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isBootstrapping ? 'Bootstrapping...' : 'Bootstrap QubeBase'}
            </Button>
          </>
        )}
      </div>

      {/* Confirmation Dialog for Uber Admin Direct Push */}
      <AlertDialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bypass Approval Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              As an uber admin, you can directly push changes to QubeBase without approval.
              This bypasses the normal approval workflow. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePush}>
              Yes, Push to QubeBase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Bootstrap */}
      <AlertDialog open={showBootstrapDialog} onOpenChange={setShowBootstrapDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bootstrap QubeBase Core Hub?</AlertDialogTitle>
            <AlertDialogDescription>
              This will seed QubeBase Core Hub with 18 initial REIT knowledge documents.
              The seeded data will be automatically pulled to your local database.
              This operation is typically done once during initial setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBootstrap(false)}>
              Yes, Bootstrap QubeBase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SyncREITKBButton;
