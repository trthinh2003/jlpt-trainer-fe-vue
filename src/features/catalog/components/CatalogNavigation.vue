<script setup lang="ts">
import { catalog } from '../types'
</script>

<template>
  <nav class="catalog-navigation" aria-label="Kho học liệu">
    <RouterLink v-for="item in catalog" :key="item.route" :to="{ name: item.route }">{{ item.label }}</RouterLink>
  </nav>
</template>

<style scoped>
.catalog-navigation { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-bottom: 20px; }
.catalog-navigation a { padding: 5px 0; text-underline-offset: 5px; }
.catalog-navigation a[aria-current="page"] { color: #b7282e; font-weight: 700; }
</style>
