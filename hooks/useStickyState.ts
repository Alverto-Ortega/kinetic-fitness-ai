import { useState, useEffect } from 'react';

/**
 * A custom React hook that functions like `useState` but persists the state
 * to the browser's `localStorage`.
 * This allows state to be automatically saved and reloaded across browser sessions.
 * @param defaultValue The default value to use if no value is found in localStorage.
 * @param key The key to use for storing the value in localStorage.
 * @returns A stateful value, and a function to update it.
 */
export function useStickyState<T>(defaultValue: T, key: string) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null
        ? JSON.parse(stickyValue)
        : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
       console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, value]);
  
  return [value, setValue] as const;
}