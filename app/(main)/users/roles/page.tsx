"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RoleForm } from "../components/role-form";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { toast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { PlusIcon as LucidePlusIcon, ShieldCheck, Users } from "lucide-react";
import { withPermission } from "@/app/components/with-permission";

interface Permission {
  id: string;
  roleId: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}

export default withPermission(function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Fetch roles
  const fetchRoles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/roles");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }
      
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch roles");
      toast({
        title: "Error",
        description: "Failed to load roles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Handle form submission
  const handleSubmit = async (data: any) => {
    try {
      const url = selectedRole 
        ? `/api/roles/${selectedRole.id}` 
        : "/api/roles";
      
      const method = selectedRole ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${selectedRole ? "update" : "create"} role`);
      }
      
      toast({
        title: "Success",
        description: `Role ${selectedRole ? "updated" : "created"} successfully.`,
      });
      
      setIsFormOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle role deletion
  const handleDelete = async () => {
    if (!selectedRole) return;
    
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete role");
      }
      
      toast({
        title: "Success",
        description: "Role deleted successfully.",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Count permissions by resource
  const countPermissionsByResource = (permissions: Permission[]) => {
    const resourceCounts: Record<string, number> = {};
    
    permissions.forEach(permission => {
      if (!resourceCounts[permission.resource]) {
        resourceCounts[permission.resource] = 0;
      }
      resourceCounts[permission.resource]++;
    });
    
    return Object.entries(resourceCounts);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">
            Create and manage roles to control user access to different parts of the system.
          </p>
        </div>
        <Button onClick={() => {
          setSelectedRole(null);
          setIsFormOpen(true);
        }}>
          <LucidePlusIcon className="mr-2 h-4 w-4" />
          New Role
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p>{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchRoles} 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{role.name}</CardTitle>
                    {role.isAdmin && (
                      <Badge className="mt-1 bg-primary">Administrator</Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setSelectedRole(role);
                        setIsFormOpen(true);
                      }}
                    >
                      <Pencil1Icon className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setSelectedRole(role);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {role.description && (
                  <CardDescription className="mt-2">
                    {role.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Permissions</h4>
                  {role.isAdmin ? (
                    <p className="text-sm text-muted-foreground">Full access to all system features</p>
                  ) : role.permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No permissions assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {countPermissionsByResource(role.permissions).map(([resource, count]) => (
                        <Badge key={resource} variant="outline" className="text-xs">
                          {resource}: {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Role Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              {selectedRole 
                ? "Update the role details and permissions" 
                : "Define a new role with specific access permissions"}
            </DialogDescription>
          </DialogHeader>
          <RoleForm
            initialData={selectedRole || undefined}
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role "{selectedRole?.name}". 
              Users assigned to this role will lose these permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}, "users.roles", "read"); 