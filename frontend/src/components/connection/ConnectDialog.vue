<template>
  <div class="dialog-overlay" @click.self="!force && $emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span class="dialog-title">Connect to Server</span>
        <button v-if="!force" class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div v-if="error" class="error-message">{{ error }}</div>
        <div class="form-group">
          <label class="form-label">Server name:</label>
          <input class="form-input" v-model="form.server" placeholder="localhost" />
        </div>
        <div class="form-group">
          <label class="form-label">Port:</label>
          <input class="form-input" v-model="form.port" placeholder="1433" />
        </div>
        <div class="form-group">
          <label class="form-label">Login:</label>
          <input class="form-input" v-model="form.user" placeholder="sa" />
        </div>
        <div class="form-group">
          <label class="form-label">Password:</label>
          <input class="form-input" type="password" v-model="form.password" />
        </div>
        <div class="form-group">
          <label class="form-label">Database (optional):</label>
          <input class="form-input" v-model="form.database" placeholder="master" />
        </div>
      </div>
      <div class="dialog-footer">
        <button v-if="!force" class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="connect" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Connect</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useConnectionStore } from '../../stores/connection';

const emit = defineEmits(['close']);

defineProps({
  force: { type: Boolean, default: false }
});

const connection = useConnectionStore();

const loading = ref(false);
const error = ref(null);

const form = ref({
  server: 'localhost',
  port: '1433',
  user: '',
  password: '',
  database: 'master'
});

async function connect() {
  loading.value = true;
  error.value = null;

  try {
    const success = await connection.manualConnect(form.value);
    if (success) {
      emit('close');
    } else {
      error.value = connection.error;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>
