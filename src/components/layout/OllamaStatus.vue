<script setup lang="ts">
/**
 * OllamaStatus Component
 * Small indicator showing real-time Ollama server status
 * Shows: 🟢 Connected, 🔴 Offline, 🟡 Checking...
 */

import { computed } from 'vue'
import { useOllamaHealth } from '@/composables/useOllamaHealth'

const { isOnline, isChecking, checkHealth } = useOllamaHealth()

// Status configuration
const status = computed(() => {
  if (isChecking.value) {
    return {
      color: 'yellow',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-400',
      containerBg: 'bg-yellow-50',
      label: 'Checking...',
      icon: 'pi-spin pi-spinner'
    }
  }
  
  if (isOnline.value) {
    return {
      color: 'green',
      bgColor: 'bg-green-500',
      textColor: 'text-green-700',
      borderColor: 'border-green-400',
      containerBg: 'bg-green-50',
      label: 'Ollama Connected',
      icon: 'pi-check-circle'
    }
  }
  
  return {
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-400',
    containerBg: 'bg-red-50',
    label: 'Ollama Offline',
    icon: 'pi-times-circle'
  }
})

async function handleClick(): Promise<void> {
  if (!isChecking.value) {
    await checkHealth()
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
    :class="[
      status.containerBg,
      status.textColor,
      status.borderColor,
      'border',
      isChecking ? 'cursor-wait' : 'cursor-pointer hover:opacity-80'
    ]"
    :aria-label="`Ollama status: ${status.label}. Click to refresh.`"
    :disabled="isChecking"
    @click="handleClick"
  >
    <!-- Status indicator dot -->
    <span
      class="relative flex h-2.5 w-2.5"
    >
      <!-- Ping animation for online status -->
      <span
        v-if="isOnline && !isChecking"
        class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        :class="status.bgColor"
      ></span>
      <span
        class="relative inline-flex rounded-full h-2.5 w-2.5"
        :class="status.bgColor"
      ></span>
    </span>
    
    <!-- Status text -->
    <span class="hidden sm:inline">{{ status.label }}</span>
    
    <!-- Icon on mobile -->
    <i
      :class="['pi', status.icon, 'sm:hidden']"
      aria-hidden="true"
    ></i>
  </button>
</template>

<style scoped>
/* Custom ping animation for status indicator */
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
</style>
