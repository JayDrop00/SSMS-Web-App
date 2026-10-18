import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';

export const useConnectionStore = defineStore('connection', () => {
  const connected = ref(false);
  const server = ref(null);
  const database = ref(null);
  const loading = ref(true);
  const error = ref(null);

  async function checkStatus() {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.getStatus();
      connected.value = data.connected;
      server.value = data.server;
      database.value = data.database;
    } catch (err) {
      connected.value = false;
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function manualConnect(connectData) {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.connect(connectData);
      if (data.success) {
        connected.value = true;
        server.value = data.server;
        database.value = data.database;
        return true;
      } else {
        error.value = data.error;
        return false;
      }
    } catch (err) {
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function disconnect() {
    try {
      await api.disconnect();
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      connected.value = false;
      server.value = null;
      database.value = null;
    }
  }

  function setDatabase(db) {
    database.value = db;
  }

  return { connected, server, database, loading, error, checkStatus, manualConnect, disconnect, setDatabase };
});
