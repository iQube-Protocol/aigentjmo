import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TENANT_CONFIG } from '@/config/tenant';
import { useAdminCheck } from '@/hooks/use-admin-check';

/**
 * Button component to sync JMO REIT Knowledge Base to QubeBase Core Hub
 * Only visible for aigent-jmo tenant and admin users
 */
const SyncREITKBButton: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { isAdmin, loading } = useAdminCheck();
  
  // Only show for JMO tenant and admin users
  if (TENANT_CONFIG.tenantId !== 'aigent-jmo' || loading) {
    return null;
  }

  if (!isAdmin) {
    return null; // Only admins can see the sync button
  }

  const handleSync = async (forceUpdate: boolean = false) => {
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      console.log('🚀 Starting REIT KB sync to QubeBase...');
      
      const { data, error } = await supabase.functions.invoke('naka-kb-sync-reit', {
        body: { force_update: forceUpdate }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSyncStatus('success');
        toast.success('REIT KB synced to QubeBase', {
          description: data.message
        });
        console.log('✅ Sync results:', data.results);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('❌ Sync error:', error);
      setSyncStatus('error');
      toast.error('Failed to sync REIT KB', {
        description: error.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleSync(false)}
        disabled={isSyncing}
        className="flex items-center gap-2"
      >
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : syncStatus === 'success' ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : syncStatus === 'error' ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isSyncing ? 'Syncing...' : 'Sync REIT KB to QubeBase'}
      </Button>
      
      {!isSyncing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSync(true)}
          className="text-xs"
        >
          Force Update
        </Button>
      )}
    </div>
  );
};

export default SyncREITKBButton;
