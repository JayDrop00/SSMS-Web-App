<template>
  <div class="plan-viewer">
    <div v-if="planNodes.length">
      <PlanNode v-for="node in planNodes" :key="node.id" :node="node" :totalCost="totalCost" />
    </div>
    <div v-else class="loading">No execution plan data</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import PlanNode from './ExecutionPlanNode.vue';

const props = defineProps({
  planXml: String
});

function parsePlanXml(xml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const queryPlan = doc.querySelector('QueryPlan');
    if (!queryPlan) return [];

    const nodes = [];
    const relOps = queryPlan.querySelectorAll('RelOp');

    relOps.forEach(relOp => {
      const node = {
        id: relOp.getAttribute('NodeId'),
        physicalOp: relOp.getAttribute('PhysicalOp'),
        logicalOp: relOp.getAttribute('LogicalOp'),
        estimateRows: parseFloat(relOp.getAttribute('EstimateRows')) || 0,
        estimatedTotalSubtreeCost: parseFloat(relOp.getAttribute('EstimatedTotalSubtreeCost')) || 0,
        estimatedCPU: parseFloat(relOp.getAttribute('EstimatedCPU')) || 0,
        estimatedIO: parseFloat(relOp.getAttribute('EstimatedIO')) || 0,
        children: []
      };
      nodes.push(node);
    });

    return nodes;
  } catch (e) {
    console.error('Failed to parse execution plan:', e);
    return [];
  }
}

const planNodes = computed(() => parsePlanXml(props.planXml));
const totalCost = computed(() => planNodes.value.length > 0 ? planNodes.value[0].estimatedTotalSubtreeCost : 1);
</script>
