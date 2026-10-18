<template>
  <div>
    <div class="tree-node" :style="{ paddingLeft: (level * 16) + 'px' }" @click="handleClick" @dblclick="handleDblClick" @contextmenu.prevent="handleContextMenu">
      <span class="tree-toggle" v-if="canExpand" @click.stop="toggle">
        <span v-if="loading" class="spinner"></span>
        <span v-else-if="expanded">&#9660;</span>
        <span v-else>&#9654;</span>
      </span>
      <span v-else class="tree-toggle"></span>
      <span class="tree-icon" v-html="getIcon()"></span>
      <span>{{ label }}</span>
      <span v-if="suffix" class="tree-suffix">{{ suffix }}</span>
    </div>
    <div v-if="expanded" class="tree-children">
      <slot name="children"></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  label: String,
  icon: String,
  level: { type: Number, default: 0 },
  children: Array,
  expandable: Boolean,
  lazy: Function,
  suffix: String,
  nodeData: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['expand', 'dblclick', 'contextmenu']);

const expanded = ref(false);
const loading = ref(false);

const canExpand = computed(() => {
  return props.expandable || (props.children && props.children.length > 0) || props.lazy;
});

function getIcon() {
  const icons = {
    server: '&#128421;',
    database: '&#128451;',
    folder: '&#128193;',
    table: '&#128203;',
    view: '&#128065;',
    procedure: '&#9881;',
    function: '&#402;',
    column: '&#128196;',
    key: '&#128273;',
    index: '&#128269;'
  };
  return icons[props.icon] || '&#128196;';
}

async function toggle() {
  if (loading.value) return;

  if (props.lazy && !expanded.value) {
    loading.value = true;
    try {
      await props.lazy();
    } finally {
      loading.value = false;
    }
  }

  expanded.value = !expanded.value;
  if (expanded.value) {
    emit('expand');
  }
}

function expand() {
  if (!expanded.value) {
    toggle();
  }
}

function handleClick() {
  if (canExpand.value) {
    toggle();
  }
}

function handleDblClick() {
  emit('dblclick');
}

function handleContextMenu(event) {
  emit('contextmenu', { event, label: props.label, icon: props.icon, suffix: props.suffix, nodeData: props.nodeData });
}

defineExpose({ expand });
</script>

<style scoped>
.tree-suffix {
  color: var(--text-muted);
  margin-left: 4px;
  font-size: 11px;
}
</style>
