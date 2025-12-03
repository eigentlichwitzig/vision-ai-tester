<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useOllamaHealth } from '@/composables/useOllamaHealth'
import ConnectivityBanner from '@/components/layout/ConnectivityBanner.vue'

const { checkHealth } = useOllamaHealth()

// Check Ollama connectivity on app startup
onMounted(async () => {
  await checkHealth()
})
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <ConnectivityBanner />
    <RouterView />
  </div>
</template>

<style scoped>
</style>
