import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user has admin privileges
 * Checks for super_admin or uber_admin roles
 */
export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Query user_roles table directly for super_admin or uber_admin
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['super_admin', 'uber_admin'])
          .limit(1);

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
}
