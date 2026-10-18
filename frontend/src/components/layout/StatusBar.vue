<template>
  <div class="status-bar">
    <div class="status-item">
      <span v-if="connection.loading">Connecting...</span>
      <span v-else-if="connection.connected">{{ connection.server }} | {{ connection.database }}</span>
      <span v-else>Disconnected</span>
    </div>
    <div class="status-item" v-if="activeTab && activeTab.rowsAffected.length">
      {{ activeTab.rowsAffected.join(', ') }} rows affected
    </div>
    <div class="status-item" v-if="activeTab && activeTab.durationMs">
      {{ activeTab.durationMs }} ms
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useConnectionStore } from '../../stores/connection';
import { useQueryTabsStore } from '../../stores/queryTabs';
const connection = useConnectionStore();
const queryTabs = useQueryTabsStore();

const activeTab = computed(() => queryTabs.activeTab);
</script>


