"use client";

import { useState, useEffect } from "react";
import { withPermission } from "@/app/components/with-permission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { usePermissions } from "@/app/hooks/use-permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// This page is only accessible to administrators
function PermissionsPage() {
  const [isSettingUpPermissions, setIsSettingUpPermissions] = useState(false);
  const [isRefreshingPermissions, setIsRefreshingPermissions] = useState(false);
  const { permissions, isSystemAdmin, isAdmin, mutate, isLoading } = usePermissions();
  const [resourcePermissions, setResourcePermissions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Group permissions by resource
    const grouped: Record<string, string[]> = {};
    permissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission.action);
    });
    setResourcePermissions(grouped);
  }, [permissions]);

  const handleSetupPermissions = async () => {
    try {
      setIsSettingUpPermissions(true);
      const response = await fetch('/api/auth/setup-permissions');
      
      if (!response.ok) {
        throw new Error('Failed to set up permissions');
      }
      
      const data = await response.json();
      
      toast.success('Permissions set up successfully', {
        description: `Created ${data.permissionsCreated} new permissions.`
      });
      
      // Refresh permissions data
      await mutate();
    } catch (error) {
      console.error('Error setting up permissions:', error);
      toast.error('Failed to set up permissions', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSettingUpPermissions(false);
    }
  };

  const handleRefreshPermissions = async () => {
    try {
      setIsRefreshingPermissions(true);
      await mutate();
      toast.success('Permissions refreshed successfully');
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      toast.error('Failed to refresh permissions');
    } finally {
      setIsRefreshingPermissions(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions Management</h1>
          <p className="text-muted-foreground">
            Manage system permissions and access control
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleRefreshPermissions} 
            disabled={isRefreshingPermissions}
            variant="outline"
          >
            {isRefreshingPermissions ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleSetupPermissions} 
            disabled={isSettingUpPermissions}
          >
            {isSettingUpPermissions ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up permissions...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Setup Default Permissions
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Access</CardTitle>
              <CardDescription>
                Your current system access level and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Access Level:</span>
                  {isSystemAdmin ? (
                    <Badge variant="default" className="bg-blue-500">System Administrator</Badge>
                  ) : isAdmin ? (
                    <Badge variant="default" className="bg-green-500">Administrator</Badge>
                  ) : (
                    <Badge variant="outline">Standard User</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isSystemAdmin 
                    ? "You have full access to all system features and settings." 
                    : isAdmin 
                      ? "You have administrative access to most system features." 
                      : "You have limited access based on your assigned role."}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Current Permissions</CardTitle>
              <CardDescription>
                List of resources and actions you have access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : Object.keys(resourcePermissions).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(resourcePermissions).map(([resource, actions]) => (
                      <TableRow key={resource}>
                        <TableCell className="font-medium">{resource}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {actions.map(action => (
                              <Badge key={action} variant="outline" className="capitalize">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No specific permissions found. {isAdmin || isSystemAdmin ? "You have access through your admin role." : ""}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Manage roles and their associated permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Role management functionality will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Only allow system administrators and administrators to access this page
export default withPermission(PermissionsPage, "users.roles", "manage"); 