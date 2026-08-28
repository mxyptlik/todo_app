import {
  AlarmClock,
  Bell,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock3,
  Download,
  ListTodo,
  MapPin,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { notificationApi, todoApi } from "./api";
import type {
  NotificationEvent,
  NotificationStatus,
  ReminderMinutes,
  Todo,
  TodoFilter,
  TodoInput,
} from "./types";

const filters: { key: TodoFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];
const reminders: { value: ReminderMinutes; label: string }[] = [
  { value: 0, label: "At start time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
  { value: 10080, label: "1 week before" },
];
const timeSlots = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  const value = `${String(hours).padStart(2, "0")}:${minutes}`;
  const label = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, Number(minutes)));
  return { value, label };
});
const quickTimes = [
  { value: "09:00", label: "Morning" },
  { value: "12:00", label: "Noon" },
  { value: "15:00", label: "Afternoon" },
  { value: "18:00", label: "Evening" },
];
const formatSchedule = (todo: Todo) =>
  todo.scheduledFor
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(todo.scheduledFor))
    : null;
const localDateTimeIsValid = (value: string) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
};
const base64ToUint8Array = (base64: string) => {
  const normalized = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};
const notificationTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [view, setView] = useState<"tasks" | "agenda" | "alerts" | "history">("tasks");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [locationMode, setLocationMode] = useState<"none" | "venue" | "online">(
    "none",
  );
  const [venue, setVenue] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState<string>("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus | null>(null);
  const [notificationEvents, setNotificationEvents] = useState<
    NotificationEvent[]
  >([]);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setTodos(await todoApi.list());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Tasks could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };
  const loadNotificationStatus = async (quiet = false) => {
    try {
      setNotificationStatus(await notificationApi.status());
    } catch (cause) {
      if (!quiet)
        setError(
          cause instanceof Error
            ? cause.message
            : "Notification status could not be loaded.",
        );
    }
  };
  const loadNotificationEvents = async () => {
    setNotificationLoading(true);
    try {
      setNotificationEvents(await notificationApi.list());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Notifications could not be loaded.",
      );
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    void loadNotificationStatus(true);
    const refresh = window.setInterval(
      () => void loadNotificationStatus(true),
      15_000,
    );
    return () => window.clearInterval(refresh);
  }, []);
  useEffect(() => {
    if (view === "alerts" || view === "history") void loadNotificationEvents();
  }, [view]);

  const visible = useMemo(
    () =>
      todos.filter(
        (todo) =>
          filter === "all" ||
          (filter === "active" ? !todo.isDone : todo.isDone),
      ),
    [todos, filter],
  );
  const scheduled = useMemo(
    () =>
      todos
        .filter((todo) => todo.scheduledFor)
        .sort(
          (a, b) =>
            new Date(a.scheduledFor!).getTime() -
            new Date(b.scheduledFor!).getTime(),
        ),
    [todos],
  );
  const conflictingIds = useMemo(
    () =>
      new Set(
        scheduled
          .filter((todo, index) =>
            scheduled.some(
              (other, otherIndex) =>
                index !== otherIndex &&
                !todo.isDone &&
                !other.isDone &&
                new Date(todo.scheduledFor!).getTime() <
                  new Date(other.scheduledFor!).getTime() +
                    other.durationMinutes * 60_000 &&
                new Date(other.scheduledFor!).getTime() <
                  new Date(todo.scheduledFor!).getTime() +
                    todo.durationMinutes * 60_000,
            ),
          )
          .map((todo) => todo.id),
      ),
    [scheduled],
  );
  const completed = todos.filter((todo) => todo.isDone).length;
  const progress = todos.length
    ? Math.round((completed / todos.length) * 100)
    : 0;
  const unreadCount = notificationStatus?.unreadCount ?? 0;
  const dateTimeValue =
    scheduledDate && startTime ? `${scheduledDate}T${startTime}` : "";

  const clearScheduling = () => {
    setScheduledDate("");
    setStartTime("");
    setDurationMinutes("30");
    setLocationMode("none");
    setVenue("");
    setMeetingUrl("");
    setReminderMinutes("");
  };
  const add = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return setError("Add a task title first.");
    if (trimmed.length > 200)
      return setError("Task titles can be at most 200 characters.");
    if ((scheduledDate && !startTime) || (!scheduledDate && startTime))
      return setError("Choose both a date and a start time.");
    if (dateTimeValue && !localDateTimeIsValid(dateTimeValue))
      return setError("Choose a future date and time.");
    if (reminderMinutes && !dateTimeValue)
      return setError("Choose a date and time before setting a reminder.");
    if (locationMode === "venue" && !venue.trim())
      return setError("Add a venue or choose a different location type.");
    if (locationMode === "online" && !/^https?:\/\/.+/i.test(meetingUrl.trim()))
      return setError("Add a valid http or https meeting link.");
    const input: TodoInput = {
      title: trimmed,
      scheduledFor: dateTimeValue
        ? new Date(dateTimeValue).toISOString()
        : null,
      durationMinutes: Number(durationMinutes),
      venue: locationMode === "venue" ? venue.trim() : null,
      meetingUrl: locationMode === "online" ? meetingUrl.trim() : null,
      reminderMinutes: reminderMinutes
        ? (Number(reminderMinutes) as ReminderMinutes)
        : null,
    };
    setSaving(true);
    setError("");
    try {
      const created = await todoApi.create(input);
      setTodos((current) => [created, ...current]);
      setTitle("");
      clearScheduling();
      setDetailsOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The task could not be added.",
      );
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (todo: Todo) => {
    setPendingId(todo.id);
    setError("");
    try {
      const updated = await todoApi.update(todo.id, { isDone: !todo.isDone });
      setTodos((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The task could not be updated.",
      );
    } finally {
      setPendingId(null);
    }
  };
  const remove = async (todo: Todo) => {
    setPendingId(todo.id);
    setError("");
    try {
      await todoApi.remove(todo.id);
      setTodos((current) => current.filter((item) => item.id !== todo.id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The task could not be deleted.",
      );
    } finally {
      setPendingId(null);
    }
  };
  const enableNotifications = async () => {
    if (!notificationStatus?.configured)
      return setError(
        "Push is not configured on this server yet. Add VAPID keys to enable it.",
      );
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      return setError("This browser does not support push notifications.");
    setNotificationLoading(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notification permission was not granted. You can enable it later in your browser settings.",
        );
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(
            notificationStatus.publicKey!,
          ),
        }));
      await notificationApi.subscribe(subscription.toJSON());
      await loadNotificationStatus();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Push notifications could not be enabled.",
      );
    } finally {
      setNotificationLoading(false);
    }
  };
  const disableNotifications = async () => {
    setNotificationLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await notificationApi.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      await loadNotificationStatus();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Push notifications could not be disabled.",
      );
    } finally {
      setNotificationLoading(false);
    }
  };
  const markAllRead = async () => {
    setNotificationLoading(true);
    try {
      await notificationApi.markAllRead();
      setNotificationEvents((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      await loadNotificationStatus();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Notifications could not be marked as read.",
      );
    } finally {
      setNotificationLoading(false);
    }
  };
  const Task = ({ todo, agenda = false }: { todo: Todo; agenda?: boolean }) => (
    <li
      className={`task-card ${todo.isDone ? "done" : ""} ${conflictingIds.has(todo.id) ? "conflict" : ""}`}
    >
      <label className="task-toggle">
        <input
          type="checkbox"
          checked={todo.isDone}
          onChange={() => void toggle(todo)}
          disabled={pendingId === todo.id}
          aria-label={`Mark ${todo.title} as ${todo.isDone ? "active" : "completed"}`}
        />
        <span aria-hidden="true">
          <Check size={15} />
        </span>
      </label>
      <div className="task-copy">
        <span className="task-title">{todo.title}</span>
        {todo.scheduledFor && (
          <span className="task-meta">
            <CalendarDays size={14} aria-hidden="true" />
            {formatSchedule(todo)} · {todo.durationMinutes} min
          </span>
        )}
        {todo.venue && (
          <span className="task-meta">
            <MapPin size={14} aria-hidden="true" />
            {todo.venue}
          </span>
        )}
        {todo.meetingUrl && (
          <a
            className="task-meta meeting-link"
            href={todo.meetingUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Video size={14} aria-hidden="true" />
            Join meeting
          </a>
        )}
        {conflictingIds.has(todo.id) && agenda && (
          <span className="conflict-note">Overlaps another active item</span>
        )}
      </div>
      {todo.scheduledFor && (
        <a
          className="icon-action"
          href={`/api/todos/${todo.id}/calendar`}
          aria-label={`Export ${todo.title} to calendar`}
          title="Export to calendar"
        >
          <Download size={18} aria-hidden="true" />
        </a>
      )}
      <button
        className="delete"
        type="button"
        onClick={() => void remove(todo)}
        disabled={pendingId === todo.id}
        aria-label={`Delete ${todo.title}`}
        title="Delete item"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <main className="page-shell">
      <section
        className="workspace workspace-wide"
        aria-labelledby="page-title"
      >
        <header className="hero">
          <div>
            <p className="brand">DAYLIST / PERSONAL OPERATIONS</p>
            <h1 id="page-title">Make time for what matters.</h1>
            <p className="summary">
              {completed} of {todos.length} completed · {scheduled.length}{" "}
              scheduled
            </p>
          </div>
          <div className="progress-block">
            <span>Daily progress</span>
            <div
              className="progress"
              aria-label={`${completed} of ${todos.length} tasks completed`}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>
        <nav className="workspace-nav" aria-label="Workspace view">
          <button
            type="button"
            aria-pressed={view === "tasks"}
            onClick={() => setView("tasks")}
          >
            <ListTodo size={17} />
            Tasks
          </button>
          <button
            type="button"
            aria-pressed={view === "agenda"}
            onClick={() => setView("agenda")}
          >
            <CalendarDays size={17} />
            Agenda
          </button>
          <button
            type="button"
            className="alerts-tab"
            aria-pressed={view === "alerts"}
            onClick={() => setView("alerts")}
          >
            <Bell size={17} />
            Alerts
          </button>
          <button type="button" className="alerts-tab" aria-pressed={view === "history"} onClick={() => setView("history")} aria-label={`History${unreadCount ? `, ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : ""}`}>
            <span className="alerts-tab-icon"><Bell size={17} />{unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}</span>
            History
          </button>
        </nav>
        {view !== "alerts" && view !== "history" && (
          <form className="composer scheduling-composer" onSubmit={add}>
            <div className="composer-main">
              <label className="sr-only" htmlFor="new-task">
                New item
              </label>
              <input
                id="new-task"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder="What needs your attention?"
                disabled={saving}
              />
              <button type="submit" disabled={saving}>
                <Plus size={18} aria-hidden="true" />
                {saving ? "Adding…" : "Add item"}
              </button>
            </div>
            <button
              className="details-toggle"
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
              aria-expanded={detailsOpen}
            >
              <CalendarPlus size={17} />
              {detailsOpen ? "Hide schedule" : "Schedule it"}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {detailsOpen && (
              <div className="schedule-fields">
                <label>
                  Date
                  <input
                    type="date"
                    value={scheduledDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setScheduledDate(event.target.value)}
                  />
                </label>
                <fieldset className="time-field">
                  <legend>Start time</legend>
                  <div className="quick-times" aria-label="Quick start times">
                    {quickTimes.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={startTime === item.value ? "selected" : ""}
                        onClick={() => setStartTime(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <label className="exact-time">
                    <span>Or choose a time</span>
                    <select
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    >
                      <option value="">Choose a time</option>
                      {timeSlots.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                <label>
                  Duration
                  <select
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1½ hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </label>
                <label>
                  Reminder
                  <select
                    value={reminderMinutes}
                    onChange={(event) => setReminderMinutes(event.target.value)}
                  >
                    <option value="">No reminder</option>
                    {reminders.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="location-field">
                  <legend>Location</legend>
                  <div className="location-mode">
                    <label>
                      <input
                        type="radio"
                        checked={locationMode === "none"}
                        onChange={() => setLocationMode("none")}
                      />
                      None
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={locationMode === "venue"}
                        onChange={() => setLocationMode("venue")}
                      />
                      Venue
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={locationMode === "online"}
                        onChange={() => setLocationMode("online")}
                      />
                      Online
                    </label>
                  </div>
                </fieldset>
                {locationMode === "venue" && (
                  <label className="field-wide">
                    Venue
                    <input
                      value={venue}
                      onChange={(event) => setVenue(event.target.value)}
                      maxLength={200}
                      placeholder="e.g. Studio 4, 12 Kingsway"
                    />
                  </label>
                )}
                {locationMode === "online" && (
                  <label className="field-wide">
                    Meeting link
                    <input
                      type="url"
                      value={meetingUrl}
                      onChange={(event) => setMeetingUrl(event.target.value)}
                      maxLength={2048}
                      placeholder="https://meet.example.com/..."
                    />
                  </label>
                )}
                <button
                  className="clear-schedule"
                  type="button"
                  onClick={clearScheduling}
                >
                  Clear schedule
                </button>
              </div>
            )}
          </form>
        )}
        {error && (
          <div className="notice" role="alert">
            {error}
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}
        {view === "tasks" && (
          <>
            <nav className="filters" aria-label="Task filter">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={filter === item.key}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {loading ? (
              <p className="state" role="status">
                Loading your items…
              </p>
            ) : visible.length === 0 ? (
              <div className="state empty">
                <Check size={22} aria-hidden="true" />
                <p>
                  {todos.length
                    ? `No ${filter} items right now.`
                    : "Your list is clear. Add the first thing you want to remember."}
                </p>
              </div>
            ) : (
              <ul className="task-list" aria-label={`${filter} items`}>
                {visible.map((todo) => (
                  <Task key={todo.id} todo={todo} />
                ))}
              </ul>
            )}
          </>
        )}
        {view === "agenda" && (
          <section className="agenda" aria-labelledby="agenda-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Forward view</p>
                <h2 id="agenda-heading">Scheduled ahead</h2>
              </div>
              <span>
                <Clock3 size={16} />
                {scheduled.length} item{scheduled.length === 1 ? "" : "s"}
              </span>
            </div>
            {loading ? (
              <p className="state" role="status">
                Loading your agenda…
              </p>
            ) : scheduled.length === 0 ? (
              <div className="state empty">
                <CalendarDays size={22} aria-hidden="true" />
                <p>
                  No scheduled items yet. Open “Schedule it” to turn a task into
                  an event.
                </p>
              </div>
            ) : (
              <ul
                className="task-list agenda-list"
                aria-label="Scheduled items"
              >
                {scheduled.map((todo) => (
                  <Task key={todo.id} todo={todo} agenda />
                ))}
              </ul>
            )}
          </section>
        )}
        {view === "alerts" && (
          <section className="alerts-panel" aria-labelledby="alerts-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Reminder delivery</p>
                <h2 id="alerts-heading">Notification center</h2>
              </div>
              <Bell size={21} aria-hidden="true" />
            </div>
            {notificationLoading && !notificationStatus ? (
              <p className="state" role="status">
                Checking notification setup…
              </p>
            ) : (
              <>
                <div className="notification-status">
                  <AlarmClock size={22} aria-hidden="true" />
                  <div>
                    <strong>
                      {notificationStatus?.configured
                        ? notificationStatus.subscriptions
                          ? "Push reminders are on"
                          : "Ready for push reminders"
                        : "Push needs server setup"}
                    </strong>
                    <p>
                      {notificationStatus?.configured
                        ? "Daylist sends a real browser push at your selected reminder time, even when this tab is closed."
                        : "Set the VAPID environment variables shown in the README, then restart the API service."}
                    </p>
                  </div>
                </div>
                <div className="notification-actions">
                  {notificationStatus?.configured &&
                  notificationStatus.subscriptions > 0 ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void disableNotifications()}
                      disabled={notificationLoading}
                    >
                      Turn off this device
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void enableNotifications()}
                      disabled={
                        notificationLoading || !notificationStatus?.configured
                      }
                    >
                      <Bell size={17} />
                      Enable push reminders
                    </button>
                  )}
                </div>
                <div className="notification-history">
                  <div className="history-heading">
                    <h3>Recent reminders</h3>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void markAllRead()}
                        disabled={notificationLoading}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notificationLoading && notificationEvents.length === 0 ? (
                    <p className="notification-empty">Loading reminders…</p>
                  ) : notificationEvents.length === 0 ? (
                    <p className="notification-empty">
                      Delivered reminders will appear here.
                    </p>
                  ) : (
                    <ul>
                      {notificationEvents.map((item) => (
                        <li
                          key={item.id}
                          className={item.readAt ? "" : "unread"}
                        >
                          <span className="event-dot" aria-hidden="true" />
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.body}</p>
                            <time dateTime={item.sentAt}>
                              {notificationTime(item.sentAt)}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="notification-note">
                  Browsers can deny permission or revoke it later. Your
                  scheduled items remain intact, and the agenda still highlights
                  every reminder setting.
                </p>
              </>
            )}
          </section>
        )}
        {view === "history" && (
          <section className="alerts-panel notification-history-page" aria-labelledby="history-heading">
            <div className="section-heading"><div><p className="eyebrow">Delivered reminders</p><h2 id="history-heading">Notification history</h2></div><Bell size={21} aria-hidden="true" /></div>
            <div className="notification-history">
              <div className="history-heading"><h3>Recent reminders</h3>{unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} disabled={notificationLoading}>Mark all read</button>}</div>
              {notificationLoading && notificationEvents.length === 0 ? <p className="notification-empty">Loading reminders…</p> : notificationEvents.length === 0 ? <p className="notification-empty">Delivered reminders will appear here after your first push notification.</p> : <ul>{notificationEvents.map(item => <li key={item.id} className={item.readAt ? "" : "unread"}><span className="event-dot" aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.body}</p><time dateTime={item.sentAt}>{notificationTime(item.sentAt)}</time></div></li>)}</ul>}
            </div>
          </section>
        )}
        <p className="live" aria-live="polite">
          {error
            ? ""
            : saving
              ? "Adding item."
              : pendingId
                ? "Saving item update."
                : ""}
        </p>
      </section>
    </main>
  );
}
