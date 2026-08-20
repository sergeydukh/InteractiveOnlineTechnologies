import { describe, expect, it, vi } from 'vitest';
import { AnalyticsProbe } from '../../src/test-support/analyticsProbe';
import type { AnalyticsApi } from '../../src/api/services/analyticsApi';
import type { AnalyticsEvent } from '../../src/api/contracts';

const registerEvent: AnalyticsEvent = {
  type: 'register',
  timestamp: '2026-08-18T10:00:00.000Z',
  email: 'qa@example.com',
};
const todoEvent: AnalyticsEvent = {
  type: 'todoCreate',
  status: 'success',
  timestamp: '2026-08-18T10:01:00.000Z',
  email: 'qa@example.com',
};

describe('AnalyticsProbe', () => {
  it('waits until every requested event predicate is satisfied', async () => {
    const getEvents = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, data: [registerEvent] })
      .mockResolvedValueOnce({ ok: true, status: 200, data: [registerEvent, todoEvent] });
    const delay = vi.fn().mockResolvedValue(undefined);
    const probe = new AnalyticsProbe({ getEvents } as unknown as AnalyticsApi, delay);

    const events = await probe.waitForAll(
      [(event) => event.type === 'register', (event) => event.type === 'todoCreate'],
      1_000,
      1,
    );

    expect(events).toEqual([registerEvent, todoEvent]);
    expect(delay).toHaveBeenCalledTimes(1);
  });

  it('observes absence over the complete configured window', async () => {
    const getEvents = vi.fn().mockResolvedValue({ ok: true, status: 200, data: [registerEvent] });
    const probe = new AnalyticsProbe({ getEvents } as unknown as AnalyticsApi, vi.fn());

    await expect(probe.observeAbsence((event) => event.type === 'todoDelete', 0, 0)).resolves.toBe(true);
    expect(getEvents).toHaveBeenCalledTimes(1);
  });

  it('observes no additional matching event relative to a pre-action baseline', async () => {
    const getEvents = vi.fn().mockResolvedValue({ ok: true, status: 200, data: [todoEvent] });
    const action = vi.fn().mockResolvedValue(undefined);
    const probe = new AnalyticsProbe({ getEvents } as unknown as AnalyticsApi, vi.fn());

    await expect(probe.observeNoAdditional((event) => event.type === 'todoCreate', action, 0, 0)).resolves.toBe(true);
    expect(action).toHaveBeenCalledOnce();
    expect(getEvents).toHaveBeenCalledTimes(2);
  });

  it('detects a matching event added after the observed action', async () => {
    const laterTodoEvent: AnalyticsEvent = { ...todoEvent, timestamp: '2026-08-18T10:02:00.000Z' };
    const getEvents = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, data: [todoEvent] })
      .mockResolvedValueOnce({ ok: true, status: 200, data: [todoEvent, laterTodoEvent] });
    const probe = new AnalyticsProbe({ getEvents } as unknown as AnalyticsApi, vi.fn());

    await expect(probe.observeNoAdditional((event) => event.type === 'todoCreate', vi.fn(), 0, 0)).resolves.toBe(false);
  });
});
