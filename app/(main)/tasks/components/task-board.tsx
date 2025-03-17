"use client";

import * as React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Task, TASK_STATUSES } from "@/types/task";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, CalendarIcon, GripVertical } from "lucide-react";

// Fallback constants in case the imports fail
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

interface TaskBoardProps {
  tasks: Task[];
  selectedDate: Date;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskSelect: (task: Task) => void;
}

export function TaskBoard({ tasks, selectedDate, onTaskUpdate, onTaskSelect }: TaskBoardProps) {
  // Use the imported constants or fallback to our local constants if they're undefined
  const statuses = TASK_STATUSES || FALLBACK_STATUSES;

  const columns = Object.entries(statuses).map(([value, { label, color }]) => ({
    id: value,
    title: label,
    color: color,
    tasks: tasks.filter((task) => task.status === value),
  }));

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as Task["status"];

    await onTaskUpdate(draggableId, { status: newStatus });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("h-2 w-2 rounded-full p-0", column.color)} />
                <h3 className="text-sm font-medium">{column.title}</h3>
                <Badge variant="outline" className="ml-2 px-2 py-0 text-xs font-normal">
                  {column.tasks.length}
                </Badge>
              </div>
            </div>
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex-1 overflow-y-auto p-4"
                  style={{ minHeight: "200px" }}
                >
                  {column.tasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "group mb-3 rounded-lg border bg-card p-3 shadow-sm transition-all w-full",
                            snapshot.isDragging && "shadow-md",
                            !snapshot.isDragging && "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              {...provided.dragHandleProps}
                              className="mt-1.5 opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2.5" onClick={() => onTaskSelect(task)}>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-medium line-clamp-2 break-words">
                                  {task.title}
                                </h4>
                                {task.priority && (
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "shrink-0 px-2 py-0 text-xs whitespace-nowrap",
                                      task.priority === "high"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                        : task.priority === "medium"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                        : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    )}
                                  >
                                    {task.priority}
                                  </Badge>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                {task.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.category}
                                  </Badge>
                                )}
                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {task.tags.slice(0, 2).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {task.tags.length > 2 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                        +{task.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              {task.dueDate && (
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="whitespace-nowrap">{format(new Date(task.dueDate), "h:mm a")}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="whitespace-nowrap">{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {column.tasks.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground">No tasks</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
} 