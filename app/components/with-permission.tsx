'use client';

import { ComponentType, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/app/hooks/use-permissions';
import { useToast } from '@/components/ui/use-toast';

/**
 * Higher-order component that protects routes based on permissions
 * 
 * @param Component The component to wrap
 * @param resource The resource to check permission for
 * @param action The action to check permission for (defaults to 'read')
 * @param redirectTo The path to redirect to if permission is denied (defaults to '/dashboard')
 */
export function withPermission<P extends object>(
  Component: ComponentType<P>,
  resource: string,
  action: string = 'read',
  redirectTo: string = '/dashboard'
) {
  return function ProtectedComponent(props: P) {
    const { hasPermission, isLoading, isAdmin, isSystemAdmin } = usePermissions();
    const router = useRouter();
    const { toast } = useToast();
    const toastShownRef = useRef(false);
    
    useEffect(() => {
      // Only check permissions once loading is complete
      if (!isLoading) {
        const hasAccess = isSystemAdmin || 
          (isAdmin && resource !== 'system') || 
          (resource === 'system' && isSystemAdmin) ||
          hasPermission(resource, action);
        
        if (!hasAccess && !toastShownRef.current) {
          toastShownRef.current = true;
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access this page.',
            variant: 'destructive',
          });
          router.push(redirectTo);
        }
      }
    }, [isLoading, isAdmin, isSystemAdmin, resource, action, redirectTo, router]);
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    const hasAccess = isSystemAdmin || 
      (isAdmin && resource !== 'system') || 
      (resource === 'system' && isSystemAdmin) ||
      hasPermission(resource, action);
    
    if (!hasAccess) {
      return null; // Will redirect in useEffect
    }
    
    return <Component {...props} />;
  };
} 