"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Box,
  ClipboardList,
  ShoppingCart,
  Users,
  Settings,
  Wallet,
  BarChart3,
  Menu,
  X,
  CreditCard,
  Receipt,
  PiggyBank,
  FileText,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { usePermissions } from "@/app/hooks/use-permissions";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface SidebarItemData {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: SidebarItemData[];
  resource?: string;
  action?: string;
}

interface SidebarItem extends SidebarItemData {
  icon?: React.ComponentType<{ className?: string }>;
}

const navigation: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    resource: "dashboard",
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Box,
    resource: "inventory",
    children: [
      { title: "Stock", href: "/inventory/stock", resource: "inventory" },
      { title: "Divided", href: "/inventory/divided", resource: "inventory" },
      { title: "Inspection", href: "/inventory/inspection", resource: "inventory" },
    ],
  },
  {
    title: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    resource: "sales",
    children: [
      { title: "Orders", href: "/sales/orders", resource: "sales" },
      { title: "Customers", href: "/sales/customers", resource: "sales" },
      { title: "Invoices", href: "/sales/invoices", resource: "sales" },
    ],
  },
  {
    title: "Finance",
    href: "/finance",
    icon: Wallet,
    resource: "finance",
    children: [
      { title: "Overview", href: "/finance", resource: "finance" },
      { 
        title: "Accounts Receivable", 
        href: "/finance/accounts-receivable",
        icon: Receipt,
        resource: "finance",
        children: [
          { title: "Sales Invoices", href: "/sales/invoices", resource: "sales" },
          { title: "Payments Received", href: "/finance/accounts-receivable?tab=payments", resource: "finance" },
          { title: "Aging Report", href: "/finance/accounts-receivable?tab=aging", resource: "finance" },
          { title: "Collections", href: "/finance/accounts-receivable?tab=collections", resource: "finance" },
        ]
      },
      { 
        title: "Accounts Payable", 
        href: "/finance/accounts-payable",
        icon: CreditCard,
        resource: "finance",
        children: [
          { title: "Vendor Bills", href: "/finance/accounts-payable", resource: "finance" },
          { title: "Payment Tracking", href: "/finance/accounts-payable?tab=payments", resource: "finance" },
          { title: "Aging Report", href: "/finance/accounts-payable?tab=aging", resource: "finance" },
        ]
      },
      { 
        title: "Cash Management", 
        href: "/finance/cash-management",
        icon: PiggyBank,
        resource: "finance",
        children: [
          { title: "Bank Accounts", href: "/finance/cash-management", resource: "finance" },
          { title: "Transactions", href: "/finance/cash-management?tab=transactions", resource: "finance" },
          { title: "Reconciliation", href: "/finance/cash-management?tab=reconciliation", resource: "finance" },
        ]
      },
      {
        title: "General Ledger",
        href: "/finance/general-ledger",
        icon: FileText,
        resource: "finance",
        children: [
          { title: "Chart of Accounts", href: "/finance/general-ledger", resource: "finance" },
          { title: "Journal Entries", href: "/finance/general-ledger?tab=journal-entries", resource: "finance" },
          { title: "General Ledger", href: "/finance/general-ledger?tab=general-ledger", resource: "finance" },
          { title: "Trial Balance", href: "/finance/general-ledger?tab=trial-balance", resource: "finance" },
        ]
      },
      { 
        title: "Reports", 
        href: "/finance/reports",
        icon: FileText,
        resource: "finance",
        children: [
          { title: "Profit & Loss", href: "/finance/reports?type=profit-loss", resource: "finance" },
          { title: "Balance Sheet", href: "/finance/reports?type=balance-sheet", resource: "finance" },
        ]
      },
    ],
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: ClipboardList,
    resource: "tasks",
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    resource: "users",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    resource: "settings",
  },
];

function SidebarItem({
  href,
  icon: Icon,
  title,
  children,
  resource,
  action = "read",
}: SidebarItem) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { hasPermission, isSystemAdmin, isAdmin, isLoading } = usePermissions();
  const isActive = pathname === href || pathname?.startsWith(href + "/");

  // Set initial open state after mounting to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
    setIsOpen(pathname.startsWith(href) && href !== "/");
  }, [pathname, href]);

  // Check if user has permission to see this item
  const hasAccess = React.useMemo(() => {
    if (isLoading) return false;
    if (!resource) return true;
    
    return isSystemAdmin || 
      (isAdmin && resource !== 'system') || 
      (resource === 'system' && isSystemAdmin) ||
      hasPermission(resource, action);
  }, [resource, action, hasPermission, isSystemAdmin, isAdmin, isLoading]);

  // Don't render if no access
  if (!hasAccess) {
    return null;
  }

  // Filter children based on permissions
  const filteredChildren = children?.filter(child => {
    if (!child.resource) return true;
    
    return isSystemAdmin || 
      (isAdmin && child.resource !== 'system') || 
      (child.resource === 'system' && isSystemAdmin) ||
      hasPermission(child.resource, child.action || 'read');
  });

  // If there are no children or all children are filtered out, render a simple link
  if (!filteredChildren?.length) {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive 
            ? "bg-accent text-accent-foreground" 
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </Link>
    );
  }

  // If there are children, render a collapsible section
  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          (isActive || isOpen)
            ? "bg-accent text-accent-foreground" 
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <div className="flex items-center gap-x-3">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {mounted && isOpen && (
        <div className="ml-4 space-y-1 border-l pl-3">
          {filteredChildren.map((child) => (
            <SidebarItem key={child.href} {...child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { isLoading } = usePermissions();
  
  // After mounting, we have access to the theme
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  if (isLoading) {
    return (
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card shadow-sm transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center space-x-2">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">SHZ</span>
            </div>
            <span className="text-xl font-bold">ERP System</span>
          </div>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </aside>
    );
  }
  
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card shadow-sm transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">SHZ</span>
            </div>
            <span className="text-xl font-bold">ERP System</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)] py-4">
          <nav className="space-y-2 px-2">
            {navigation.map((link) => (
              <SidebarItem key={link.href} {...link} />
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
} 