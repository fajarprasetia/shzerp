"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PlusIcon, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import useSWR from "swr";
import { User, Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withPermission } from "@/app/components/with-permission";
import { PermissionGate } from "@/app/components/permission-gate";
import { UserDialog } from "./components/user-dialog";
import { RoleDialog } from "./components/role-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Define the hook inline
function useUserData() {
  const fetcher = (url: string) => fetch(url).then(async (res) => {
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }
    return res.json();
  });

  const { data, error, isLoading, mutate } = useSWR<User[]>(
    "/api/users",
    fetcher
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

// Define the hook for roles
function useRoleData() {
  const fetcher = (url: string) => fetch(url).then(async (res) => {
    if (!res.ok) {
      throw new Error('Failed to fetch roles');
    }
    return res.json();
  });

  const { data, error, isLoading, mutate } = useSWR<Role[]>(
    "/api/roles",
    fetcher
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export default withPermission(UsersPage, "users", "read");

function UsersPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<any | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'user' | 'role', id: string, name: string } | null>(null);
  
  const { data: users, mutate: mutateUsers, isLoading: isLoadingUsers } = useUserData();
  const { data: roles, mutate: mutateRoles, isLoading: isLoadingRoles } = useRoleData();

  const userColumns = [
    {
      accessorKey: "avatar",
      header: "",
      cell: ({ row }) => (
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.original.image || ""} alt={row.original.name || ""} />
          <AvatarFallback>{row.original.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
      ),
    },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        const isSystemAdmin = row.original.isSystemAdmin;
        
        if (isSystemAdmin) {
          return (
            <Badge variant="destructive" className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              System Admin
            </Badge>
          );
        }
        
        if (role?.isAdmin) {
          return (
            <Badge variant="default" className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {role.name}
            </Badge>
          );
        }
        
        if (role) {
          return (
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {role.name}
            </Badge>
          );
        }
        
        return <span className="text-muted-foreground">No Role</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Member Since",
      cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end gap-2">
            <PermissionGate resource="users" action="write">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEditUser(row.original)}
              >
                Edit
              </Button>
            </PermissionGate>
            <PermissionGate resource="users" action="delete">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive/90"
                onClick={() => handleDeleteUser(row.original)}
              >
                Delete
              </Button>
            </PermissionGate>
          </div>
        );
      },
    },
  ];

  const roleColumns = [
    { accessorKey: "name", header: "Role Name" },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "isAdmin",
      header: "Type",
      cell: ({ row }) => {
        const isAdmin = row.original.isAdmin;
        
        if (isAdmin) {
          return (
            <Badge variant="secondary" className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Administrator
            </Badge>
          );
        }
        
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Standard
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end gap-2">
            <PermissionGate resource="roles" action="write">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEditRole(row.original)}
              >
                Edit
              </Button>
            </PermissionGate>
            <PermissionGate resource="roles" action="delete">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive/90"
                onClick={() => handleDeleteRole(row.original)}
              >
                Delete
              </Button>
            </PermissionGate>
          </div>
        );
      },
    },
  ];

  // Handle edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  // Handle add user
  const handleAddUser = () => {
    setSelectedUser(undefined);
    setUserDialogOpen(true);
  };

  // Handle edit role
  const handleEditRole = async (role: Role) => {
    try {
      // Fetch role with permissions
      const response = await fetch(`/api/roles/${role.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch role details');
      }
      const roleWithPermissions = await response.json();
      setSelectedRole(roleWithPermissions);
      setRoleDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load role details",
        variant: "destructive",
      });
    }
  };

  // Handle add role
  const handleAddRole = () => {
    setSelectedRole(undefined);
    setRoleDialogOpen(true);
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    setItemToDelete({
      type: 'user',
      id: user.id,
      name: user.name || user.email || 'this user'
    });
    setDeleteDialogOpen(true);
  };

  // Handle delete role
  const handleDeleteRole = (role: Role) => {
    setItemToDelete({
      type: 'role',
      id: role.id,
      name: role.name
    });
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const endpoint = itemToDelete.type === 'user' 
        ? `/api/users/${itemToDelete.id}` 
        : `/api/roles/${itemToDelete.id}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to delete ${itemToDelete.type}`);
      }
      
      toast({
        title: "Success",
        description: `${itemToDelete.name} has been deleted.`,
      });
      
      // Refresh data
      if (itemToDelete.type === 'user') {
        mutateUsers();
      } else {
        mutateRoles();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users and roles in the system
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate resource="users" action="write">
              <Button onClick={handleAddUser}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={userColumns}
            data={users}
            isLoading={isLoadingUsers}
          />
        </TabsContent>
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate resource="roles" action="write">
              <Button onClick={handleAddRole}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={roleColumns}
            data={roles}
            isLoading={isLoadingRoles}
          />
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <UserDialog
        isOpen={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        user={selectedUser}
        onSuccess={() => {
          mutateUsers();
        }}
      />

      {/* Role Dialog */}
      <RoleDialog
        isOpen={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        role={selectedRole}
        onSuccess={() => {
          mutateRoles();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {itemToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 