import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref('light');

  function init() {
    const saved = localStorage.getItem('ssms-theme');
    if (saved) {
      theme.value = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme.value = 'dark';
    }
    applyTheme();
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    localStorage.setItem('ssms-theme', theme.value);
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.dataset.theme = theme.value;
  }

  return { theme, init, toggleTheme };
});
