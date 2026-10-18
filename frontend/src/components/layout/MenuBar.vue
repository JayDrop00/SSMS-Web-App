<template>
  <div class="menu-bar">
    <div class="menu-item" @click="handleMenu('file')">File</div>
    <div class="menu-item" @click="handleMenu('edit')">Edit</div>
    <div class="menu-item" @click="handleMenu('view')">View</div>
    <div class="menu-item" @click="handleMenu('query')">Query</div>
    <div class="menu-item" @click="handleMenu('tools')">Tools</div>
    <div class="menu-item" @click="handleMenu('window')">Window</div>
    <div class="menu-item" @click="handleMenu('help')">Help</div>
  </div>
</template>

<script setup>
import { useQueryTabsStore } from '../../stores/queryTabs';

const queryTabs = useQueryTabsStore();

function handleMenu(menu) {
  switch (menu) {
    case 'file':
      queryTabs.createTab();
      break;
    case 'query':
      if (queryTabs.activeTab) {
        queryTabs.executeQuery(queryTabs.activeTabId);
      }
      break;
  }
}
</script>
