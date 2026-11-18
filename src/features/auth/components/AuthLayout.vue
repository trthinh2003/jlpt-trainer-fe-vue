<script setup lang="ts">
defineProps<{ title: string; stamp?: string }>()
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" :aria-label="title">
      <div v-if="stamp" class="auth-logo stamp" lang="ja" aria-hidden="true">{{ stamp }}</div>
      <img v-else class="auth-logo" src="/jlpt-mark.svg" width="56" height="56" alt="" />
      <h1>{{ title }}</h1>
      <p class="subtitle">日本語能力試験 · JLPT Trainer</p>
      <slot />
    </section>
  </main>
</template>
