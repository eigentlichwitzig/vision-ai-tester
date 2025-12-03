<script setup lang="ts">
/**
 * ConnectivityBanner Component
 * Displays a persistent banner when Ollama server is offline
 * Shows error messages with troubleshooting guidance
 */

import { ref, computed } from 'vue'
import { useOllamaHealth } from '@/composables/useOllamaHealth'
import BaseButton from '@/components/base/BaseButton.vue'

const { isOnline, isChecking, error, checkHealth, getErrorGuidance } = useOllamaHealth()

// Local state for dismissal (reappears on page refresh if still offline)
const isDismissed = ref(false)

// Show banner when offline and not dismissed
const showBanner = computed(() => !isOnline.value && !isDismissed.value)

// Expand/collapse guidance details
const showDetails = ref(false)

// Get formatted guidance text
const guidanceText = computed(() => {
  if (!error.value) return ''
  return getErrorGuidance(error.value)
})

async function handleRetry(): Promise<void> {
  isDismissed.value = false
  await checkHealth()
}

function handleDismiss(): void {
  isDismissed.value = true
}

function toggleDetails(): void {
  showDetails.value = !showDetails.value
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    leave-active-class="transition-all duration-200 ease-in"
    enter-from-class="opacity-0 -translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-full"
  >
    <div
      v-if="showBanner"
      class="bg-red-50 border-b border-red-200"
      role="alert"
      aria-live="polite"
    >
      <div class="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Error message -->
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <span class="flex-shrink-0">
              <i class="pi pi-exclamation-circle text-red-600 text-xl" aria-hidden="true"></i>
            </span>
            <div class="min-w-0">
              <p class="font-medium text-red-800 truncate">
                {{ error?.message || 'Ollama server is not reachable' }}
              </p>
              <p class="text-sm text-red-600 mt-0.5">
                Start Ollama and click Retry to continue
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <BaseButton
              variant="primary"
              size="sm"
              :loading="isChecking"
              :disabled="isChecking"
              icon="refresh"
              @click="handleRetry"
            >
              Retry
            </BaseButton>
            
            <BaseButton
              variant="ghost"
              size="sm"
              @click="toggleDetails"
            >
              {{ showDetails ? 'Hide' : 'Show' }} Details
            </BaseButton>
            
            <button
              type="button"
              class="p-1.5 rounded-lg text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Dismiss"
              @click="handleDismiss"
            >
              <i class="pi pi-times text-sm" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <!-- Expandable troubleshooting details -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          leave-active-class="transition-all duration-150 ease-in"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-48"
          leave-from-class="opacity-100 max-h-48"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="showDetails && error?.guidance"
            class="mt-3 pt-3 border-t border-red-200 overflow-hidden"
          >
            <p class="text-sm font-medium text-red-800 mb-2">Troubleshooting Steps:</p>
            <ul class="text-sm text-red-700 space-y-1.5 list-none">
              <li
                v-for="(step, index) in error.guidance"
                :key="index"
                class="flex items-start gap-2"
              >
                <span class="flex-shrink-0 w-5 h-5 rounded-full bg-red-200 text-red-700 text-xs flex items-center justify-center font-medium">
                  {{ index + 1 }}
                </span>
                <span>{{ step }}</span>
              </li>
            </ul>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Ensure smooth height transitions */
.max-h-0 {
  max-height: 0;
}
.max-h-48 {
  max-height: 12rem;
}
</style>
