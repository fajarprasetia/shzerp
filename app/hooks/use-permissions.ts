import { useEffect, useState } from 'react';
import useSWR from 'swr';

export interface Permission {
  id: string;
  resource: string;
  action: string;
}

export interface UserPermissions {
  isSystemAdmin: boolean;
  isAdmin: boolean;
  permissions: Permission[];
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  // Always return a valid response, even if it's an error
  const data = await res.json();
  return data;
});

export function usePermissions() {
  const [isAuthPage, setIsAuthPage] = useState(false);
  
  useEffect(() => {
    // Check if we're on an auth page
    if (typeof window !== 'undefined') {
      setIsAuthPage(window.location.pathname.startsWith('/auth/'));
    }
  }, []);
  
  // Don't fetch permissions on auth pages
  const shouldFetch = !isAuthPage;
  
  const { data, error, isLoading, mutate } = useSWR<UserPermissions>(
    shouldFetch ? '/api/auth/permissions' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      errorRetryCount: 1,
    }
  );

  const hasPermission = (resource: string, action: string = 'read'): boolean => {
    if (!data) return false;
    
    // System admins have access to everything
    if (data.isSystemAdmin) return true;
    
    // Admins have access to most things
    if (data.isAdmin && resource !== 'system') return true;
    
    // Check specific permissions
    return data.permissions.some(
      (permission) => permission.resource === resource && permission.action === action
    );
  };

  return {
    permissions: data?.permissions || [],
    isSystemAdmin: data?.isSystemAdmin || false,
    isAdmin: data?.isAdmin || false,
    isLoading,
    isError: error,
    hasPermission,
    mutate,
  };
} 