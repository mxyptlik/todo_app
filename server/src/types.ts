export type Todo = {
  id: number;
  title: string;
  isDone: boolean;
  scheduledFor: string | null;
  durationMinutes: number;
  meetingUrl: string | null;
  venue: string | null;
  reminderMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoInput = {
  title: string;
  scheduledFor?: string | null;
  durationMinutes?: number;
  meetingUrl?: string | null;
  venue?: string | null;
  reminderMinutes?: number | null;
};

export type TodoUpdate = Partial<TodoInput> & { isDone?: boolean };

export type TodoStatus = 'all' | 'active' | 'completed';

export interface TodoRepository {
  list(status: TodoStatus): Promise<Todo[]>;
  get(id: number): Promise<Todo | null>;
  create(input: TodoInput): Promise<Todo>;
  update(id: number, input: TodoUpdate): Promise<Todo | null>;
  toggle(id: number): Promise<Todo | null>;
  delete(id: number): Promise<boolean>;
}
