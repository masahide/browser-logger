import { writable, get } from 'svelte/store';

type Theme = 'light' | 'dark';

//export const theme = writable<Theme>('light');

// 1) OS の設定を取得
const prefersDark = (() => {
  // `window` が無い SSR/テスト環境でも落ちないようにガード
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
})();

// 2) ダークかどうかで初期値を決定
export const theme = writable<Theme>(prefersDark ? 'dark' : 'light');

export function initializeTheme(): void {
  const currentTheme = get(theme);
  const root = document.querySelector('div[data-theme]');
  if (root) {
    root.setAttribute('data-theme', currentTheme);
  }
}

export function toggleTheme(): void {
  theme.update(current => {
    const newTheme: Theme = current === 'light' ? 'dark' : 'light';
    const root = document.querySelector('div[data-theme]');
    if (root) {
      root.setAttribute('data-theme', newTheme);
    }
    return newTheme;
  });
}