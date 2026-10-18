<template>
  <div class="toolbar">
    <button class="toolbar-btn" @click="$emit('toggle-explorer')" title="Toggle Object Explorer">
      <span>&#128193;</span> Explorer
    </button>
    <div class="toolbar-separator"></div>
    <button class="toolbar-btn" @click="newQuery" title="New Query">
      <span>&#128196;</span> New Query
    </button>
    <div class="toolbar-separator"></div>
    <button class="toolbar-btn" @click="execute" :disabled="!canExecute" title="Execute (F5)">
      <span>&#9654;</span> Execute
    </button>
    <button class="toolbar-btn" @click="stop" :disabled="!canStop" title="Stop">
      <span>&#9632;</span> Stop
    </button>
    <div class="toolbar-separator"></div>
    <span class="toolbar-db-indicator" :title="currentDatabase ? `Database: ${currentDatabase}` : 'No database selected'">
      {{ currentDatabase || '—' }}
    </span>
    <div class="toolbar-spacer"></div>
    <div class="theme-switch" @click="themeStore.toggleTheme()" :title="themeStore.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
      <span class="theme-switch-icon sun">&#9728;</span>
      <span class="theme-switch-icon moon">&#9790;</span>
      <span class="theme-switch-thumb" :class="{ dark: themeStore.theme === 'dark' }"></span>
    </div>
    <div class="toolbar-separator"></div>
    <button class="toolbar-btn" @click="showLogoutConfirm = true" :disabled="!connection.connected" title="Log Out">
      <span>&#9211;</span> Log Out
    </button>
    <ConfirmDialog
      :visible="showLogoutConfirm"
      title="Log Out"
      :message="logoutMessage"
      @confirm="logout"
      @cancel="showLogoutConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useConnectionStore } from '../../stores/connection';
import { useQueryTabsStore } from '../../stores/queryTabs';
import { useThemeStore } from '../../stores/theme';
import ConfirmDialog from '../common/ConfirmDialog.vue';

defineEmits(['toggle-explorer']);

const connection = useConnectionStore();
const queryTabs = useQueryTabsStore();
const themeStore = useThemeStore();

const showLogoutConfirm = ref(false);

const logoutMessage = computed(() => {
  let message = `Log out of '${connection.server}'?\n\nAll query tabs, results, and history will be closed.`;
  if (queryTabs.tabs.some(t => t.dirty)) {
    message += '\n\nYou have unsaved queries that will be lost.';
  }
  return message;
});

async function logout() {
  showLogoutConfirm.value = false;
  await connection.disconnect();
}

const currentDatabase = computed(() => queryTabs.activeTab?.database || connection.database);

const canExecute = computed(() => {
  return connection.connected && queryTabs.activeTab && !queryTabs.activeTab.loading;
});

const canStop = computed(() => {
  return queryTabs.activeTab?.loading && Boolean(queryTabs.activeTab?.executionId);
});

function newQuery() {
  queryTabs.createTab(connection.database || null);
}

function execute() {
  if (queryTabs.activeTab) {
    queryTabs.executeQuery(queryTabs.activeTabId);
  }
}

function stop() {
  if (queryTabs.activeTabId) {
    queryTabs.cancelQuery(queryTabs.activeTabId);
  }
}
</script>

<style scoped>
.toolbar-spacer {
  flex: 1;
}

.theme-switch {
  position: relative;
  width: 44px;
  height: 22px;
  background: #a0a0a0;
  border: 1px solid #888;
  border-radius: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 3px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .theme-switch {
  background: var(--bg-active);
  border-color: var(--border-color);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
}

.theme-switch:hover {
  background: #909090;
}

[data-theme="dark"] .theme-switch:hover {
  background: var(--border-input);
}

.theme-switch-icon {
  position: absolute;
  font-size: 11px;
  line-height: 1;
  z-index: 1;
  pointer-events: none;
}

.theme-switch-icon.sun {
  left: 6px;
  color: #f0c040;
  text-shadow: 0 0 2px rgba(240, 192, 64, 0.4);
}

.theme-switch-icon.moon {
  right: 5px;
  color: #d0d0d0;
  text-shadow: 0 0 2px rgba(200, 200, 200, 0.3);
}

.theme-switch-thumb {
  position: absolute;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--bg-surface);
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transition: transform 0.25s ease;
  z-index: 2;
}

.theme-switch-thumb.dark {
  transform: translateX(22px);
}
</style>
