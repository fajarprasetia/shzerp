"use client";

import * as React from "react";
import { User } from "@prisma/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { UserForm } from "./user-form";
import { toast } from "@/components/ui/use-toast";

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  onSuccess?: () => void;
}

export function UserDialog({ isOpen, onClose, user, onSuccess }: UserDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditing = !!user;

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      const endpoint = isEditing 
        ? `/api/users/${user.id}` 
        : "/api/users";
      
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
        throw new Error(error.message || "Failed to save user");
      }

      toast({
        title: `User ${isEditing ? "updated" : "created"} successfully`,
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update user details and permissions" 
              : "Add a new user to the system"}
          </DialogDescription>
        </DialogHeader>
        <UserForm 
          initialData={user} 
          onSubmit={handleSubmit} 
          onCancel={onClose} 
        />
      </DialogContent>
    </Dialog>
  );
} 