import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal mutation hook — plain fetch, NO caching, NO optimistic updates.
 *
 * `mutate(...args)` runs the function once, tracks `loading`/`error`, and
 * re-throws so call sites can handle failure inline.
 *
 * @param {(...args: any[]) => Promise<any>} fn
 */
export default function useMutation(fn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      setData(result);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, data, reset };
}
