export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  tags?: string[];
  dueDate?: Date | string;
  assignedTo?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'work' | 'personal' | 'learning' | 'health' | 'finance' | 'other';

export const TASK_STATUSES = {
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

export const TASK_PRIORITIES = {
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

export const TASK_CATEGORIES = {
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

export const TASK_TAGS = [
  'urgent',
  'important',
  'meeting',
  'email',
  'call',
  'report',
  'presentation',
  'research',
  'development',
  'design',
  'testing',
  'documentation',
  'planning',
  'review',
]; 