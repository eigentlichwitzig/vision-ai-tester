<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import BaseButton from './BaseButton.vue'

interface Props {
  /** Current step message to display */
  currentStep: string
  /** Progress percentage 0-100 */
  progress: number
  /** Elapsed time in seconds */
  elapsedTime: number
  /** Whether cancel is enabled */
  canCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canCancel: true
})

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const formattedTime = computed(() => {
  const minutes = Math.floor(props.elapsedTime / 60)
  const seconds = props.elapsedTime % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const progressColor = computed(() => {
  if (props.progress >= 100) return 'green'
  return 'blue'
})

const isComplete = computed(() => props.progress >= 100)

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-4">
      <span class="text-xl">⏳</span>
      <h3 class="text-lg font-semibold text-gray-900">Running Test</h3>
    </div>

    <!-- Current Step -->
    <div class="flex items-center gap-3 mb-4">
      <i
        v-if="!isComplete"
        class="pi pi-spin pi-spinner text-primary-600"
        aria-hidden="true"
      />
      <i
        v-else
        class="pi pi-check-circle text-green-500"
        aria-hidden="true"
      />
      <span class="text-gray-700">{{ currentStep }}</span>
    </div>

    <!-- Progress Bar -->
    <div class="mb-4">
      <ProgressBar
        :progress="progress"
        :color="progressColor"
        :animated="!isComplete"
        height="md"
      />
      <div class="flex justify-end mt-1">
        <span class="text-sm text-gray-500">{{ Math.round(progress) }}%</span>
      </div>
    </div>

    <!-- Elapsed Time -->
    <div class="flex items-center gap-2 mb-4 text-sm text-gray-500">
      <i class="pi pi-clock" aria-hidden="true" />
      <span>Elapsed: {{ formattedTime }}</span>
    </div>

    <!-- Cancel Button -->
    <div v-if="!isComplete" class="flex justify-end">
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="!canCancel"
        @click="handleCancel"
      >
        Cancel
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
</style>
