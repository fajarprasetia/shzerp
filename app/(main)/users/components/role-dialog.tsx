"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { RoleForm } from "./role-form";
import { toast } from "@/components/ui/use-toast";

interface RoleWithPermissions extends Role {
  permissions: Array<{ resource: string; action: string }>;
}

interface RoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  role?: RoleWithPermissions;
  onSuccess?: () => void;
}

export function RoleDialog({ isOpen, onClose, role, onSuccess }: RoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditing = !!role;

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      const endpoint = isEditing 
        ? `/api/roles/${role.id}` 
        : "/api/roles";
      
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save role");
      }

      toast({
        title: `Role ${isEditing ? "updated" : "created"} successfully`,
        description: `${data.name} has been ${isEditing ? "updated" : "created"}.`,
      });

      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Role" : "Create New Role"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update role details and permissions" 
              : "Add a new role to the system"}
          </DialogDescription>
        </DialogHeader>
        <RoleForm 
          initialData={role} 
          onSubmit={handleSubmit} 
          onCancel={onClose} 
        />
      </DialogContent>
    </Dialog>
  );
} 