<template>
  <div v-if="visible" class="context-menu" :style="{ top: y + 'px', left: x + 'px' }" @click.stop>
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.separator" class="context-menu-separator"></div>
      <div
        v-else
        class="context-menu-item"
        :class="{ disabled: item.disabled }"
        @click="handleClick(item)"
      >
        <span v-if="item.icon" class="context-menu-icon" v-html="item.icon"></span>
        {{ item.label }}
      </div>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
  x: Number,
  y: Number,
  items: Array
});

const emit = defineEmits(['select', 'close']);

function handleClick(item) {
  if (item.disabled) return;
  emit('select', item);
  emit('close');
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px var(--shadow-dialog);
  z-index: 2000;
  min-width: 160px;
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  color: var(--text-primary);
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.context-menu-item.disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.context-menu-icon {
  width: 16px;
  text-align: center;
}

.context-menu-separator {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}
</style>
