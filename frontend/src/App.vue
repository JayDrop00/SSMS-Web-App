<template>
  <div class="app-container">
    <Toolbar @toggle-explorer="explorerVisible = !explorerVisible" />
    <div class="main-content">
      <div v-if="explorerVisible" class="object-explorer" :style="{ width: explorerWidth + 'px' }">
        <ObjectExplorer />
      </div>
      <div v-if="explorerVisible" class="resizer" @mousedown="startResize"></div>
      <div class="right-panel">
        <QueryTabStrip />
        <div class="editor-area" :style="{ flex: 1 }">
          <QueryEditor v-if="queryTabs.activeTab" />
          <div v-else class="loading">No query open. Click "New Query" to start.</div>
        </div>
        <div class="resizer-horizontal" @mousedown="startVerticalResize"></div>
        <ResultsPane v-if="queryTabs.activeTab" />
      </div>
    </div>
    <StatusBar />
    <ConnectDialog v-if="showConnectDialog" :force="forceConnect" @close="showConnectDialog = false" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useConnectionStore } from './stores/connection';
import { useExplorerStore } from './stores/explorer';
import { useQueryTabsStore } from './stores/queryTabs';
import { useHistoryStore } from './stores/history';
import Toolbar from './components/layout/Toolbar.vue';
import StatusBar from './components/layout/StatusBar.vue';
import ObjectExplorer from './components/explorer/ObjectExplorer.vue';
import QueryTabStrip from './components/editor/QueryTabStrip.vue';
import QueryEditor from './components/editor/QueryEditor.vue';
import ResultsPane from './components/results/ResultsPane.vue';
import ConnectDialog from './components/connection/ConnectDialog.vue';

const connection = useConnectionStore();
const explorer = useExplorerStore();
const queryTabs = useQueryTabsStore();
const history = useHistoryStore();

const showConnectDialog = ref(false);
const forceConnect = ref(false);
const explorerVisible = ref(true);
const explorerWidth = ref(250);
const resultsHeight = ref(250);

let resizing = false;
let resizingVertical = false;

function startResize(e) {
  resizing = true;
  const startX = e.clientX;
  const startWidth = explorerWidth.value;

  function onMove(e) {
    explorerWidth.value = Math.max(150, startWidth + (e.clientX - startX));
  }

  function onUp() {
    resizing = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startVerticalResize(e) {
  resizingVertical = true;
  const startY = e.clientY;

  function onMove(e) {
    const delta = startY - e.clientY;
    resultsHeight.value = Math.max(100, resultsHeight.value + delta);
  }

  function onUp() {
    resizingVertical = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

watch(() => connection.connected, (isConnected) => {
  if (isConnected) {
    showConnectDialog.value = false;
    forceConnect.value = false;
    explorer.loadDatabases();
    if (queryTabs.tabs.length === 0) {
      queryTabs.createTab(connection.database);
    }
  } else {
    explorer.reset();
    queryTabs.reset();
    history.clearHistory();
    forceConnect.value = true;
    showConnectDialog.value = true;
  }
});

onMounted(async () => {
  await connection.checkStatus();

  if (!connection.connected) {
    showConnectDialog.value = true;
  }
});
</script>
