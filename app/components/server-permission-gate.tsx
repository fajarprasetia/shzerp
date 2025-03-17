import { ReactNode } from 'react';
import { hasPermission } from '@/app/lib/permissions';

interface ServerPermissionGateProps {
  resource: string;
  action?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * A server component that conditionally renders its children based on user permissions
 * 
 * @param resource The resource to check permission for
 * @param action The action to check permission for (defaults to 'read')
 * @param fallback Optional content to show if permission is denied
 * @param children Content to show if permission is granted
 */
export async function ServerPermissionGate({ 
  resource, 
  action = 'read', 
  fallback = null, 
  children 
}: ServerPermissionGateProps) {
  // Check if user has permission
  const hasAccess = await hasPermission(resource, action);
  
  // If user has permission, render children
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // If no permission, render fallback or null
  return <>{fallback}</>;
} 