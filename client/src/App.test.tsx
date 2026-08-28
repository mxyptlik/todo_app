import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const todo = { id: 1, title: 'Read the brief', isDone: false, scheduledFor: null, durationMinutes: 30, meetingUrl: null, venue: null, reminderMinutes: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
const notificationStatus = { configured: false, publicKey: null, subscriptions: 0, unreadCount: 0 };
const reply = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => { vi.restoreAllMocks(); });
afterEach(cleanup);

describe('Daylist', () => {
  it('adds a task by keyboard', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch'); fetchMock.mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply(notificationStatus)).mockResolvedValueOnce(reply({ ...todo, id: 2, title: 'Write update' }, 201));
    const user = userEvent.setup(); render(<App />); await screen.findByText(/Your list is clear/i); await user.type(screen.getByLabelText('New item'), 'Write update{enter}'); expect(await screen.findByText('Write update')).toBeInTheDocument();
  });
  it('filters, toggles, and deletes a task', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch'); fetchMock.mockResolvedValueOnce(reply([todo, { ...todo, id: 2, title: 'Finished', isDone: true }])).mockResolvedValueOnce(reply(notificationStatus)).mockResolvedValueOnce(reply({ ...todo, isDone: true })).mockResolvedValueOnce(reply(undefined, 204));
    const user = userEvent.setup(); render(<App />); await screen.findByText('Read the brief'); fireEvent.click(screen.getByRole('button', { name: 'Active' })); expect(screen.queryByText('Finished')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'All' })); fireEvent.click(screen.getByLabelText('Mark Read the brief as completed')); await waitFor(() => expect(screen.getByLabelText('Mark Read the brief as active')).toBeChecked()); await user.click(screen.getByLabelText('Delete Read the brief')); await waitFor(() => expect(screen.queryByText('Read the brief')).not.toBeInTheDocument());
  });
  it('shows loading and keeps composer input when a network add fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch'); fetchMock.mockImplementationOnce(() => new Promise(() => undefined)); const mounted = render(<App />); expect(screen.getByRole('status')).toHaveTextContent('Loading your items'); mounted.unmount();
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline')); render(<App />); const user=userEvent.setup(); await user.type(screen.getByLabelText('New item'), 'Keep me'); await user.keyboard('{enter}'); expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(screen.getByLabelText('New item')).toHaveValue('Keep me');
  });
});
