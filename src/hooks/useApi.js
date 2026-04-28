import { useState, useEffect, useRef } from 'react';

export function useApi(fetchFn, deps = [], initialData = null) {
  const [data, setData]       = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [trigger, setTrigger] = useState(0);

  // Always keep a ref to the latest fetchFn without it being a dep itself
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchRef.current();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            err.message ||
            'An unexpected error occurred.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => { cancelled = true; };
  // trigger is included so refetch() causes a re-run.
  // deps are spread so callers can pass their own dependencies.
  // fetchRef.current is intentionally omitted — it's a ref, not state.
  }, [trigger, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = () => setTrigger(t => t + 1);

  return { data, loading, error, refetch };
}
