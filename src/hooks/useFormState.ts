import { useCallback, useRef, useState } from "react";

export function useFormState<T extends Record<string, unknown>>(initial: T) {
  const initialRef = useRef(initial);
  const [values, setValues] = useState<T>(initial);

  const update = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback((overrides?: Partial<T>) => {
    setValues({ ...initialRef.current, ...(overrides ?? {}) });
  }, []);

  const setAll = useCallback((next: T) => {
    setValues(next);
  }, []);

  return { values, update, reset, setAll };
}
