"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { Menu, Moon, Sun, User, LogOut, Settings, Bell, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/providers";
import { format } from "date-fns";
import { signOutAction } from "@/app/actions/auth-actions";
import { useToast } from "./use-toast";
import { useLanguage } from "@/app/providers";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { withI18nLoader } from '@/components/i18n-loader';

interface HeaderProps {
  onMenuClick?: () => void;
}

function getPageTitle(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "Dashboard";
  
  const title = parts[parts.length - 1]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  
  return title;
}

function HeaderComponent({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [time, setTime] = React.useState<string>("");
  const [date, setDate] = React.useState<string>("");
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  
  // Initialize notifications with empty array to avoid errors
  const notifications: { id: string; title: string; message: string; read: boolean; createdAt: string }[] = [];
  const markAsRead = (ids: string[]) => {
    // This is a placeholder function
    console.log("Marking as read:", ids);
  };
  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString());
      setDate(format(now, "EEEE, MMMM d, yyyy"));
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    
    setMounted(true);
    
    return () => clearInterval(interval);
  }, []);

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleSettingsClick = () => {
    router.push("/settings");
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const result = await signOutAction();
      
      if (result.success) {
        toast({
          title: t('common.loggedOut', 'Logged out'),
          description: t('common.loggedOutDesc', 'You have been successfully logged out'),
        });
        // Redirect to login page
        window.location.href = "/auth/login";
      } else {
        toast({
          title: t('common.error', 'Error'),
          description: result.error || t('common.logoutError', 'Failed to log out'),
          variant: "destructive",
        });
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('common.unexpectedError', 'An unexpected error occurred'),
        variant: "destructive",
      });
      setIsLoggingOut(false);
    }
  };

  if (!mounted) return null;

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60",
      theme === "light" 
        ? "border-gray-200 bg-white/80"
        : "border-gray-800 bg-gray-950/80"
    )}>
      <div className="container flex h-14 max-w-full items-center justify-between px-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "md:hidden",
              theme === "light" 
                ? "hover:bg-gray-100/50"
                : "hover:bg-gray-800/50"
            )} 
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Clock and date moved to the left */}
          <div className="hidden md:block mr-4">
            <div className={cn(
              "text-xl font-bold tracking-tighter",
              theme === "light" ? "text-gray-900" : "text-gray-50"
            )}>
              {time}
            </div>
            <div className={cn(
              "text-xs",
              theme === "light" ? "text-gray-600" : "text-gray-300"
            )}>
              {date}
            </div>
          </div>
          
          <h1 className={cn(
            "text-xl font-semibold tracking-tight truncate",
            theme === "light" ? "text-gray-900" : "text-gray-50"
          )}>
            {getPageTitle(pathname)}
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative rounded-full",
                  theme === "light" 
                    ? "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-50"
                )}
                title={t('common.language')}
              >
                <Languages className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className={cn(
                  "cursor-pointer",
                  language === "en" && "font-bold",
                  theme === "light" 
                    ? "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-50"
                )}
                onClick={() => setLanguage("en")}
              >
                🇺🇸 {t('common.english')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={cn(
                  "cursor-pointer",
                  language === "zh" && "font-bold",
                  theme === "light" 
                    ? "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-50"
                )}
                onClick={() => setLanguage("zh")}
              >
                🇨🇳 {t('common.chinese')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative rounded-full",
                  theme === "light" 
                    ? "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-50"
                )}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span 
                    className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center",
                      "bg-red-500 text-white"
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <h3 className="text-sm font-semibold">{t('common.notifications')}</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => markAsRead(notifications.map(n => n.id))}
                  >
                    {t('common.markAllAsRead', 'Mark all as read')}
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start gap-1 p-2"
                      onClick={() => !notification.read && markAsRead([notification.id])}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className={cn(
                          "text-sm font-medium",
                          !notification.read && "text-primary"
                        )}>
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="ml-auto text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">New</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                    {t('common.noNotifications')}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full",
              theme === "light" 
                ? "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-50"
            )}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title={theme === "light" ? t('common.darkMode') : t('common.lightMode')}
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "relative h-9 w-9 rounded-full",
                  theme === "light" 
                    ? "border-2 border-gray-200 hover:bg-gray-100/50"
                    : "border-2 border-gray-800 hover:bg-gray-800/50"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/images/default-avatar.png" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className={theme === "light" ? "border-gray-200" : "border-gray-800"}
            >
              <DropdownMenuItem 
                className={cn(
                  "cursor-pointer",
                  theme === "light" 
                    ? "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-50"
                )}
                onClick={handleProfileClick}
              >
                <User className="mr-2 h-4 w-4" />
                {t('common.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={cn(
                  "cursor-pointer",
                  theme === "light" 
                    ? "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-50"
                )}
                onClick={handleSettingsClick}
              >
                <Settings className="mr-2 h-4 w-4" />
                {t('common.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className={theme === "light" ? "bg-gray-200" : "bg-gray-800"} />
              <DropdownMenuItem 
                className={cn(
                  "cursor-pointer",
                  theme === "light" 
                    ? "hover:bg-red-50 text-red-600 hover:text-red-700"
                    : "hover:bg-red-950/50 text-red-400 hover:text-red-300"
                )}
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoggingOut ? t('common.loggingOut') : t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// Export the header component wrapped with the withI18nLoader HOC
export const Header = withI18nLoader(HeaderComponent); 