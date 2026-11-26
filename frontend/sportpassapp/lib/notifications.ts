import { apiFetch } from './api';

export type NotificationItem = {
  id: string;
  requestId: string;
  type: 'request_approved' | 'request_rejected';
  message: string;
  createdAt: string;
  readAt: string | null;
};

export type MyNotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

export const fetchMyNotifications = () =>
  apiFetch<MyNotificationsResponse>('/me/notifications');

export const markMyNotificationAsRead = (id: string) =>
  apiFetch<NotificationItem>('/me/notifications/' + id + '/read', { method: 'PATCH' });
