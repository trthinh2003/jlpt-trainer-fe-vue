<script setup lang="ts">
defineProps<{ label: string; compact?: boolean }>()
</script>

<template>
  <div class="app-loading" :class="{ compact }" role="status">
    <img src="/jlpt-mark.svg" width="36" height="36" alt="" />
    <div class="loading-content">
      <span>{{ label }}</span>
      <div class="loading-track" aria-hidden="true"></div>
    </div>
  </div>
</template>

<style scoped>
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 112px;
  padding: 16px;
  color: #3c4a6b;
  font-weight: 700;
}
.compact { min-height: 0; justify-content: start; padding: 12px 0; }
.compact img { width: 28px; height: 28px; }
.loading-content { min-width: 0; width: min(100%, 14rem); }
.loading-track {
  height: 4px;
  margin-top: 7px;
  overflow: hidden;
  border-radius: 4px;
  background: #e8dccf;
}
.loading-track::after {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: #b7282e;
  content: '';
  animation: loading 1.25s ease-in-out infinite alternate;
}
@keyframes loading { to { transform: translateX(138%); } }
@media (prefers-reduced-motion: reduce) {
  .loading-track::after { animation: none; }
}
</style>
