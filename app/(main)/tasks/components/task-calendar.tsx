'use client';

import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { format, isSameDay } from 'date-fns';
import { Task } from '@/types/task';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

interface TaskCalendarProps {
  tasks: Task[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function TaskCalendar({ tasks, selectedDate, onDateSelect }: TaskCalendarProps) {
  // Function to check if a date has tasks
  const hasTasksOnDate = (date: Date) => {
    return tasks.some((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, date);
    });
  };

  // Function to get task count for a date
  const getTaskCountForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, date);
    }).length;
  };

  // Custom tile content to show task indicators
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const taskCount = getTaskCountForDate(date);
    if (taskCount === 0) return null;
    
    return (
      <div className="task-indicator-container">
        <div className="task-indicator">
          <span className="task-count">{taskCount}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="task-calendar-wrapper">
      <Calendar
        onChange={onDateSelect}
        value={selectedDate}
        tileContent={tileContent}
        prevLabel={<ChevronLeft className="h-4 w-4" />}
        nextLabel={<ChevronRight className="h-4 w-4" />}
        prev2Label={null}
        next2Label={null}
        formatShortWeekday={(locale, date) => format(date, 'EEEEE')}
        formatMonthYear={(locale, date) => format(date, 'MMMM yyyy')}
        className="react-calendar"
      />
      <style jsx global>{`
        .task-calendar-wrapper {
          width: 100%;
        }
        
        .react-calendar {
          width: 100%;
          max-width: 100%;
          background: transparent;
          border: none;
          font-family: inherit;
          line-height: 1.5;
        }
        
        .react-calendar__navigation {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
          height: 40px;
        }
        
        .react-calendar__navigation button {
          min-width: 40px;
          background: none;
          font-size: 14px;
          border-radius: 0.375rem;
          color: var(--foreground);
        }
        
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: var(--accent);
        }
        
        .react-calendar__navigation button[disabled] {
          opacity: 0.5;
        }
        
        .react-calendar__navigation__label {
          font-weight: 500;
          font-size: 0.875rem;
        }
        
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--muted-foreground);
          margin-bottom: 0.5rem;
        }
        
        .react-calendar__month-view__weekdays__weekday {
          padding: 0.5rem;
        }
        
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        
        .react-calendar__month-view__days__day {
          padding: 0.5rem;
          border-radius: 0.375rem;
          height: 36px;
          width: 36px;
          font-size: 0.875rem;
          color: var(--foreground);
        }
        
        .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--muted-foreground);
          opacity: 0.5;
        }
        
        .react-calendar__tile {
          max-width: 100%;
          text-align: center;
          padding: 0.5rem 0;
          background: none;
          position: relative;
        }
        
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: var(--accent);
          border-radius: 0.375rem;
        }
        
        .react-calendar__tile--now {
          font-weight: bold;
          color: var(--primary);
        }
        
        .react-calendar__tile--active {
          background-color: var(--primary);
          color: var(--primary-foreground);
          border-radius: 0.375rem;
        }
        
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background-color: var(--primary);
        }
        
        .task-indicator-container {
          display: flex;
          justify-content: center;
          position: absolute;
          bottom: 2px;
          left: 0;
          right: 0;
        }
        
        .task-indicator {
          width: 16px;
          height: 16px;
          background-color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .task-count {
          font-size: 9px;
          color: var(--primary-foreground);
          font-weight: bold;
        }
      `}</style>
    </div>
  );
} 