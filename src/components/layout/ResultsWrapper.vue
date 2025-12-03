<script setup lang="ts">
/**
 * ResultsWrapper Component
 * Right panel containing test results with loading, empty, and results states
 */

import { ref, watch, onUnmounted, computed } from 'vue'
import ResultsPanel from '@/components/results/ResultsPanel.vue'
import LoadingIndicator from '@/components/base/LoadingIndicator.vue'
import { useTestStore } from '@/stores/testStore'
import { useTestRunner } from '@/composables/useTestRunner'

const testStore = useTestStore()
const { isRunning, currentStep, progressPercent, canCancel, cancelExecution } = useTestRunner()

// Elapsed time tracking
const elapsedTime = ref(0)
let timer: number | null = null

// Start/stop timer based on running state
watch(isRunning, (running) => {
  if (running) {
    elapsedTime.value = 0
    timer = window.setInterval(() => {
      elapsedTime.value++
    }, 1000)
  } else {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

// Computed
const hasResults = computed(() => testStore.currentTestRun !== null)
const showEmpty = computed(() => !isRunning.value && !hasResults.value)
const showLoading = computed(() => isRunning.value)
const showResults = computed(() => !isRunning.value && hasResults.value)

// Methods
function handleCancel(): void {
  if (confirm('Are you sure you want to cancel this test?')) {
    cancelExecution()
  }
}
</script>

<template>
  <div class="results-wrapper h-full flex flex-col bg-white">
    <!-- Empty State -->
    <div 
      v-if="showEmpty" 
      class="flex-1 flex flex-col items-center justify-center p-8 text-center"
    >
      <div class="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
        <i class="pi pi-chart-bar text-4xl text-gray-400" aria-hidden="true" />
      </div>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">
        No Results Yet
      </h3>
      <p class="text-gray-500 max-w-md">
        Upload a document and run a test to see the extraction results here.
        The results will be displayed in a tabbed interface with JSON output,
        raw response, and OCR text (if applicable).
      </p>
      <div class="mt-6 flex items-center gap-2 text-sm text-gray-400">
        <i class="pi pi-arrow-left" aria-hidden="true" />
        <span>Configure and run a test from the left panel</span>
      </div>
    </div>

    <!-- Loading State -->
    <div 
      v-if="showLoading" 
      class="flex-1 flex items-center justify-center p-8"
    >
      <div class="w-full max-w-md">
        <LoadingIndicator
          :current-step="currentStep"
          :progress="progressPercent"
          :elapsed-time="elapsedTime"
          :can-cancel="canCancel"
          @cancel="handleCancel"
        />
      </div>
    </div>

    <!-- Results State -->
    <div 
      v-if="showResults" 
      class="flex-1 min-h-0 p-4"
    >
      <ResultsPanel :test-run="testStore.currentTestRun" />
    </div>
  </div>
</template>

<style scoped>
.results-wrapper {
  min-height: 0;
}
</style>
