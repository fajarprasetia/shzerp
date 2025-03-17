"use client";

import * as React from "react";
import { Search, X, Filter, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_CATEGORIES } from "@/types/task";
import { cn } from "@/lib/utils";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";

// Fallback constants in case the imports fail
const FALLBACK_PRIORITIES = {
  'low': {
    label: 'Low',
    color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
  'medium': {
    label: 'Medium',
    color: 'bg-amber-200 text-amber-700 dark:bg-amber-700 dark:text-amber-200',
  },
  'high': {
    label: 'High',
    color: 'bg-red-200 text-red-700 dark:bg-red-700 dark:text-red-200',
  },
};

const FALLBACK_STATUSES = {
  'todo': {
    label: 'To Do',
    color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
  'in-progress': {
    label: 'In Progress',
    color: 'bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-200',
  },
  'review': {
    label: 'Review',
    color: 'bg-amber-200 text-amber-700 dark:bg-amber-700 dark:text-amber-200',
  },
  'done': {
    label: 'Done',
    color: 'bg-green-200 text-green-700 dark:bg-green-700 dark:text-green-200',
  },
};

const FALLBACK_CATEGORIES = {
  'work': {
    label: 'Work',
    color: 'bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-200',
  },
  'personal': {
    label: 'Personal',
    color: 'bg-purple-200 text-purple-700 dark:bg-purple-700 dark:text-purple-200',
  },
  'learning': {
    label: 'Learning',
    color: 'bg-green-200 text-green-700 dark:bg-green-700 dark:text-green-200',
  },
  'health': {
    label: 'Health',
    color: 'bg-red-200 text-red-700 dark:bg-red-700 dark:text-red-200',
  },
  'finance': {
    label: 'Finance',
    color: 'bg-emerald-200 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-200',
  },
  'other': {
    label: 'Other',
    color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
};

interface TaskFiltersProps {
  onSearch: (query: string) => void;
  onFilterStatus: (statuses: string[]) => void;
  onFilterPriority: (priorities: string[]) => void;
  onFilterCategory: (categories: string[]) => void;
  onFilterTags: (tags: string[]) => void;
  onReset: () => void;
}

export function TaskFilters({
  onSearch,
  onFilterStatus,
  onFilterPriority,
  onFilterCategory,
  onFilterTags,
  onReset,
}: TaskFiltersProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = React.useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  // Use the imported constants or fallback to our local constants if they're undefined
  const priorities = TASK_PRIORITIES || FALLBACK_PRIORITIES;
  const statuses = TASK_STATUSES || FALLBACK_STATUSES;
  const categories = TASK_CATEGORIES || FALLBACK_CATEGORIES;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    
    setSelectedStatuses(newStatuses);
    onFilterStatus(newStatuses);
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter((p) => p !== priority)
      : [...selectedPriorities, priority];
    
    setSelectedPriorities(newPriorities);
    onFilterPriority(newPriorities);
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
    onFilterCategory(newCategories);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedCategories([]);
    onReset();
  };

  const hasActiveFilters = selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedCategories.length > 0 || searchQuery.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
        
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
          
          {/* Mobile Filter Button */}
          <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="sm:hidden">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Status Filters */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statuses).map(([value, { label, color }]) => (
                      <Badge
                        key={value}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedStatuses.includes(value)
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "hover:bg-muted"
                        )}
                        style={
                          selectedStatuses.includes(value)
                            ? undefined
                            : { borderColor: color, color }
                        }
                        onClick={() => handleStatusToggle(value)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Priority Filters */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Priority</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(priorities).map(([value, { label, color }]) => (
                      <Badge
                        key={value}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedPriorities.includes(value)
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "hover:bg-muted"
                        )}
                        style={
                          selectedPriorities.includes(value)
                            ? undefined
                            : { borderColor: color, color }
                        }
                        onClick={() => handlePriorityToggle(value)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Category Filters */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categories).map(([value, { label, color }]) => (
                      <Badge
                        key={value}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedCategories.includes(value)
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "hover:bg-muted"
                        )}
                        style={
                          selectedCategories.includes(value)
                            ? undefined
                            : { borderColor: color, color }
                        }
                        onClick={() => handleCategoryToggle(value)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <SheetClose asChild>
                    <Button>Apply Filters</Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Desktop Filter Button */}
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>
      
      {/* Desktop Filters */}
      <div className="hidden sm:block space-y-4">
        {/* Status Filters */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Status</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statuses).map(([value, { label, color }]) => (
              <Badge
                key={value}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedStatuses.includes(value)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-muted"
                )}
                style={
                  selectedStatuses.includes(value)
                    ? undefined
                    : { borderColor: color, color }
                }
                onClick={() => handleStatusToggle(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Priority Filters */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Priority</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(priorities).map(([value, { label, color }]) => (
              <Badge
                key={value}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedPriorities.includes(value)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-muted"
                )}
                style={
                  selectedPriorities.includes(value)
                    ? undefined
                    : { borderColor: color, color }
                }
                onClick={() => handlePriorityToggle(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Category Filters */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Category</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categories).map(([value, { label, color }]) => (
              <Badge
                key={value}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedCategories.includes(value)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-muted"
                )}
                style={
                  selectedCategories.includes(value)
                    ? undefined
                    : { borderColor: color, color }
                }
                onClick={() => handleCategoryToggle(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 