export type ReminderMinutes = 0 | 5 | 10 | 15 | 30 | 60 | 1440 | 10080;
export type TodoInput = { title: string; scheduledFor?: string | null; durationMinutes?: number; meetingUrl?: string | null; venue?: string | null; reminderMinutes?: ReminderMinutes | null };
export type Todo = TodoInput & { id: number; isDone: boolean; scheduledFor: string | null; durationMinutes: number; meetingUrl: string | null; venue: string | null; reminderMinutes: ReminderMinutes | null; createdAt: string; updatedAt: string };
export type TodoFilter = 'all' | 'active' | 'completed';
export type NotificationStatus = { configured: boolean; publicKey: string | null; subscriptions: number; unreadCount: number };
export type NotificationEvent = { id: number; todoId: number; title: string; body: string; sentAt: string; readAt: string | null };
