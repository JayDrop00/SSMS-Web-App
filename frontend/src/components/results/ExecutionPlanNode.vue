<template>
  <div class="plan-node">
    <div class="plan-node-header">
      <span>{{ node.physicalOp }}</span>
      <span class="plan-node-cost">{{ costPercent }}%</span>
    </div>
    <div class="plan-node-details">
      Logical: {{ node.logicalOp }} |
      Est. Rows: {{ node.estimateRows.toFixed(0) }} |
      Cost: {{ node.estimatedTotalSubtreeCost.toFixed(2) }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  node: Object,
  totalCost: Number
});

const costPercent = computed(() => {
  if (props.totalCost === 0) return 0;
  return ((props.node.estimatedTotalSubtreeCost / props.totalCost) * 100).toFixed(0);
});
</script>
