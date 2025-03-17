import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  CreditCard, 
  BarChart3, 
  FileText, 
  Package, 
  Users, 
  Calendar, 
  AlertTriangle,
  Wallet,
  FileCheck,
  LucideIcon
} from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const iconMap: Record<string, LucideIcon> = {
  "receipt": Receipt,
  "credit-card": CreditCard,
  "chart-bar": BarChart3,
  "file": FileText,
  "package": Package,
  "users": Users,
  "calendar": Calendar,
  "alertTriangle": AlertTriangle,
  "bankNote": Wallet,
  "fileCheck": FileCheck,
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const Icon = iconMap[icon] || FileText;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-6">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {action && (
        action.href ? (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
} 