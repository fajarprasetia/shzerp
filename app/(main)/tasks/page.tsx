"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TaskForm } from "./components/task-form";
import { TaskFilters } from "./components/task-filters";
import { TaskSort } from "./components/task-sort";
import { TaskStats } from "./components/task-stats";
import { TaskBoard } from "./components/task-board";
import { TaskCalendar } from "./components/task-calendar";
import { Task } from "@/types/task";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { useTaskData } from "./hooks/use-task-data";
import { Plus, Filter, CalendarDays, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { withPermission } from "@/app/components/with-permission";
import { PermissionGate } from "@/app/components/permission-gate";

// Create a new task template with required fields
const createNewTask = (): Partial<Task> => ({
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: new Date(),
  tags: []
});

function TasksPage() {
  const { data: tasks = [], isLoading, isError, mutate } = useTaskData();
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = React.useState<Partial<Task> | null>(null);
  const [filteredTasks, setFilteredTasks] = React.useState<Task[]>([]);
  const [sortedTasks, setSortedTasks] = React.useState<Task[]>([]);
  const [showMobileCalendar, setShowMobileCalendar] = React.useState(false);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Track if this is the initial render to prevent unnecessary updates
  const isInitialRender = React.useRef(true);

  // Initialize filtered and sorted tasks when tasks data changes
  React.useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
    }
    
    // Only update if we have tasks
    if (tasks && tasks.length > 0) {
      setFilteredTasks(tasks);
      setSortedTasks(tasks);
    }
  }, [tasks]);

  const handleSearch = React.useCallback((query: string) => {
    if (!query) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredTasks(filtered);
    setSortedTasks(filtered);
  }, [tasks]);

  const handleFilterStatus = React.useCallback((statuses: string[]) => {
    if (statuses.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) => statuses.includes(task.status));
    setFilteredTasks(filtered);
    setSortedTasks(filtered);
  }, [tasks]);

  const handleFilterPriority = React.useCallback((priorities: string[]) => {
    if (priorities.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) => priorities.includes(task.priority));
    setFilteredTasks(filtered);
    setSortedTasks(filtered);
  }, [tasks]);

  const handleFilterCategory = React.useCallback((categories: string[]) => {
    if (categories.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) => 
      task.category && categories.includes(task.category)
    );
    setFilteredTasks(filtered);
    setSortedTasks(filtered);
  }, [tasks]);

  const handleFilterTags = React.useCallback((tags: string[]) => {
    if (tags.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) =>
      task.tags?.some((taskTag) => tags.includes(taskTag))
    );
    setFilteredTasks(filtered);
    setSortedTasks(filtered);
  }, [tasks]);

  const handleSort = React.useCallback((sorted: Task[]) => {
    setSortedTasks(sorted);
  }, []);

  const handleTaskUpdate = React.useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error("Failed to update task");
      await mutate();
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const handleSubmit = React.useCallback(async (data: Partial<Task>) => {
    try {
      setIsSubmitting(true);
      const isNewTask = !selectedTask?.id;
      const response = await fetch(isNewTask ? "/api/tasks" : `/api/tasks/${selectedTask?.id}`, {
        method: isNewTask ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to save task");
      }

      await mutate();
      setSelectedTask(null);
      toast.success(isNewTask ? "Task created successfully" : "Task updated successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTask, mutate]);

  const handleDelete = React.useCallback(async (taskId: string) => {
    if (!taskId) {
      toast.error("Invalid task ID");
      return;
    }
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/tasks/${taskId}`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete task");
      }
      
      await mutate();
      setSelectedTask(null);
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete task");
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  // Function to check if a date has tasks using date-fns
  const hasTasksOnDate = React.useCallback((date: Date) => {
    return tasks.some((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, date);
    });
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error loading tasks</AlertTitle>
          <AlertDescription>
            Failed to load tasks. Please try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <Sheet open={showMobileCalendar} onOpenChange={setShowMobileCalendar}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <CalendarDays className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Calendar</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <TaskCalendar
                  tasks={tasks}
                  selectedDate={selectedDate}
                  onDateSelect={(date) => date && setSelectedDate(date)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <TaskFilters
                  onSearch={handleSearch}
                  onFilterStatus={handleFilterStatus}
                  onFilterPriority={handleFilterPriority}
                  onFilterCategory={handleFilterCategory}
                  onFilterTags={handleFilterTags}
                  onReset={() => {
                    setFilteredTasks(tasks);
                    setSortedTasks(tasks);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
            <Button 
              onClick={() => setSelectedTask(createNewTask())} 
              className="bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Task
            </Button>
            <DialogContent className="sm:max-w-[600px] bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {selectedTask?.id ? "Edit Task" : "Add New Task"}
                </DialogTitle>
                <DialogDescription>
                  {selectedTask?.id 
                    ? "Update the details of your task below." 
                    : "Fill in the details below to create a new task."}
                </DialogDescription>
              </DialogHeader>
              <TaskForm
                initialData={selectedTask || undefined}
                onSubmit={handleSubmit}
                onCancel={() => setSelectedTask(null)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-[280px,1fr]">
        {/* Left Sidebar - Calendar & Stats */}
        <div className="hidden md:flex flex-col gap-4">
          <Card className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">Calendar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TaskCalendar
                tasks={tasks}
                selectedDate={selectedDate}
                onDateSelect={(date) => date && setSelectedDate(date)}
              />
            </CardContent>
          </Card>
          <Card className="p-4">
            <TaskStats tasks={filteredTasks} />
          </Card>
        </div>

        {/* Main Content - Task Board */}
        <div className="space-y-4">
          <Card className="p-4">
            <TaskFilters
              onSearch={handleSearch}
              onFilterStatus={handleFilterStatus}
              onFilterPriority={handleFilterPriority}
              onFilterCategory={handleFilterCategory}
              onFilterTags={handleFilterTags}
              onReset={() => {
                setFilteredTasks(tasks);
                setSortedTasks(tasks);
              }}
            />
          </Card>
          
          {/* Mobile Stats */}
          <div className="block md:hidden">
            <Card className="p-4">
              <TaskStats tasks={filteredTasks} />
            </Card>
          </div>

          {filteredTasks.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                title="No matching tasks"
                description="Try adjusting your filters to find what you're looking for"
                icon="alertTriangle"
                action={{
                  label: "Reset Filters",
                  onClick: () => {
                    setFilteredTasks(tasks);
                    setSortedTasks(tasks);
                  },
                }}
              />
            </Card>
          ) : (
            <Card className="p-4">
              <TaskSort tasks={filteredTasks} onSort={handleSort} className="mb-4" />
              <TaskBoard
                tasks={sortedTasks}
                selectedDate={selectedDate}
                onTaskUpdate={handleTaskUpdate}
                onTaskSelect={setSelectedTask}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap the component with the withPermission HOC
export default withPermission(TasksPage, "tasks", "read"); 