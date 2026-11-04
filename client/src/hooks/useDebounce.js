import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce values (e.g. search input filters)
 * @param {any} value - The input value to debounce
 * @param {number} delay - Debounce latency in milliseconds (default 300ms)
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
