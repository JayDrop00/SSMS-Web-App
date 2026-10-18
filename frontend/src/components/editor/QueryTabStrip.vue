<template>
  <div class="tab-strip">
    <div
      v-for="tab in queryTabs.tabs"
      :key="tab.id"
      class="tab"
      :class="{ active: tab.id === queryTabs.activeTabId }"
      @click="queryTabs.setActiveTab(tab.id)"
    >
      <span>{{ tab.title }}</span>
      <span v-if="tab.dirty" class="tab-dirty">*</span>
      <span class="tab-close" @click.stop="queryTabs.closeTab(tab.id)">&times;</span>
    </div>
    <div class="tab-add" @click="newTab">+</div>
  </div>
</template>

<script setup>
import { useQueryTabsStore } from '../../stores/queryTabs';
import { useConnectionStore } from '../../stores/connection';

const queryTabs = useQueryTabsStore();
const connection = useConnectionStore();

function newTab() {
  queryTabs.createTab(connection.database);
}
</script>

<style scoped>
.tab-dirty {
  color: var(--accent);
}
</style>
