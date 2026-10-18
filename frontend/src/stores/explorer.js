import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';

export const useExplorerStore = defineStore('explorer', () => {
  const databases = ref([]);
  const expandedNodes = ref(new Set());
  const loadingNodes = ref(new Set());
  const treeData = ref({});

  async function loadDatabases() {
    try {
      const data = await api.getDatabases();
      databases.value = data.databases;
    } catch (err) {
      console.error('Failed to load databases:', err);
    }
  }

  async function loadTables(db) {
    const key = `${db}/tables`;
    if (treeData.value[key]) return treeData.value[key];

    loadingNodes.value.add(key);
    try {
      const data = await api.getTables(db);
      treeData.value[key] = data.tables;
      return data.tables;
    } finally {
      loadingNodes.value.delete(key);
    }
  }

  async function loadViews(db) {
    const key = `${db}/views`;
    if (treeData.value[key]) return treeData.value[key];

    loadingNodes.value.add(key);
    try {
      const data = await api.getViews(db);
      treeData.value[key] = data.views;
      return data.views;
    } finally {
      loadingNodes.value.delete(key);
    }
  }

  async function loadProcedures(db) {
    const key = `${db}/procedures`;
    if (treeData.value[key]) return treeData.value[key];

    loadingNodes.value.add(key);
    try {
      const data = await api.getProcedures(db);
      treeData.value[key] = data.procedures;
      return data.procedures;
    } finally {
      loadingNodes.value.delete(key);
    }
  }

  async function loadFunctions(db) {
    const key = `${db}/functions`;
    if (treeData.value[key]) return treeData.value[key];

    loadingNodes.value.add(key);
    try {
      const data = await api.getFunctions(db);
      treeData.value[key] = data.functions;
      return data.functions;
    } finally {
      loadingNodes.value.delete(key);
    }
  }

  async function loadColumns(db, schema, table) {
    const key = `${db}/${schema}/${table}/columns`;
    if (treeData.value[key]) return treeData.value[key];

    loadingNodes.value.add(key);
    try {
      const data = await api.getColumns(db, schema, table);
      treeData.value[key] = data.columns;
      return data.columns;
    } finally {
      loadingNodes.value.delete(key);
    }
  }

  async function loadIndexes(db, schema, table) {
    const key = `${db}/${schema}/${table}/indexes`;
    if (treeData.value[key]) return treeData.value[key];

    loadingNodes.value.add(key);
    try {
      const data = await api.getIndexes(db, schema, table);
      treeData.value[key] = data.indexes;
      return data.indexes;
    } finally {
      loadingNodes.value.delete(key);
    }
  }

  function reset() {
    databases.value = [];
    treeData.value = {};
    expandedNodes.value = new Set();
    loadingNodes.value = new Set();
  }

  function toggleNode(key) {
    if (expandedNodes.value.has(key)) {
      expandedNodes.value.delete(key);
    } else {
      expandedNodes.value.add(key);
    }
  }

  function isExpanded(key) {
    return expandedNodes.value.has(key);
  }

  function isLoading(key) {
    return loadingNodes.value.has(key);
  }

  return {
    databases, expandedNodes, loadingNodes, treeData,
    loadDatabases, loadTables, loadViews, loadProcedures, loadFunctions,
    loadColumns, loadIndexes, reset, toggleNode, isExpanded, isLoading
  };
});
