<script setup lang="ts">
/**
 * AppHeader Component
 * Application header with title, navigation, and Ollama status indicator
 */

import OllamaStatus from './OllamaStatus.vue'

interface Props {
  /** Application title */
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Vision AI Tester'
})
</script>

<template>
  <header class="bg-white border-b border-gray-200 shadow-sm">
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Left: Logo and Title -->
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <i class="pi pi-eye text-2xl text-primary-600" aria-hidden="true" />
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-bold text-gray-900">
              {{ title }}
            </h1>
            <p class="text-xs text-gray-500 hidden sm:block">
              Document extraction with Ollama
            </p>
          </div>
        </div>

        <!-- Right: Status and Actions -->
        <div class="flex items-center gap-4">
          <!-- Ollama Status -->
          <OllamaStatus />

          <!-- Navigation Links (optional) -->
          <nav class="hidden md:flex items-center gap-2">
            <router-link
              to="/"
              class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              active-class="text-primary-600 bg-primary-50"
            >
              Test Suite
            </router-link>
            <router-link
              to="/history"
              class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              active-class="text-primary-600 bg-primary-50"
            >
              History
            </router-link>
          </nav>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Header specific styles */
</style>
