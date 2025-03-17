"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Role } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const roleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  isAdmin: z.boolean().optional(),
  permissions: z.array(
    z.object({
      resource: z.string(),
      action: z.string(),
    })
  ).optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  initialData?: Partial<Role & { permissions: any[] }>;
  onSubmit: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
}

// Define available resources and actions
const RESOURCES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'users', name: 'Users' },
  { id: 'roles', name: 'Roles' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'sales', name: 'Sales' },
  { id: 'customers', name: 'Customers' },
  { id: 'finance', name: 'Finance' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'settings', name: 'Settings' },
];

const ACTIONS = [
  { id: 'read', name: 'View' },
  { id: 'write', name: 'Edit' },
  { id: 'delete', name: 'Delete' },
];

export function RoleForm({ initialData, onSubmit, onCancel }: RoleFormProps) {
  const [selectedPermissions, setSelectedPermissions] = React.useState<Record<string, string[]>>(
    // Initialize from initialData if available
    initialData?.permissions?.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm.action);
      return acc;
    }, {} as Record<string, string[]>) || {}
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      isAdmin: initialData?.isAdmin || false,
      permissions: initialData?.permissions || [],
    },
  });

  // Watch isAdmin to disable permission selection when true
  const isAdmin = watch("isAdmin");

  // Update permissions when checkboxes are clicked
  const handlePermissionChange = (resource: string, action: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      const newPermissions = { ...prev };
      
      if (!newPermissions[resource]) {
        newPermissions[resource] = [];
      }
      
      if (checked) {
        if (!newPermissions[resource].includes(action)) {
          newPermissions[resource].push(action);
        }
      } else {
        newPermissions[resource] = newPermissions[resource].filter(a => a !== action);
        if (newPermissions[resource].length === 0) {
          delete newPermissions[resource];
        }
      }
      
      return newPermissions;
    });
  };

  // Convert selected permissions to array format for submission
  const preparePermissionsForSubmit = () => {
    const permissions: { resource: string; action: string }[] = [];
    
    Object.entries(selectedPermissions).forEach(([resource, actions]) => {
      actions.forEach(action => {
        permissions.push({ resource, action });
      });
    });
    
    return permissions;
  };

  const onSubmitForm = async (data: RoleFormData) => {
    try {
      // If isAdmin is true, we don't need to specify permissions
      // Otherwise, prepare the permissions array
      if (!data.isAdmin) {
        data.permissions = preparePermissionsForSubmit();
      } else {
        // For admin roles, automatically grant all permissions
        data.permissions = RESOURCES.flatMap(resource => 
          ACTIONS.map(action => ({
            resource: resource.id,
            action: action.id,
          }))
        );
      }
      
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            {...register("name")}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            disabled={isSubmitting}
            className="min-h-[80px]"
          />
        </div>

        {/* Admin Role Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="isAdmin" 
            onCheckedChange={(checked) => {
              setValue("isAdmin", checked === true);
            }}
            defaultChecked={initialData?.isAdmin}
          />
          <Label htmlFor="isAdmin">Administrator Role (Full Access)</Label>
        </div>

        {/* Permissions Section */}
        <div className={isAdmin ? "opacity-50 pointer-events-none" : ""}>
          <Label className="block mb-2">Permissions</Label>
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "Administrator roles have full access to all resources." 
                  : "Select which resources this role can access and what actions they can perform."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={RESOURCES[0].id} className="w-full">
                <TabsList className="w-full flex flex-wrap">
                  {RESOURCES.map(resource => (
                    <TabsTrigger 
                      key={resource.id} 
                      value={resource.id}
                      className="flex-grow"
                    >
                      {resource.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {RESOURCES.map(resource => (
                  <TabsContent key={resource.id} value={resource.id} className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {ACTIONS.map(action => (
                        <div key={action.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`${resource.id}-${action.id}`}
                            checked={selectedPermissions[resource.id]?.includes(action.id)}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(resource.id, action.id, checked === true)
                            }
                            disabled={isAdmin}
                          />
                          <Label htmlFor={`${resource.id}-${action.id}`}>{action.name}</Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {initialData ? "Update" : "Create"} Role
        </Button>
      </div>
    </form>
  );
} 