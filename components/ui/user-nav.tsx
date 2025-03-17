"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, User, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOutAction } from "@/app/actions/auth-actions";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

export function UserNav() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userInitials, setUserInitials] = useState("U");

  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.name || "User");
      setUserEmail(session.user.email || "");
      
      // Set initials based on user name
      if (session.user.name) {
        const nameParts = session.user.name.split(" ");
        if (nameParts.length > 1) {
          setUserInitials(`${nameParts[0][0]}${nameParts[1][0]}`);
        } else {
          setUserInitials(session.user.name[0] || "U");
        }
      }
    }
  }, [session]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const result = await signOutAction();
      
      if (result.success) {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
        // Redirect to login page
        window.location.href = "/auth/login";
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to log out",
          variant: "destructive",
        });
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={session?.user?.image || ""} alt={userName} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-destructive focus:text-destructive"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 