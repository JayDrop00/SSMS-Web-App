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
          <label class="form-label">Authentication:</label>
          <select class="form-input" v-model="form.authType">
            <option value="windows">Windows Authentication</option>
            <option value="sql">SQL Server Authentication</option>
          </select>
        </div>
        <div class="credentials-group" :class="{ disabled: isWindowsAuth }">
          <div class="form-group">
            <label class="form-label">Username:</label>
            <input
              class="form-input"
              :value="loginValue"
              :disabled="isWindowsAuth"
              :placeholder="isWindowsAuth ? 'Current user' : 'sa'"
              @input="form.user = $event.target.value"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Password:</label>
            <div class="password-wrapper">
              <input
                class="form-input"
                :type="showPassword ? 'text' : 'password'"
                v-model="form.password"
                :disabled="isWindowsAuth"
              />
              <button
                v-if="!isWindowsAuth"
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
          </div>
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
import { ref, computed, onMounted } from 'vue';
import { useConnectionStore } from '../../stores/connection';

const emit = defineEmits(['close']);

defineProps({
  force: { type: Boolean, default: false }
});

const connection = useConnectionStore();

const loading = ref(false);
const error = ref(null);
const showPassword = ref(false);

const form = ref({
  server: 'localhost',
  port: '1433',
  authType: 'windows',
  user: '',
  password: '',
  database: 'master'
});

const isWindowsAuth = computed(() => form.value.authType === 'windows');

const loginValue = computed(() =>
  isWindowsAuth.value ? connection.currentUser || '' : form.value.user
);

onMounted(async () => {
  if (!connection.currentUser) {
    await connection.checkStatus();
  }
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

<style scoped>
.credentials-group {
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: opacity 0.15s ease;
}

.credentials-group.disabled {
  opacity: 0.55;
}

.credentials-group .form-group:last-child {
  margin-bottom: 0;
}

.password-wrapper {
  position: relative;
}

.password-wrapper .form-input {
  padding-right: 32px;
}

.password-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

.password-toggle:hover {
  color: var(--text-primary);
}

.form-input:disabled {
  background: var(--bg-surface-alt);
  color: var(--text-disabled);
  cursor: not-allowed;
}
</style>
