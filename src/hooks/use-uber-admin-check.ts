import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user has uber admin privileges
 */
export function useUberAdminCheck() {
  const [isUberAdmin, setIsUberAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUberAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsUberAdmin(false);
          setLoading(false);
          return;
        }

        // Query user_roles table for uber_admin role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'uber_admin')
          .limit(1);

        if (error) {
          console.error('Error checking uber admin status:', error);
          setIsUberAdmin(false);
        } else {
          setIsUberAdmin(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error in uber admin check:', error);
        setIsUberAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkUberAdminStatus();
  }, []);

  return { isUberAdmin, loading };
}
