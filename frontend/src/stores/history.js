import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useHistoryStore = defineStore('history', () => {
  const entries = ref([]);

  function addEntry(sql, database, durationMs, rowsAffected, success) {
    const entry = {
      id: Date.now(),
      sql,
      database,
      durationMs,
      rowsAffected,
      success,
      timestamp: new Date().toLocaleString()
    };
    entries.value.unshift(entry);
    if (entries.value.length > 100) {
      entries.value.pop();
    }
  }

  function clearHistory() {
    entries.value = [];
  }

  function removeEntry(id) {
    entries.value = entries.value.filter(e => e.id !== id);
  }

  return { entries, addEntry, clearHistory, removeEntry };
});
