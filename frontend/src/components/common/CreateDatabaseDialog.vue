<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('cancel')">
    <div class="dialog" style="min-width: 400px;">
      <div class="dialog-header">
        <span class="dialog-title">New Database</span>
        <button class="dialog-close" @click="$emit('cancel')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label class="form-label">Database name</label>
          <input
            ref="nameInput"
            class="form-input"
            v-model="dbName"
            placeholder="Enter database name"
            @keydown.enter="handleCreate"
            :class="{ 'input-error': error }"
          />
          <div v-if="error" class="field-error">{{ error }}</div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn" @click="$emit('cancel')">Cancel</button>
        <button class="btn btn-primary" @click="handleCreate" :disabled="!dbName.trim()">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['confirm', 'cancel']);

const dbName = ref('');
const error = ref('');
const nameInput = ref(null);

watch(() => props.visible, (val) => {
  if (val) {
    dbName.value = '';
    error.value = '';
    nextTick(() => {
      if (nameInput.value) nameInput.value.focus();
    });
  }
});

function handleCreate() {
  const name = dbName.value.trim();

  if (!name) {
    error.value = 'Database name is required.';
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    error.value = 'Use only letters, numbers, and underscores.';
    return;
  }

  if (name.length > 128) {
    error.value = 'Name must be 128 characters or less.';
    return;
  }

  error.value = '';
  emit('confirm', name);
}
</script>

<style scoped>
.field-error {
  color: var(--error);
  font-size: 11px;
  margin-top: 4px;
}

.input-error {
  border-color: var(--error) !important;
}
</style>
