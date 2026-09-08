import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncStatus = 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | undefined;
  status: AsyncStatus;
  error: Error | undefined;
  reload: () => void;
  /** Optimistic local override — used after create/update so the UI answers instantly. */
  setData: (updater: T | ((current: T | undefined) => T)) => void;
}

/**
 * Runs an async producer and exposes the three states every screen must handle.
 * `deps` follows the same rules as `useEffect`.
 */
export function useAsync<T>(producer: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T>();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState<Error>();
  const [nonce, setNonce] = useState(0);
  const producerRef = useRef(producer);
  producerRef.current = producer;

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setError(undefined);

    producerRef.current()
      .then((result) => {
        if (!alive) return;
        setDataState(result);
        setStatus('success');
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setError(cause instanceof Error ? cause : new Error('Falha ao carregar os dados.'));
        setStatus('error');
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const setData = useCallback((updater: T | ((current: T | undefined) => T)) => {
    setDataState((current) =>
      typeof updater === 'function' ? (updater as (c: T | undefined) => T)(current) : updater,
    );
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, status, error, reload, setData };
}
