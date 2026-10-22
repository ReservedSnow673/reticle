import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchStatus } from '../../daemon/binding/daemon-status-probe.js';
import { waitForNewSession } from './open-wait.js';

vi.mock('../../daemon/binding/daemon-status-probe.js', () => ({
  fetchStatus: vi.fn(),
  summarizeStatus: (payload: unknown) => {
    const body = payload as { sessions?: { sessionId: string }[]; whyLead?: string };
    const sessions = body.sessions ?? [];
    return {
      sessionCount: sessions.length,
      sessions,
      ...(body.whyLead === undefined ? {} : { whyLead: body.whyLead }),
    };
  },
}));

const fetch = vi.mocked(fetchStatus);

describe('waitForNewSession', () => {
  afterEach(() => {
    vi.useRealTimers();
    fetch.mockReset();
  });

  it('keeps the refusal lead when the wait ends with no new session', async () => {
    vi.useFakeTimers();
    const whyLead =
      'the page dialled this daemon and was REFUSED because the wire contract does not match.';
    fetch.mockResolvedValue({ whyLead, sessions: [] });
    const pending = waitForNewSession(4400, 0);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(pending).resolves.toEqual({ connected: false, whyLead });
  });

  it('reports connected and drops the lead once a new session is listed', async () => {
    vi.useFakeTimers();
    fetch.mockResolvedValue({
      whyLead: 'was REFUSED',
      sessions: [{ sessionId: 's1' }],
    });
    const pending = waitForNewSession(4400, 0);
    await vi.advanceTimersByTimeAsync(400);
    await expect(pending).resolves.toEqual({ connected: true });
  });
});
