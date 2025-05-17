"use client";

import { useState, useEffect } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MarketingUser {
  id: string;
  name: string;
  email?: string | null;
}

interface MarketingSelectorProps {
  form: UseFormReturn<any>;
  label?: string;
  marketingUsers?: MarketingUser[];
}

export function MarketingSelector({ form, label = "Marketing", marketingUsers = [] }: MarketingSelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [ownMarketingUsers, setOwnMarketingUsers] = useState<MarketingUser[]>([]);

  // Fetch marketing users only once on component mount
  useEffect(() => {
    async function fetchOwnMarketingUsers() {
      if (marketingUsers.length > 0) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await fetch('/api/users/marketing');
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched marketing users:", data);
          setOwnMarketingUsers(data);
        } else {
          console.error('Failed to fetch marketing users');
        }
      } catch (error) {
        console.error('Error fetching marketing users:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOwnMarketingUsers();
  }, []); // Empty dependency array to run only once

  // Use either provided marketing users or our own fetched ones
  const displayUsers = marketingUsers?.length > 0 ? marketingUsers : ownMarketingUsers;

  // Debug log to check displayUsers
  useEffect(() => {
    console.log("Display users:", displayUsers);
  }, [displayUsers]);

  return (
    <FormField
      control={form.control}
      name="marketingId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value || ""}
            onValueChange={(value) => {
              console.log("Selected marketing user:", value);
              field.onChange(value);
            }}
            disabled={isLoading}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading marketing users..." : "Select marketing user"} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {displayUsers.length === 0 ? (
                <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                  No marketing users found
                </div>
              ) : (
                displayUsers.map((user) => (
                  <SelectItem 
                    key={user.id} 
                    value={user.id}
                  >
                    {user.name} {user.email ? `(${user.email})` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
} 