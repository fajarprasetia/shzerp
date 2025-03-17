import useSWR from 'swr';
import { useState, useCallback } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
  userId: string;
}

export function useFinanceNotifications() {
  const { data, error, mutate } = useSWR<{ notifications: Notification[] }>(
    '/api/finance/notifications',
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const res = await fetch('/api/finance/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (!res.ok) throw new Error('Failed to mark notifications as read');

      // Update local state
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            notifications: prev.notifications.map((notification) => {
              if (notificationIds.includes(notification.id)) {
                return { ...notification, read: true };
              }
              return notification;
            }),
          };
        },
        false // Don't revalidate
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [mutate]);

  return {
    notifications: data?.notifications || [],
    isLoading: !error && !data,
    isError: error,
    markAsRead,
  };
} 