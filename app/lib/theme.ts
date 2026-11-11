'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'skytech-admin-theme';
const themeListeners = new Set<() => void>();

export const subscribeToTheme = (listener: () => void) => {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
};

export const getThemeSnapshot = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem('skytech-admin-theme-v2') !== '1') {
    window.localStorage.setItem(STORAGE_KEY, 'light');
    window.localStorage.setItem('skytech-admin-theme-v2', '1');
    document.documentElement.classList.remove('admin-dark-mode');
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === 'dark';
};

export const getServerThemeSnapshot = (): boolean => false;

export function setTheme(isDark: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('admin-dark-mode', isDark);
  themeListeners.forEach((listener) => listener());
}

export function toggleTheme() {
  setTheme(!getThemeSnapshot());
}

export function useTheme() {
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  return {
    isDark,
    isLight: !isDark,
    theme: isDark ? ('dark' as const) : ('light' as const),
    setTheme,
    toggleTheme,
  };
}

