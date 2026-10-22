import { fetchStatus, summarizeStatus } from '../../daemon/binding/daemon-status-probe.js';

/** How long `reticle open` waits for the launched page to register before reporting on it. */
const OPEN_SESSION_WAIT_MS = 8000;

/**
 * Poll until a NEW session shows up, or the wait runs out.
 *
 * Compares against the count taken before launching rather than against zero, so opening a second
 * app while one is already connected is not reported as an instant success. The last no-session
 * lead rides back with a miss, so the note can quote a refusal the daemon recorded during the wait.
 */
export async function waitForNewSession(
  port: number,
  before: number,
): Promise<{ connected: boolean; whyLead?: string }> {
  const deadline = Date.now() + OPEN_SESSION_WAIT_MS;
  let whyLead: string | undefined;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const status = summarizeStatus(await fetchStatus(port));
    if (status.sessions.length > before) return { connected: true };
    if (status.whyLead !== undefined) whyLead = status.whyLead;
  }
  return whyLead === undefined ? { connected: false } : { connected: false, whyLead };
}
