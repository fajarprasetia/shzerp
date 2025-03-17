'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/app/hooks/use-permissions';

interface PermissionGateProps {
  resource: string;
  action?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * A component that conditionally renders its children based on user permissions
 * 
 * @param resource The resource to check permission for
 * @param action The action to check permission for (defaults to 'read')
 * @param fallback Optional content to show if permission is denied
 * @param children Content to show if permission is granted
 */
export function PermissionGate({ 
  resource, 
  action = 'read', 
  fallback = null, 
  children 
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermissions();
  
  // While loading, don't render anything
  if (isLoading) {
    return null;
  }
  
  // Check if user has permission
  if (hasPermission(resource, action)) {
    return <>{children}</>;
  }
  
  // If no permission, render fallback or null
  return <>{fallback}</>;
} 