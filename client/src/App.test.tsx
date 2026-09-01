import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const response = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => vi.restoreAllMocks());
afterEach(cleanup);
describe('lab todo app', () => {
  it('shows the version and adds a todo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response([])).mockResolvedValueOnce(response({ status: 'ok', version: 'abc1234' })).mockResolvedValueOnce(response({ id: 1, title: 'Write lab', is_done: false }, 201)).mockResolvedValueOnce(response([{ id: 1, title: 'Write lab', is_done: false }]));
    const user = userEvent.setup(); render(<App />);
    expect(await screen.findByText('abc1234')).toBeInTheDocument();
    await user.type(screen.getByLabelText('New todo'), 'Write lab{enter}');
    expect(await screen.findByText('Write lab')).toBeInTheDocument();
  });
});
