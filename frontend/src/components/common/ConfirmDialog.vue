<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('cancel')">
    <div class="dialog" style="min-width: 360px;">
      <div class="dialog-header">
        <span class="dialog-title">{{ title }}</span>
        <button class="dialog-close" @click="$emit('cancel')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="confirm-message">{{ message }}</div>
      </div>
      <div class="dialog-footer">
        <button class="btn" @click="$emit('cancel')">Cancel</button>
        <button class="btn btn-danger" @click="$emit('confirm')">Confirm</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean,
  title: { type: String, default: 'Confirm Action' },
  message: String
});

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.confirm-message {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.btn-danger {
  background: var(--error);
  color: var(--text-on-accent);
  border-color: var(--error);
}

.btn-danger:hover {
  background: var(--error-hover);
}
</style>
