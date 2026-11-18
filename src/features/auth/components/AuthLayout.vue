<script setup lang="ts">
defineProps<{ title: string; stamp: string }>()
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" :aria-label="title">
      <div class="stamp" aria-hidden="true">{{ stamp }}</div>
      <h1>{{ title }}</h1>
      <p class="subtitle">日本語能力試験 · JLPT Trainer</p>
      <slot />
    </section>
  </main>
</template>
