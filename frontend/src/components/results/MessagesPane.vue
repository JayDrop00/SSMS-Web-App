<template>
  <div class="messages-pane">
    <div v-for="(msg, index) in messages" :key="index" :class="msg.isError ? 'message-error' : 'message-info'">
      {{ msg.text }}
    </div>
    <div v-if="rowsAffected && rowsAffected.length" class="message-info">
      {{ rowsAffected.join(', ') }} rows affected
      <span v-if="durationMs"> — {{ durationMs }} ms</span>
    </div>
    <div v-else-if="durationMs" class="message-info">
      Completed in {{ durationMs }} ms
    </div>
  </div>
</template>

<script setup>
defineProps({
  messages: Array,
  rowsAffected: Array,
  durationMs: Number
});
</script>
