
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAdminCheck } from '@/hooks/use-admin-check';
import InvitationManager from '@/components/admin/InvitationManager';

const InvitationsPage = () => {
  const { user, isGuest } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  if (adminLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (isGuest || !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please sign in to access the invitation manager.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>This page is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">User Invitation Manager</h1>
        <p className="text-gray-600">
          Upload user data via CSV and send invitation emails for account creation.
        </p>
      </div>
      
      <InvitationManager />
    </div>
  );
};

export default InvitationsPage;
