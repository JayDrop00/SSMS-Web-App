<template>
  <div class="results-pane">
    <div class="results-tabs">
      <div
        class="results-tab"
        :class="{ active: activeTab?.activeResultTab === 'results' }"
        @click="activeTab.activeResultTab = 'results'"
      >
        Results
      </div>
      <div
        class="results-tab"
        :class="{ active: activeTab?.activeResultTab === 'messages' }"
        @click="activeTab.activeResultTab = 'messages'"
      >
        Messages
      </div>
      <div
        class="results-tab"
        :class="{ active: activeTab?.activeResultTab === 'plan' }"
        @click="activeTab.activeResultTab = 'plan'"
      >
        Execution Plan
      </div>
      <div
        class="results-tab"
        :class="{ active: activeTab?.activeResultTab === 'history' }"
        @click="activeTab.activeResultTab = 'history'"
      >
        History
      </div>
    </div>
    <div class="results-content">
      <div v-if="activeTab?.loading" class="loading">
        <span class="spinner"></span>
        <span class="loading-text">Executing...</span>
      </div>
      <template v-else>
        <div v-if="activeTab?.activeResultTab === 'results'">
          <ResultsGrid v-if="activeTab?.resultSets?.length" :resultSets="activeTab.resultSets" />
          <div v-else class="loading">No results</div>
        </div>
        <div v-else-if="activeTab?.activeResultTab === 'messages'" class="messages-pane">
          <MessagesPane :messages="activeTab?.messages" :rowsAffected="activeTab?.rowsAffected" :durationMs="activeTab?.durationMs" />
        </div>
        <div v-else-if="activeTab?.activeResultTab === 'plan'" class="plan-viewer">
          <ExecutionPlanViewer v-if="activeTab?.planXml" :planXml="activeTab.planXml" />
          <div v-else class="loading">No execution plan</div>
        </div>
        <div v-else-if="activeTab?.activeResultTab === 'history'" class="history-container">
          <QueryHistory />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useQueryTabsStore } from '../../stores/queryTabs';
import ResultsGrid from './ResultsGrid.vue';
import MessagesPane from './MessagesPane.vue';
import ExecutionPlanViewer from './ExecutionPlanViewer.vue';
import QueryHistory from './QueryHistory.vue';

const queryTabs = useQueryTabsStore();
const activeTab = computed(() => queryTabs.activeTab);
</script>

<style scoped>
.history-container {
  height: 100%;
  overflow: hidden;
}

.loading-text {
  margin-left: 8px;
}
</style>
