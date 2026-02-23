import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetUseCachedFetchStateForTests, useCachedFetch, type UseCachedFetchOptions } from './useCachedFetch';

type HookSnapshot = {
  data: unknown;
  loading: boolean;
  error: string | null;
};

interface ProbeProps {
  id: string;
  url: string | null;
  options?: UseCachedFetchOptions;
  onUpdate: (id: string, snapshot: HookSnapshot) => void;
}

function Probe({ id, url, options, onUpdate }: ProbeProps) {
  const state = useCachedFetch<unknown>(url, options);

  useEffect(() => {
    onUpdate(id, {
      data: state.data,
      loading: state.loading,
      error: state.error?.message ?? null,
    });
  }, [id, onUpdate, state.data, state.loading, state.error]);

  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mockJsonResponse<T>(payload: T): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => payload,
  } as Response;
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useCachedFetch', () => {
  let container: HTMLDivElement;
  let root: Root;
  const snapshots = new Map<string, HookSnapshot>();

  const renderProbes = async (opts: {
    showA?: boolean;
    showB?: boolean;
    showC?: boolean;
    url?: string | null;
    options?: UseCachedFetchOptions;
  } = {}) => {
    const {
      showA = false,
      showB = false,
      showC = false,
      url = '/api/test',
      options = {},
    } = opts;

    await act(async () => {
      root.render(
        <>
          {showA ? <Probe id="a" url={url} options={options} onUpdate={(id, snap) => snapshots.set(id, snap)} /> : null}
          {showB ? <Probe id="b" url={url} options={options} onUpdate={(id, snap) => snapshots.set(id, snap)} /> : null}
          {showC ? <Probe id="c" url={url} options={options} onUpdate={(id, snap) => snapshots.set(id, snap)} /> : null}
        </>
      );
    });
  };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    snapshots.clear();
    __resetUseCachedFetchStateForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    snapshots.clear();
    __resetUseCachedFetchStateForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('does not abort a shared deduped request when one consumer unmounts', async () => {
    const responseDeferred = deferred<Response>();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((resolve, reject) => {
        const onAbort = () => reject(new Error('aborted'));
        signal?.addEventListener('abort', onAbort, { once: true });
        responseDeferred.promise
          .then(resolve)
          .catch(reject)
          .finally(() => signal?.removeEventListener('abort', onAbort));
      });
    });

    await renderProbes({
      showA: true,
      showB: true,
      options: { deduplicate: true, useLocalStorage: false, timeout: 1000 },
    });
    await flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Unmount the first consumer while the shared request is still in flight.
    await renderProbes({
      showA: false,
      showB: true,
      options: { deduplicate: true, useLocalStorage: false, timeout: 1000 },
    });

    responseDeferred.resolve(mockJsonResponse({ ok: true, source: 'shared' }));
    await flushMicrotasks();
    await flushMicrotasks();

    expect(snapshots.get('b')).toMatchObject({
      data: { ok: true, source: 'shared' },
      error: null,
      loading: false,
    });
  });

  it('cleans up timed-out deduped requests so a later consumer can retry', async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      callCount += 1;
      if (callCount === 1) {
        const signal = init?.signal as AbortSignal | undefined;
        return new Promise<Response>((_resolve, reject) => {
          const onAbort = () => reject(new Error('timeout/aborted'));
          signal?.addEventListener('abort', onAbort, { once: true });
        });
      }
      return Promise.resolve(mockJsonResponse({ ok: true, callCount }));
    });

    await renderProbes({
      showA: true,
      showB: true,
      url: '/api/shared-timeout',
      options: { deduplicate: true, useLocalStorage: false, timeout: 25 },
    });
    await flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30);
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushMicrotasks();

    expect(snapshots.get('a')?.loading).toBe(false);
    expect(snapshots.get('b')?.loading).toBe(false);
    expect(snapshots.get('a')?.error).toBeTruthy();
    expect(snapshots.get('b')?.error).toBeTruthy();

    // A subsequent consumer should start a fresh request after timeout cleanup.
    await renderProbes({
      showA: false,
      showB: false,
      showC: true,
      url: '/api/shared-timeout',
      options: { deduplicate: true, useLocalStorage: false, timeout: 25 },
    });
    await flushMicrotasks();
    await flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(snapshots.get('c')).toMatchObject({
      data: { ok: true, callCount: 2 },
      error: null,
      loading: false,
    });
  });
});
