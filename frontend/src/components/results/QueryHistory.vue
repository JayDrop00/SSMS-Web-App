<template>
  <div class="history-panel">
    <div class="history-header">
      <span>Query History</span>
      <button class="btn-clear" @click="history.clearHistory()" :disabled="!history.entries.length">Clear</button>
    </div>
    <div class="history-list">
      <div v-if="!history.entries.length" class="history-empty">No query history yet</div>
      <div
        v-for="entry in history.entries"
        :key="entry.id"
        class="history-entry"
        :class="{ error: !entry.success }"
      >
        <div class="history-meta">
          <span class="history-time">{{ entry.timestamp }}</span>
          <span class="history-db">{{ entry.database }}</span>
          <span class="history-duration">{{ entry.durationMs }}ms</span>
          <button class="btn-reuse" @click="reuseQuery(entry.sql)" title="Use this query">&#128260;</button>
          <button class="btn-remove" @click="history.removeEntry(entry.id)" title="Remove">&times;</button>
        </div>
        <div class="history-sql">{{ truncate(entry.sql, 120) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useHistoryStore } from '../../stores/history';
import { useQueryTabsStore } from '../../stores/queryTabs';

const history = useHistoryStore();
const queryTabs = useQueryTabsStore();

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function reuseQuery(sql) {
  queryTabs.createTab(null, sql);
}
</script>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-results-tabs);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.btn-clear {
  padding: 2px 8px;
  border: 1px solid var(--border-input);
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 11px;
  border-radius: 3px;
  color: var(--text-primary);
}

.btn-clear:hover:not(:disabled) {
  background: var(--bg-tab);
}

.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.history-entry {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-separator);
  cursor: default;
  color: var(--text-primary);
}

.history-entry:hover {
  background: var(--bg-surface-alt);
}

.history-entry.error {
  border-left: 3px solid var(--error);
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.history-time {
  color: var(--text-muted);
}

.history-db {
  background: var(--bg-tab);
  padding: 1px 6px;
  border-radius: 3px;
}

.history-duration {
  color: var(--accent);
}

.btn-reuse, .btn-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-reuse:hover { color: var(--accent); }
.btn-remove:hover { color: var(--error); }

.history-sql {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
