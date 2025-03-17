"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task, TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskStatsProps {
  tasks: Task[];
  className?: string;
}

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

export function TaskStats({ tasks, className }: TaskStatsProps) {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading to ensure all constants are loaded
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats = React.useMemo(() => {
    if (isLoading) return null;

    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "done").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Use the imported constants or fallback to our local constants if they're undefined
    const priorities = TASK_PRIORITIES || FALLBACK_PRIORITIES;
    const statuses = TASK_STATUSES || FALLBACK_STATUSES;

    const priorityDistribution = Object.entries(priorities).map(([value, { label, color }]) => ({
      value,
      label,
      color,
      count: tasks.filter((task) => task.priority === value).length,
      percentage: total > 0 ? Math.round((tasks.filter((task) => task.priority === value).length / total) * 100) : 0,
    }));

    const statusDistribution = Object.entries(statuses).map(([value, { label, color }]) => ({
      value,
      label,
      color,
      count: tasks.filter((task) => task.status === value).length,
      percentage: total > 0 ? Math.round((tasks.filter((task) => task.status === value).length / total) * 100) : 0,
    }));

    return {
      total,
      completed,
      completionRate,
      priorityDistribution,
      statusDistribution,
    };
  }, [tasks, isLoading]);

  if (isLoading) {
    return (
      <div className={cn("grid gap-4", className)}>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex flex-col">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-8 mt-1" />
                </div>
                <div className="flex flex-col">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-8 mt-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn("grid gap-4", className)}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Task Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              Unable to load task statistics
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", className)}>
      {/* Overview Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Task Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Completion Rate</p>
              <span className="text-2xl font-bold">{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Total Tasks</span>
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Completed</span>
                <span className="text-2xl font-bold">{stats.completed}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Distribution Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.priorityDistribution.map(({ value, label, color, count, percentage }) => (
              <div key={value} className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("h-2 w-2 rounded-full p-0", color)}>
                      <span className="sr-only">{label}</span>
                    </Badge>
                    <span className="text-sm font-medium">{label} ({count})</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-1" style={{ backgroundColor: `${color}20` }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.statusDistribution.map(({ value, label, color, count, percentage }) => (
              <div key={value} className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("h-2 w-2 rounded-full p-0", color)}>
                      <span className="sr-only">{label}</span>
                    </Badge>
                    <span className="text-sm font-medium">{label} ({count})</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-1" style={{ backgroundColor: `${color}20` }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 